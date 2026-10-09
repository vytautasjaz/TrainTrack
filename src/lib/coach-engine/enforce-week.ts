/**
 * Turn weekly validation into enforcement: repair until valid, or fail.
 */
import { SessionType, WorkoutType } from '@prisma/client'
import type {
  CapacityProfile,
  MethodologySelection,
  PlannedSession,
  PriorityProfile,
  ValidationError,
  WeeklyArchitecture,
} from '@/lib/coach-engine/types'
import {
  improvePlanScoreOnce,
  MAX_PLAN_SCORE_IMPROVE_PASSES,
  PLAN_SCORE_IMPROVE_TARGET,
  validateWeekComprehensive,
} from '@/lib/coach-engine/plan-score'
import { capacityCeilingForWeek } from '@/lib/coach-engine/capacity'
import { enforceWeekVolumeCap } from '@/lib/coach-engine/volume-guards'
import { isQualityHardSession } from '@/lib/coach-engine/safety'
import { modalityOfSession } from '@/lib/coach-engine/sport-architecture'
import {
  isLongRunSession,
  longRunMinMinutesForArchitecture,
} from '@/lib/coach-engine/validate'

const MAX_REPAIR_PASSES = 6

export class CoachEngineValidationError extends Error {
  readonly code = 'COACH_ENGINE_VALIDATION'
  readonly weekIndex: number | null
  readonly errors: ValidationError[]

  constructor(args: {
    message: string
    weekIndex?: number | null
    errors: ValidationError[]
  }) {
    super(args.message)
    this.name = 'CoachEngineValidationError'
    this.weekIndex = args.weekIndex ?? null
    this.errors = args.errors
  }
}

function demoteToEasy(session: PlannedSession, reason: string): PlannedSession {
  const duration = Math.min(session.plannedDuration ?? 40, 50)
  const distance =
    session.plannedDistance != null && session.plannedDistance > 0
      ? Math.min(session.plannedDistance, 10)
      : Math.round((duration / 5.75) * 10) / 10
  return {
    ...session,
    type: WorkoutType.RUN,
    sessionType: SessionType.EASY_RUN,
    title: 'Easy run',
    description: 'Aerobic easy run.',
    plannedDuration: duration,
    plannedDistance: distance,
    primaryAdaptation: 'aerobic_capacity',
    isKeySession: false,
    estimatedTss: Math.round((duration / 60) * 0.65 * 0.65 * 100),
    tags: [
      ...session.tags.filter(
        (t) =>
          !/threshold|tempo|vo2|hm-specific|mp-specific|race-pace|quality|key-session|norwegian|double-threshold|fartlek|hyrox|station|sled|wall.?ball|lunges?|strength|gym|lift|simulation|heavy/i.test(
            t,
          ),
      ),
      'easy',
      'validation-repair',
    ].slice(0, 8),
    coachNotes: [session.coachNotes, reason].filter(Boolean).join(' '),
  }
}

function isProtected(session: PlannedSession): boolean {
  return (
    session.tags.includes('race-day') ||
    session.sessionType === SessionType.LONG_RUN
  )
}

function isThresholdLikeSession(session: PlannedSession): boolean {
  // Keep in sync with validate.isThresholdLike — repair must see the same set.
  if (
    session.sessionType === SessionType.LONG_RUN ||
    session.sessionType === SessionType.EASY_RUN ||
    session.sessionType === SessionType.RECOVERY_RUN ||
    session.tags.includes('race-day')
  ) {
    return false
  }
  return (
    session.sessionType === SessionType.THRESHOLD ||
    session.sessionType === SessionType.TEMPO ||
    session.primaryAdaptation === 'threshold' ||
    session.tags.some((t) => /threshold|norwegian/i.test(t))
  )
}

function demoteExcessThreshold(sessions: PlannedSession[]): boolean {
  const thresholdIdx = sessions
    .map((s, i) => ({ s, i }))
    .filter(
      ({ s }) =>
        !isProtected(s) &&
        !s.tags.includes('race-day') &&
        isThresholdLikeSession(s),
    )
    .sort((a, b) => {
      // Keep key sessions; demote later non-keys first.
      if (a.s.isKeySession !== b.s.isKeySession) {
        return a.s.isKeySession ? 1 : -1
      }
      return b.s.dayOfWeek - a.s.dayOfWeek
    })

  const byDay = new Map<number, number[]>()
  for (const { s, i } of thresholdIdx) {
    const list = byDay.get(s.dayOfWeek) ?? []
    list.push(i)
    byDay.set(s.dayOfWeek, list)
  }
  if (byDay.size <= 2) return false

  const days = [...byDay.keys()].sort((a, b) => a - b)
  // Keep first two threshold days; demote sessions on later days.
  // Key sessions are not exempt — MAX_THRESHOLD is a hard weekly rule.
  let changed = false
  for (const day of days.slice(2)) {
    for (const i of byDay.get(day) ?? []) {
      sessions[i] = demoteToEasy(
        sessions[i]!,
        'Demoted excess threshold day to satisfy weekly validation.',
      )
      changed = true
    }
  }
  return changed
}

function demoteBackToBackHard(sessions: PlannedSession[]): boolean {
  const hard = sessions
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => isQualityHardSession(s))
    .sort((a, b) => a.s.dayOfWeek - b.s.dayOfWeek)

  let changed = false
  for (let i = 0; i < hard.length - 1; i += 1) {
    const a = hard[i]!
    const b = hard[i + 1]!
    if (b.s.dayOfWeek - a.s.dayOfWeek !== 1) continue
    // Prefer demoting the later non-protected session.
    const drop = !isProtected(b.s) && !b.s.isKeySession
      ? b
      : !isProtected(a.s) && !a.s.isKeySession
        ? a
        : !isProtected(b.s)
          ? b
          : !isProtected(a.s)
            ? a
            : null
    if (!drop) continue
    sessions[drop.i] = demoteToEasy(
      sessions[drop.i]!,
      'Demoted to break back-to-back hard days.',
    )
    changed = true
    break
  }
  return changed
}

/**
 * MAX_HARD can fire with non-adjacent hard days (e.g. Tue quality + Thu VO2 +
 * Sat fartlek). Back-to-back repair alone never fixes that — demote excess days.
 */
function demoteExcessHardDays(
  sessions: PlannedSession[],
  maxHardDays: number,
): boolean {
  const hard = sessions
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !isProtected(s) && isQualityHardSession(s))
    .sort((a, b) => {
      // Demote non-keys first, then later weekdays, then secondary stimuli.
      if (a.s.isKeySession !== b.s.isKeySession) {
        return a.s.isKeySession ? 1 : -1
      }
      const rank = (s: PlannedSession) => {
        if (s.sessionType === 'VO2_MAX' || /vo2/i.test(s.tags.join(' '))) return 0
        if (s.sessionType === 'FARTLEK' || /fartlek/i.test(s.tags.join(' ')))
          return 1
        if (s.sessionType === 'RACE_PACE') return 2
        if (s.sessionType === 'TEMPO') return 3
        return 4
      }
      const rd = rank(a.s) - rank(b.s)
      if (rd !== 0) return rd
      return b.s.dayOfWeek - a.s.dayOfWeek
    })

  const hardDays = new Set(hard.map(({ s }) => s.dayOfWeek))
  if (hardDays.size <= maxHardDays) return false

  // Keep the earliest key/threshold days; demote one session on an excess day.
  const keepDays = [...hardDays].sort((a, b) => a - b).slice(0, maxHardDays)
  const keep = new Set(keepDays)
  const victim = hard.find(({ s }) => !keep.has(s.dayOfWeek))
  if (!victim) return false
  sessions[victim.i] = demoteToEasy(
    sessions[victim.i]!,
    `Demoted excess hard day (max ${maxHardDays}/week).`,
  )
  return true
}

function demoteHardBeforeLong(
  sessions: PlannedSession[],
  architecture: WeeklyArchitecture,
): boolean {
  const longDay =
    sessions.find((s) => s.sessionType === 'LONG_RUN')?.dayOfWeek ??
    architecture.slots.find((s) => s.stimulus === 'long')?.dayOfWeek
  if (longDay == null) return false
  const dayBefore = longDay === 0 ? 6 : longDay - 1
  const idx = sessions.findIndex(
    (s) => s.dayOfWeek === dayBefore && isQualityHardSession(s),
  )
  if (idx < 0) return false
  sessions[idx] = demoteToEasy(
    sessions[idx]!,
    'Demoted hard session the day before the long run.',
  )
  return true
}

function dayGapCircular(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 7 - d)
}

function demoteInterference(sessions: PlannedSession[]): boolean {
  const sorted = [...sessions]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.dayOfWeek - b.s.dayOfWeek)

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i]!
      const b = sorted[j]!
      if (dayGapCircular(a.s.dayOfWeek, b.s.dayOfWeek) > 1) continue

      const ma = modalityOfSession(a.s)
      const mb = modalityOfSession(b.s)
      const aHardRun = ma === 'run' && isQualityHardSession(a.s)
      const bHardRun = mb === 'run' && isQualityHardSession(b.s)
      const aHyrox = ma === 'hyrox'
      const bHyrox = mb === 'hyrox'
      const aStrength = ma === 'strength'
      const bStrength = mb === 'strength'
      const aStation = aHyrox || aStrength
      const bStation = bHyrox || bStrength

      // HYROX sim ↔ heavy strength (same sport-architecture medium rule).
      if ((aHyrox && bStrength) || (aStrength && bHyrox)) {
        const strength = aStrength ? a : b
        const hyrox = aHyrox ? a : b
        const drop =
          !strength.s.isKeySession
            ? strength
            : !hyrox.s.isKeySession
              ? hyrox
              : strength
        sessions[drop.i] = demoteToEasy(
          sessions[drop.i]!,
          'Moved HYROX/strength off adjacent station days (validation repair).',
        )
        return true
      }

      if ((aHardRun && bStation) || (aStation && bHardRun)) {
        const station = aStation ? a : b
        const hardRun = aHardRun ? a : b
        const drop =
          !station.s.isKeySession
            ? station
            : !hardRun.s.isKeySession && !isProtected(hardRun.s)
              ? hardRun
              : station
        sessions[drop.i] = demoteToEasy(
          sessions[drop.i]!,
          modalityOfSession(drop.s) !== 'run'
            ? 'Moved strength away from hard-run adjacency (validation repair).'
            : 'Demoted hard run adjacent to strength (validation repair).',
        )
        return true
      }
    }
  }
  return false
}

function trainingDayCount(sessions: PlannedSession[]): number {
  return new Set(
    sessions
      .filter((s) => s.type !== 'REST' && !s.tags.includes('race-day'))
      .map((s) => s.dayOfWeek),
  ).size
}

function trimSessionCount(
  sessions: PlannedSession[],
  maxSessions: number,
): boolean {
  if (trainingDayCount(sessions) <= maxSessions) return false

  const active = sessions
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.type !== 'REST' && !isProtected(s))

  const droppable = active
    .filter(({ s }) => !s.isKeySession && !isQualityHardSession(s))
    .sort((a, b) => (a.s.plannedDuration ?? 0) - (b.s.plannedDuration ?? 0))
  const alsoQuality = active
    .filter(({ s }) => !s.isKeySession && isQualityHardSession(s))
    .sort((a, b) => b.s.dayOfWeek - a.s.dayOfWeek)

  const victims = [...droppable, ...alsoQuality]
  if (victims.length === 0) return false

  // Drop one session at a time until training-day count fits.
  const { i } = victims[0]!
  sessions.splice(i, 1)
  return true
}

function rescaleSessionLoad(
  session: PlannedSession,
  factor: number,
): PlannedSession {
  const f = Math.min(1, Math.max(0.55, factor))
  if (f >= 0.98) return session
  const duration =
    session.plannedDuration != null && session.plannedDuration > 0
      ? Math.max(20, Math.round(session.plannedDuration * f))
      : session.plannedDuration
  const distance =
    session.plannedDistance != null && session.plannedDistance > 0
      ? Math.max(2, Math.round(session.plannedDistance * f * 10) / 10)
      : session.plannedDistance
  return {
    ...session,
    plannedDuration: duration,
    plannedDistance: distance,
    estimatedTss: Math.max(8, Math.round(session.estimatedTss * f)),
  }
}

function shrinkVolumeAndTss(
  sessions: PlannedSession[],
  capacity: CapacityProfile,
  weekIndex?: number,
): boolean {
  const trainingOnly = () =>
    sessions.filter((s) => !s.tags.includes('race-day'))
  const sumKm = () =>
    trainingOnly().reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
  const sumTss = () =>
    trainingOnly().reduce((sum, s) => sum + s.estimatedTss, 0)
  const weekIdx =
    weekIndex ??
    sessions.find((s) => s.weekIndex != null)?.weekIndex ??
    0
  const ceiling = capacityCeilingForWeek(capacity, weekIdx)
  // Align with validateWeeklyPlan slack on envelope vs present caps.
  const kmCap =
    ceiling.kind === 'present'
      ? capacity.maxWeeklyKm * 1.15
      : ceiling.maxKm * 1.1
  const tssCap =
    ceiling.kind === 'present'
      ? capacity.maxWeeklyTss * 1.1
      : ceiling.maxTss * 1.08
  const weeklyKm = sumKm()
  const weeklyTss = sumTss()
  const needKmCut = weeklyKm > kmCap
  const needTssCut = weeklyTss > tssCap
  if (!needKmCut && !needTssCut) return false

  let changed = false

  const longMinMin = longRunMinMinutesForArchitecture(capacity.architectureId)

  if (needKmCut) {
    const long = sessions.find((s) => isLongRunSession(s))
    const capped = enforceWeekVolumeCap({
      sessions,
      targetKm: Math.max(18, kmCap),
      tolerance: 0.02,
      longRunFloorKm:
        long?.plannedDistance != null
          ? Math.min(long.plannedDistance * 0.92, kmCap * 0.55)
          : null,
      longRunFloorMin: longMinMin,
    })
    sessions.splice(0, sessions.length, ...capped)
    // Keep TSS in sync with distance/duration shrinks.
    const kmAfter = sumKm()
    if (kmAfter < weeklyKm && weeklyKm > 0) {
      const factor = kmAfter / weeklyKm
      for (let i = 0; i < sessions.length; i += 1) {
        if (sessions[i]!.tags.includes('race-day')) continue
        sessions[i] = rescaleSessionLoad(sessions[i]!, factor)
      }
    }
    changed = true
  }

  // Demote non-key quality until TSS fits (or nothing left to demote).
  for (let guard = 0; guard < 4 && sumTss() > tssCap; guard += 1) {
    const idx = [...sessions]
      .map((s, i) => ({ s, i }))
      .reverse()
      .find(
        ({ s }) =>
          isQualityHardSession(s) && !s.isKeySession && !isProtected(s),
      )
    if (!idx) break
    sessions[idx.i] = demoteToEasy(
      sessions[idx.i]!,
      'Demoted to bring weekly TSS under capacity.',
    )
    changed = true
  }

  // Force TSS under cap by scaling estimates (and soft-shrinking duration/km).
  // Never pull the long run under the architecture duration floor — that used
  // to create unrepairable LONG_RUN_MIN failures.
  let guard = 0
  while (sumTss() > tssCap && guard < 5) {
    guard += 1
    const factor = Math.min(0.92, (tssCap * 0.98) / Math.max(sumTss(), 1))
    for (let i = 0; i < sessions.length; i += 1) {
      if (sessions[i]!.tags.includes('race-day')) continue
      const s = sessions[i]!
      const isLong = isLongRunSession(s)
      const durFloor = isLong ? longMinMin : 15
      const distFloor = isLong ? Math.round((longMinMin / 6) * 10) / 10 : 1.5
      sessions[i] = {
        ...s,
        plannedDuration:
          s.plannedDuration != null && s.plannedDuration > 0
            ? Math.max(durFloor, Math.round(s.plannedDuration * factor))
            : s.plannedDuration,
        plannedDistance:
          s.plannedDistance != null && s.plannedDistance > 0
            ? Math.max(
                distFloor,
                Math.round(s.plannedDistance * factor * 10) / 10,
              )
            : s.plannedDistance,
        // Floor of 5 can prevent convergence — allow lower when still over.
        estimatedTss: Math.max(
          guard >= 3 ? 1 : 5,
          Math.round(s.estimatedTss * factor),
        ),
      }
    }
    changed = true
  }

  return changed
}

/**
 * Volume/TSS shrinks can pull the long under the architecture floor.
 * Bump duration (and distance proportionally) so LONG_RUN_MIN can clear.
 */
function bumpLongRunToMinimum(
  sessions: PlannedSession[],
  capacity: CapacityProfile,
  architecture: WeeklyArchitecture,
): boolean {
  if (architecture.phase.isTaper || architecture.phase.phase === 'RACE') {
    return false
  }
  const minMin = longRunMinMinutesForArchitecture(capacity.architectureId)
  const idx = sessions.findIndex((s) => isLongRunSession(s))
  if (idx < 0) return false
  const long = sessions[idx]!
  const dur = long.plannedDuration ?? 0
  if (dur <= 0 || dur >= minMin) return false

  const scale = minMin / dur
  const nextDistance =
    long.plannedDistance != null && long.plannedDistance > 0
      ? Math.round(long.plannedDistance * scale * 10) / 10
      : Math.round((minMin / 5.75) * 10) / 10
  const nextTss = Math.max(
    long.estimatedTss,
    Math.round((minMin / 60) * 0.7 * 0.7 * 100),
  )
  sessions[idx] = {
    ...long,
    plannedDuration: minMin,
    plannedDistance: nextDistance,
    estimatedTss: nextTss,
    tags: [
      ...long.tags.filter((t) => t !== 'long-run-floor'),
      'validation-repair',
      'long-run-floor',
    ].slice(0, 8),
    coachNotes: [
      long.coachNotes,
      `Extended to ${minMin}min minimum long-run floor.`,
    ]
      .filter(Boolean)
      .join(' '),
  }
  return true
}

function fixMetadataContradiction(sessions: PlannedSession[]): boolean {
  let changed = false
  for (let i = 0; i < sessions.length; i += 1) {
    const s = sessions[i]!
    const notes = s.coachNotes?.toLowerCase() ?? ''
    const title = s.title.toLowerCase()
    const structureHasMp = /marathon\s*pace|\bmp\b/.test(
      JSON.stringify(s.structure ?? {}).toLowerCase(),
    )
    if (
      (s.sessionType === 'LONG_RUN' || s.sessionType === 'EASY_RUN') &&
      /\beasy\b/.test(title) &&
      /marathon\s*pace/.test(notes) &&
      !structureHasMp
    ) {
      sessions[i] = {
        ...s,
        coachNotes: (s.coachNotes ?? '')
          .replace(/marathon\s*pace[^.]*\.?/gi, '')
          .trim() || 'Easy aerobic session.',
        tags: [...s.tags, 'metadata-repaired'].slice(0, 8),
      }
      changed = true
    }
  }
  return changed
}

function repairPass(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  architecture: WeeklyArchitecture
  priority: PriorityProfile
  methodology: MethodologySelection
  errors: ValidationError[]
  weekIndex?: number
}): boolean {
  const types = new Set(args.errors.map((e) => e.type))
  let changed = false

  if (types.has('MAX_THRESHOLD')) {
    changed = demoteExcessThreshold(args.sessions) || changed
  }
  if (types.has('PLAN_SCORE')) {
    changed =
      improvePlanScoreOnce({
        sessions: args.sessions,
        capacity: args.capacity,
        architecture: args.architecture,
        priority: args.priority,
        methodology: args.methodology,
        weekIndex: args.weekIndex,
      }) || changed
  }
  if (types.has('BACK_TO_BACK_HARD') || types.has('MAX_HARD')) {
    changed = demoteBackToBackHard(args.sessions) || changed
    if (types.has('MAX_HARD')) {
      changed =
        demoteExcessHardDays(
          args.sessions,
          args.capacity.maxHardSessionsPerWeek,
        ) || changed
    }
  }
  if (types.has('KEY_SESSION_PROTECTION')) {
    changed =
      demoteHardBeforeLong(args.sessions, args.architecture) || changed
  }
  if (types.has('INTERFERENCE')) {
    changed = demoteInterference(args.sessions) || changed
  }
  if (types.has('MAX_SESSIONS')) {
    changed =
      trimSessionCount(args.sessions, args.capacity.maxSessionsPerWeek) ||
      changed
  }
  if (types.has('WEEKLY_TSS') || types.has('WEEKLY_KM')) {
    changed =
      shrinkVolumeAndTss(args.sessions, args.capacity, args.weekIndex) ||
      changed
  }
  if (types.has('METADATA_CONTRADICTION')) {
    changed = fixMetadataContradiction(args.sessions) || changed
  }
  if (types.has('LONG_RUN_MIN')) {
    changed =
      bumpLongRunToMinimum(
        args.sessions,
        args.capacity,
        args.architecture,
      ) || changed
  }

  // Generic fallback: if nothing matched but still invalid, demote one hard.
  if (!changed && args.errors.length > 0) {
    changed =
      demoteBackToBackHard(args.sessions) ||
      demoteExcessHardDays(
        args.sessions,
        args.capacity.maxHardSessionsPerWeek,
      ) ||
      demoteExcessThreshold(args.sessions)
  }

  return changed
}

export type EnforceWeekResult =
  | {
      ok: true
      sessions: PlannedSession[]
      score: number
      repairsApplied: number
    }
  | {
      ok: false
      sessions: PlannedSession[]
      score: number
      errors: ValidationError[]
      repairsApplied: number
    }

/**
 * Repair a week until validateWeekComprehensive passes, or report failure.
 */
export function enforceWeekValidity(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  architecture: WeeklyArchitecture
  priority: PriorityProfile
  methodology: MethodologySelection
  weekIndex?: number
}): EnforceWeekResult {
  const sessions = args.sessions.map((s) => ({ ...s }))
  let repairsApplied = 0
  const weekIndex =
    args.weekIndex ??
    sessions.find((s) => s.weekIndex != null)?.weekIndex

  const hardErrors = (errors: ValidationError[] | undefined) =>
    // Plan score is advisory; structural / load caps are hard stops.
    (errors ?? []).filter((e) => e.type !== 'PLAN_SCORE')

  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass += 1) {
    const check = validateWeekComprehensive({
      sessions,
      capacity: args.capacity,
      architecture: args.architecture,
      priority: args.priority,
      methodology: args.methodology,
      weekIndex,
    })
    const blocking = hardErrors(check.valid ? [] : check.errors)
    if (blocking.length === 0) {
      break
    }

    const changed = repairPass({
      sessions,
      capacity: args.capacity,
      architecture: args.architecture,
      priority: args.priority,
      methodology: args.methodology,
      errors: blocking,
      weekIndex,
    })
    if (!changed) {
      return {
        ok: false,
        sessions,
        score: check.score ?? 0,
        errors: blocking,
        repairsApplied,
      }
    }
    repairsApplied += 1
  }

  const finalCheck = validateWeekComprehensive({
    sessions,
    capacity: args.capacity,
    architecture: args.architecture,
    priority: args.priority,
    methodology: args.methodology,
    weekIndex,
  })
  let finalBlocking = hardErrors(
    finalCheck.valid ? [] : finalCheck.errors,
  )

  // Last chance: long-run floor is a hard coaching rule but often appears only
  // after TSS/km shrink. Bump the long, then re-trim other sessions if needed.
  if (
    finalBlocking.length > 0 &&
    finalBlocking.every((e) => e.type === 'LONG_RUN_MIN')
  ) {
    if (
      bumpLongRunToMinimum(sessions, args.capacity, args.architecture)
    ) {
      repairsApplied += 1
      shrinkVolumeAndTss(sessions, args.capacity, weekIndex)
      bumpLongRunToMinimum(sessions, args.capacity, args.architecture)
      const rescued = validateWeekComprehensive({
        sessions,
        capacity: args.capacity,
        architecture: args.architecture,
        priority: args.priority,
        methodology: args.methodology,
        weekIndex,
      })
      finalBlocking = hardErrors(rescued.valid ? [] : rescued.errors)
      if (finalBlocking.length === 0) {
        return {
          ok: true,
          sessions,
          score: rescued.score ?? 0,
          repairsApplied,
        }
      }
    }
  }

  if (finalBlocking.length === 0) {
    for (let pass = 0; pass < MAX_PLAN_SCORE_IMPROVE_PASSES; pass += 1) {
      const scored = validateWeekComprehensive({
        sessions,
        capacity: args.capacity,
        architecture: args.architecture,
        priority: args.priority,
        methodology: args.methodology,
        weekIndex,
      })
      if ((scored.score ?? 0) >= PLAN_SCORE_IMPROVE_TARGET) break
      if (
        !improvePlanScoreOnce({
          sessions,
          capacity: args.capacity,
          architecture: args.architecture,
          priority: args.priority,
          methodology: args.methodology,
          weekIndex,
        })
      ) {
        break
      }
      repairsApplied += 1
      const hardOnly = validateWeekComprehensive({
        sessions,
        capacity: args.capacity,
        architecture: args.architecture,
        priority: args.priority,
        methodology: args.methodology,
        weekIndex,
      })
      const blocking = hardErrors(
        hardOnly.valid ? [] : hardOnly.errors,
      )
      if (blocking.length > 0) break
    }
    const finalScored = validateWeekComprehensive({
      sessions,
      capacity: args.capacity,
      architecture: args.architecture,
      priority: args.priority,
      methodology: args.methodology,
      weekIndex,
    })
    return {
      ok: true,
      sessions,
      score: finalScored.score ?? 0,
      repairsApplied,
    }
  }
  return {
    ok: false,
    sessions,
    score: finalCheck.score ?? 0,
    errors: finalBlocking,
    repairsApplied,
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.type}: ${e.message}`).join('; ')
}
