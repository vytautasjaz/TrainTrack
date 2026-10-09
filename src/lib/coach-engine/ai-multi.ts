import { z } from 'zod'
import { SessionType, WorkoutType } from '@prisma/client'
import { generateStructuredObject } from '@/lib/ai/openai'
import type {
  AthleteState,
  CapacityProfile,
  GoalProfile,
  MethodologySelection,
  PlannedSession,
  PriorityProfile,
  WorkoutProposal,
} from '@/lib/coach-engine/types'
import {
  raceDayTargets,
  type WeekBlueprint,
} from '@/lib/coach-engine/blueprint'
import { isAiAvailable } from '@/lib/coach-engine/ai-adapt'
import { enforceWeekVolumeCap } from '@/lib/coach-engine/volume-guards'

const blueprintPatchSchema = z.object({
  week_patches: z
    .array(
      z.object({
        week_index: z.number().int().min(0).max(51),
        target_km: z.union([z.number().min(10).max(200), z.null()]),
        quality_sessions: z.union([z.number().int().min(0).max(2), z.null()]),
        long_run_min: z.union([z.number().int().min(20).max(200), z.null()]),
        prefer_race_specific: z.union([z.boolean(), z.null()]),
        note: z.string().max(200),
      }),
    )
    .max(20),
  rationale: z.string().min(1).max(800),
})

const weekMaterializeSchema = z.object({
  sessions: z
    .array(
      z.object({
        day_of_week: z.number().int().min(0).max(6),
        selected_workout: z.string().min(1).max(64),
        adaptations: z.object({
          interval_count: z.union([z.number().int().min(1).max(16), z.null()]),
          interval_duration_min: z.union([z.number().min(0.2).max(60), z.null()]),
          recovery_min: z.union([z.number().min(0).max(20), z.null()]),
          duration_min: z.union([z.number().int().min(0).max(240), z.null()]),
          distance_km: z.union([z.number().min(0).max(60), z.null()]),
        }),
        reason: z.string().min(1).max(300),
      }),
    )
    .max(8),
})

const criticSchema = z.object({
  issues: z
    .array(
      z.object({
        week_index: z.union([z.number().int().min(0).max(51), z.null()]),
        severity: z.enum(['blocker', 'warn', 'info']),
        code: z.string().min(1).max(64),
        message: z.string().min(1).max(400),
        suggested_fix: z.string().max(400),
      }),
    )
    .max(20),
  overall_score: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(600),
})

const explainSchema = z.object({
  why_this_plan: z.string().min(40).max(2000),
  key_decisions: z.array(z.string().min(1).max(200)).max(8),
})

export type BlueprintAiPatch = z.infer<typeof blueprintPatchSchema>
export type CriticAiResult = z.infer<typeof criticSchema>

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Call A — refine deterministic week blueprints (volume / quality / specificity). */
export async function refineBlueprintWithAi(args: {
  blueprints: WeekBlueprint[]
  goal: GoalProfile
  priority: PriorityProfile
  methodology: MethodologySelection
  athleteState: AthleteState
  skillSystemPrompt?: string | null
}): Promise<{
  blueprints: WeekBlueprint[]
  tokensIn: number
  tokensOut: number
  usedAi: boolean
  rationale: string | null
}> {
  if (!isAiAvailable()) {
    return {
      blueprints: args.blueprints,
      tokensIn: 0,
      tokensOut: 0,
      usedAi: false,
      rationale: null,
    }
  }

  const payload = {
    goal: {
      demand_id: args.goal.demandId,
      week_count: args.goal.weekCount,
      level: args.goal.level,
      days_per_week: args.goal.daysPerWeek,
      first_week_km: args.goal.firstWeekKm,
    },
    methodology: args.methodology.selectedModel,
    priority: args.priority.primary.adaptation,
    athlete: {
      level: args.athleteState.level,
      recent_km: args.athleteState.recentVolume.runningKmPerWeek,
      readiness: args.athleteState.readiness.score,
    },
    blueprints: args.blueprints.map((b) => ({
      week_index: b.weekIndex,
      phase: b.phase,
      label: b.label,
      target_km: b.targetKm,
      volume_scale: b.volumeScale,
      quality_sessions: b.qualitySessions,
      long_run_min: b.longRunMinMinutes,
      prefer_race_specific: b.preferRaceSpecific,
      is_deload: b.isDeload,
      is_taper: b.isTaper,
      is_race_week: b.isRaceWeek,
    })),
    rules: [
      'One phase per week — do not split phases mid-week.',
      'Recovery weeks must be ~70–80% of prior loading week km.',
      'Peak week before race keeps a long run (~18–20 km for HM).',
      'Race week is a true taper + race session.',
      'Late build/peak: second quality = race-specific, not second threshold.',
      'Only patch weeks that need coaching judgment; leave sensible weeks alone.',
    ],
  }

  const system = [
    'You are TrainTrack season architect. Refine weekly blueprints only.',
    'Return structured patches; hard physiology is enforced in code.',
    args.skillSystemPrompt?.trim()
      ? `Skill guidance:\n${args.skillSystemPrompt.trim().slice(0, 2500)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const { object, tokensIn, tokensOut } = await generateStructuredObject({
      system,
      prompt: JSON.stringify(payload, null, 2),
      schema: blueprintPatchSchema,
    })

    const next = args.blueprints.map((b) => ({ ...b }))
    for (const patch of object.week_patches) {
      const bp = next[patch.week_index]
      if (!bp) continue
      if (bp.isRaceWeek) {
        // Race week volume stays tapered; AI may only tweak quality note.
        if (patch.quality_sessions != null) {
          bp.qualitySessions = clamp(patch.quality_sessions, 0, 1)
        }
        continue
      }
      if (patch.target_km != null && !bp.isDeload) {
        const prev = next[patch.week_index - 1]?.targetKm ?? bp.targetKm
        // Reject wild jumps — keep AI inside ±10% of prior week.
        bp.targetKm = Math.round(clamp(patch.target_km, prev * 0.9, prev * 1.1) * 10) / 10
      }
      if (bp.isDeload && patch.target_km != null) {
        const prev = next[patch.week_index - 1]?.targetKm ?? bp.targetKm
        bp.targetKm = Math.round(clamp(patch.target_km, prev * 0.65, prev * 0.85) * 10) / 10
        bp.volumeScale = Math.round((bp.targetKm / Math.max(1, prev)) * 100) / 100
      }
      if (patch.quality_sessions != null) {
        bp.qualitySessions = clamp(patch.quality_sessions, 0, bp.isDeload ? 1 : 2)
      }
      if (patch.long_run_min != null && !bp.isRaceWeek) {
        bp.longRunMinMinutes = clamp(patch.long_run_min, 45, 180)
      }
      if (patch.prefer_race_specific != null) {
        bp.preferRaceSpecific = patch.prefer_race_specific
      }
    }

    return {
      blueprints: next,
      tokensIn: tokensIn ?? 0,
      tokensOut: tokensOut ?? 0,
      usedAi: true,
      rationale: object.rationale,
    }
  } catch {
    return {
      blueprints: args.blueprints,
      tokensIn: 0,
      tokensOut: 0,
      usedAi: false,
      rationale: null,
    }
  }
}

/** Call B — batch adapt quality/long slots for one week. */
export async function materializeWeekWithAi(args: {
  weekIndex: number
  blueprint: WeekBlueprint
  slots: {
    dayOfWeek: number
    stimulus: string
    candidateIds: string[]
    availableMinutes: number
  }[]
  goal: GoalProfile
  methodology: MethodologySelection
  skillSystemPrompt?: string | null
}): Promise<{
  proposals: Map<number, WorkoutProposal>
  tokensIn: number
  tokensOut: number
  usedAi: boolean
}> {
  const proposals = new Map<number, WorkoutProposal>()
  if (!isAiAvailable() || args.slots.length === 0) {
    return { proposals, tokensIn: 0, tokensOut: 0, usedAi: false }
  }

  const system = [
    'You are TrainTrack session materializer.',
    'Pick one candidate id per day from the allowed list and suggest safe adaptations.',
    'Do not invent workout ids. Prefer progression and race-specificity when the blueprint asks for it.',
    args.skillSystemPrompt?.trim()
      ? `Skill guidance:\n${args.skillSystemPrompt.trim().slice(0, 2000)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const payload = {
    week_index: args.weekIndex,
    blueprint: {
      phase: args.blueprint.phase,
      target_km: args.blueprint.targetKm,
      quality_sessions: args.blueprint.qualitySessions,
      prefer_race_specific: args.blueprint.preferRaceSpecific,
      long_run_min: args.blueprint.longRunMinMinutes,
      is_deload: args.blueprint.isDeload,
      is_race_week: args.blueprint.isRaceWeek,
    },
    methodology: args.methodology.selectedModel,
    demand_id: args.goal.demandId,
    slots: args.slots,
  }

  try {
    const { object, tokensIn, tokensOut } = await generateStructuredObject({
      system,
      prompt: JSON.stringify(payload, null, 2),
      schema: weekMaterializeSchema,
    })

    for (const row of object.sessions) {
      const slot = args.slots.find((s) => s.dayOfWeek === row.day_of_week)
      if (!slot) continue
      const allowed = new Set(slot.candidateIds)
      const id = allowed.has(row.selected_workout)
        ? row.selected_workout
        : slot.candidateIds[0]
      if (!id) continue
      proposals.set(row.day_of_week, {
        selectedWorkoutId: id,
        adaptations: {
          intervalCount: row.adaptations.interval_count,
          intervalDurationMin: row.adaptations.interval_duration_min,
          recoveryMin: row.adaptations.recovery_min,
          durationMin: row.adaptations.duration_min,
          distanceKm: row.adaptations.distance_km,
        },
        reason: row.reason,
      })
    }

    return {
      proposals,
      tokensIn: tokensIn ?? 0,
      tokensOut: tokensOut ?? 0,
      usedAi: true,
    }
  } catch {
    return { proposals, tokensIn: 0, tokensOut: 0, usedAi: false }
  }
}

/** Call C — critic for spikes, fake recovery, missing long/race. */
export async function critiquePlanWithAi(args: {
  sessions: PlannedSession[]
  blueprints: WeekBlueprint[]
  goal: GoalProfile
  capacity: CapacityProfile
  methodology: MethodologySelection
}): Promise<{
  result: CriticAiResult | null
  tokensIn: number
  tokensOut: number
  usedAi: boolean
}> {
  if (!isAiAvailable()) {
    return { result: null, tokensIn: 0, tokensOut: 0, usedAi: false }
  }

  const weekSummaries = args.blueprints.map((bp) => {
    const weekSessions = args.sessions.filter((s) => s.weekIndex === bp.weekIndex)
    const km = weekSessions.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    const min = weekSessions.reduce((sum, s) => sum + (s.plannedDuration ?? 0), 0)
    const threshold = weekSessions.filter(
      (s) =>
        s.sessionType === 'THRESHOLD' ||
        s.sessionType === 'TEMPO' ||
        s.tags.some((t) => /threshold/i.test(t)),
    ).length
    const raceSpecific = weekSessions.filter((s) =>
      s.tags.some((t) => /hm-specific|race-pace|race-day/i.test(t)),
    ).length
    const hasLong = weekSessions.some((s) => s.sessionType === 'LONG_RUN')
    const hasRace = weekSessions.some(
      (s) =>
        s.tags.includes('race-day') ||
        (s.sessionType === 'RACE_PACE' && /race day/i.test(s.title)),
    )
    return {
      week_index: bp.weekIndex,
      phase: bp.phase,
      label: bp.label,
      target_km: bp.targetKm,
      actual_km: Math.round(km * 10) / 10,
      actual_min: min,
      threshold_sessions: threshold,
      race_specific_sessions: raceSpecific,
      has_long: hasLong,
      has_race: hasRace,
      is_deload: bp.isDeload,
      is_race_week: bp.isRaceWeek,
    }
  })

  try {
    const { object, tokensIn, tokensOut } = await generateStructuredObject({
      system: [
        'You are TrainTrack plan critic. Flag only real coaching bugs.',
        'Use stable issue codes when possible:',
        'DELOAD_VOLUME_HIGH, EXCESS_THRESHOLD, MISSING_PEAK_LONG, RACE_WEEK_NO_RACE, MIDWEEK_PHASE_SPLIT.',
        'Blockers: recovery week ≈ full volume, missing peak long, race week without race, >2 threshold/week.',
        'Do not rewrite the plan — only diagnose with code + suggested_fix.',
      ].join(' '),
      prompt: JSON.stringify(
        {
          demand_id: args.goal.demandId,
          methodology: args.methodology.selectedModel,
          capacity_km: args.capacity.maxWeeklyKm,
          weeks: weekSummaries,
        },
        null,
        2,
      ),
      schema: criticSchema,
    })
    return {
      result: object,
      tokensIn: tokensIn ?? 0,
      tokensOut: tokensOut ?? 0,
      usedAi: true,
    }
  } catch {
    return { result: null, tokensIn: 0, tokensOut: 0, usedAi: false }
  }
}

/** Call D — athlete-facing explanation that must not invent numbers. */
export async function explainPlanWithAi(args: {
  blueprints: WeekBlueprint[]
  methodology: MethodologySelection
  priority: PriorityProfile
  planScore: number
  criticSummary?: string | null
  skillGuidance?: string | null
}): Promise<{
  text: string | null
  tokensIn: number
  tokensOut: number
  usedAi: boolean
}> {
  if (!isAiAvailable()) {
    return { text: null, tokensIn: 0, tokensOut: 0, usedAi: false }
  }

  try {
    const { object, tokensIn, tokensOut } = await generateStructuredObject({
      system:
        'Write a concise Why-this-plan explanation for the athlete/coach. Do not invent weekly km numbers that are not in the blueprint summary.',
      prompt: JSON.stringify(
        {
          methodology: args.methodology.selectedModel,
          focus: args.priority.primary.adaptation,
          plan_score: args.planScore,
          critic_summary: args.criticSummary ?? null,
          skill_guidance: args.skillGuidance ?? null,
          weeks: args.blueprints.map((b) => ({
            week: b.weekIndex + 1,
            phase: b.label,
            target_km: b.targetKm,
            quality: b.qualitySessions,
            race_specific: b.preferRaceSpecific,
            deload: b.isDeload,
            race_week: b.isRaceWeek,
          })),
        },
        null,
        2,
      ),
      schema: explainSchema,
    })
    const text = [
      '## Why this plan',
      object.why_this_plan.trim(),
      object.key_decisions.length
        ? `Key decisions:\n${object.key_decisions.map((d) => `- ${d}`).join('\n')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n')
    return {
      text,
      tokensIn: tokensIn ?? 0,
      tokensOut: tokensOut ?? 0,
      usedAi: true,
    }
  } catch {
    return { text: null, tokensIn: 0, tokensOut: 0, usedAi: false }
  }
}

/** Normalized critic issue codes we can repair deterministically. */
export const CRITIC_REPAIRABLE_CODES = [
  'DELOAD_VOLUME_HIGH',
  'EXCESS_THRESHOLD',
  'MISSING_PEAK_LONG',
  'RACE_WEEK_NO_RACE',
] as const

export type CriticRepairableCode = (typeof CRITIC_REPAIRABLE_CODES)[number]

export type CriticRepairResult = {
  sessions: PlannedSession[]
  /** Codes that were applied to the plan. */
  repairsApplied: CriticRepairableCode[]
  /** Blocker/warn codes left as advisory only. */
  advisoryIssues: CriticAiResult['issues']
  changed: boolean
}

function normalizeCriticCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Map free-form / alias critic codes onto repairable constants. */
export function resolveCriticRepairCode(
  code: string,
): CriticRepairableCode | null {
  const c = normalizeCriticCode(code)
  if (
    c === 'DELOAD_VOLUME_HIGH' ||
    c === 'RECOVERY_VOLUME_HIGH' ||
    c === 'RECOVERY_WEEK_FULL_VOLUME' ||
    c === 'DELOAD_TOO_HIGH'
  ) {
    return 'DELOAD_VOLUME_HIGH'
  }
  if (
    c === 'EXCESS_THRESHOLD' ||
    c === 'TOO_MANY_THRESHOLD' ||
    c === 'THRESHOLD_OVERFLOW' ||
    c === 'MAX_THRESHOLD'
  ) {
    return 'EXCESS_THRESHOLD'
  }
  if (
    c === 'MISSING_PEAK_LONG' ||
    c === 'NO_PEAK_LONG' ||
    c === 'PEAK_LONG_MISSING'
  ) {
    return 'MISSING_PEAK_LONG'
  }
  if (
    c === 'RACE_WEEK_NO_RACE' ||
    c === 'MISSING_RACE_DAY' ||
    c === 'NO_RACE_SESSION'
  ) {
    return 'RACE_WEEK_NO_RACE'
  }
  return null
}

function demoteSessionToEasy(
  session: PlannedSession,
  reason: string,
): PlannedSession {
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
    estimatedTss: Math.max(8, Math.round((duration / 60) * 0.65 * 0.65 * 100)),
    tags: [
      ...session.tags.filter(
        (t) =>
          !/threshold|tempo|vo2|hm-specific|mp-specific|race-pace|quality|key-session|norwegian|double-threshold|fartlek/i.test(
            t,
          ),
      ),
      'easy',
      'critic-repair',
    ].slice(0, 8),
    coachNotes: [session.coachNotes, reason].filter(Boolean).join(' '),
  }
}

function isThresholdLike(session: PlannedSession): boolean {
  if (
    session.tags.includes('race-day') ||
    session.sessionType === SessionType.LONG_RUN ||
    session.sessionType === SessionType.EASY_RUN ||
    session.sessionType === SessionType.RECOVERY_RUN
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

function repairExcessThreshold(
  sessions: PlannedSession[],
  weekIndex: number | null,
): boolean {
  const weeks = new Set(
    weekIndex != null
      ? [weekIndex]
      : sessions.map((s) => s.weekIndex),
  )
  let changed = false
  for (const w of weeks) {
    const idxs = sessions
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.weekIndex === w && isThresholdLike(s))
      .sort((a, b) => {
        if (a.s.isKeySession !== b.s.isKeySession) {
          return a.s.isKeySession ? 1 : -1
        }
        return b.s.dayOfWeek - a.s.dayOfWeek
      })
    const byDay = new Map<number, number[]>()
    for (const { s, i } of idxs) {
      const list = byDay.get(s.dayOfWeek) ?? []
      list.push(i)
      byDay.set(s.dayOfWeek, list)
    }
    if (byDay.size <= 2) continue
    const days = [...byDay.keys()].sort((a, b) => a - b)
    for (const day of days.slice(2)) {
      for (const i of byDay.get(day) ?? []) {
        sessions[i] = demoteSessionToEasy(
          sessions[i]!,
          'Critic repair: demoted excess threshold day.',
        )
        changed = true
      }
    }
  }
  return changed
}

function repairDeloadVolume(
  sessions: PlannedSession[],
  blueprints: WeekBlueprint[],
  weekIndex: number | null,
): boolean {
  const targets = blueprints.filter(
    (bp) =>
      bp.isDeload &&
      (weekIndex == null || bp.weekIndex === weekIndex),
  )
  if (!targets.length) return false
  let changed = false
  for (const bp of targets) {
    const before = sessions.filter((s) => s.weekIndex === bp.weekIndex)
    if (!before.length) continue
    const km = before
      .filter((s) => !s.tags.includes('race-day'))
      .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    if (km <= bp.targetKm * 1.08) continue
    const capped = enforceWeekVolumeCap({
      sessions: before.map((s) => ({ ...s })),
      targetKm: bp.targetKm,
      tolerance: 0.05,
      longRunFloorKm:
        bp.longRunTargetKm > 0
          ? Math.min(bp.longRunTargetKm * 0.95, bp.targetKm * 0.55)
          : null,
    })
    // Also demote non-key threshold on deload weeks.
    for (let i = 0; i < capped.length; i += 1) {
      const s = capped[i]!
      if (isThresholdLike(s) && !s.isKeySession) {
        capped[i] = demoteSessionToEasy(
          s,
          'Critic repair: demoted quality on overloaded deload week.',
        )
      }
    }
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]!.weekIndex === bp.weekIndex) sessions.splice(i, 1)
    }
    sessions.push(...capped)
    changed = true
  }
  if (changed) {
    sessions.sort(
      (a, b) => a.weekIndex - b.weekIndex || a.dayOfWeek - b.dayOfWeek,
    )
  }
  return changed
}

function repairMissingPeakLong(
  sessions: PlannedSession[],
  blueprints: WeekBlueprint[],
  weekIndex: number | null,
): boolean {
  const peakWeeks = blueprints.filter((bp) => {
    if (bp.isRaceWeek || bp.isDeload || bp.isTaper) return false
    if (weekIndex != null) return bp.weekIndex === weekIndex
    // Prefer the last loading week with a long target (typical peak).
    return (
      bp.longRunTargetKm >= 28 &&
      (bp.label.toLowerCase().includes('peak') ||
        bp.label.toLowerCase().includes('specific') ||
        bp.preferRaceSpecific)
    )
  })
  // Fallback: highest longRunTargetKm among loading weeks.
  const candidates =
    peakWeeks.length > 0
      ? peakWeeks
      : blueprints
          .filter((bp) => !bp.isRaceWeek && bp.longRunTargetKm > 0)
          .sort((a, b) => b.longRunTargetKm - a.longRunTargetKm)
          .slice(0, 1)

  let changed = false
  for (const bp of candidates.length ? [candidates[0]!] : []) {
    if (weekIndex != null && bp.weekIndex !== weekIndex) continue
    const week = sessions.filter((s) => s.weekIndex === bp.weekIndex)
    const hasLong = week.some((s) => s.sessionType === SessionType.LONG_RUN)
    const targetKm = Math.max(12, bp.longRunTargetKm)
    const targetMin = Math.max(45, bp.longRunMinMinutes)
    if (hasLong) {
      const longIdx = sessions.findIndex(
        (s) =>
          s.weekIndex === bp.weekIndex &&
          s.sessionType === SessionType.LONG_RUN,
      )
      if (longIdx < 0) continue
      const long = sessions[longIdx]!
      if ((long.plannedDistance ?? 0) >= targetKm * 0.9) continue
      sessions[longIdx] = {
        ...long,
        plannedDistance: targetKm,
        plannedDuration: Math.max(long.plannedDuration ?? 0, targetMin),
        estimatedTss: Math.max(
          long.estimatedTss,
          Math.round(targetMin * 0.85),
        ),
        tags: [...new Set([...long.tags, 'critic-repair'])].slice(0, 8),
        coachNotes: [long.coachNotes, 'Critic repair: restored peak long distance.']
          .filter(Boolean)
          .join(' '),
      }
      changed = true
      continue
    }
    // Promote the longest non-race session into a long run.
    const promote = [...week]
      .filter((s) => !s.tags.includes('race-day'))
      .sort(
        (a, b) =>
          (b.plannedDistance ?? 0) - (a.plannedDistance ?? 0) ||
          (b.plannedDuration ?? 0) - (a.plannedDuration ?? 0),
      )[0]
    if (!promote) continue
    const idx = sessions.findIndex(
      (s) =>
        s.weekIndex === promote.weekIndex &&
        s.dayOfWeek === promote.dayOfWeek &&
        s.candidateId === promote.candidateId,
    )
    if (idx < 0) continue
    sessions[idx] = {
      ...promote,
      sessionType: SessionType.LONG_RUN,
      title: 'Long run',
      description: 'Aerobic long run (critic repair: missing peak long).',
      plannedDistance: targetKm,
      plannedDuration: targetMin,
      primaryAdaptation: 'long_run_tolerance',
      isKeySession: true,
      estimatedTss: Math.round(targetMin * 0.85),
      tags: ['long-run', 'critic-repair'],
      coachNotes: [
        promote.coachNotes,
        'Critic repair: converted session into peak long run.',
      ]
        .filter(Boolean)
        .join(' '),
    }
    changed = true
  }
  return changed
}

function repairRaceWeekNoRace(
  sessions: PlannedSession[],
  blueprints: WeekBlueprint[],
  goal: GoalProfile | null | undefined,
  weekIndex: number | null,
): boolean {
  if (!goal) return false
  const raceWeeks = blueprints.filter(
    (bp) =>
      bp.isRaceWeek &&
      (weekIndex == null || bp.weekIndex === weekIndex),
  )
  if (!raceWeeks.length) return false
  const race = raceDayTargets(goal)
  const raceDow =
    goal.raceWeekday != null
      ? ((goal.raceWeekday % 7) + 7) % 7
      : 6
  let changed = false
  for (const bp of raceWeeks) {
    const hasRace = sessions.some(
      (s) => s.weekIndex === bp.weekIndex && s.tags.includes('race-day'),
    )
    if (hasRace) continue
    // Remove conflicting sessions on race day, then insert race.
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      const s = sessions[i]!
      if (s.weekIndex !== bp.weekIndex) continue
      if (s.dayOfWeek === raceDow || s.dayOfWeek > raceDow) {
        sessions.splice(i, 1)
      }
    }
    sessions.push({
      weekIndex: bp.weekIndex,
      dayOfWeek: raceDow,
      type: race.sport,
      sessionType: race.sessionType,
      title: race.title,
      description: `${race.distanceKm} km race`,
      plannedDistance: race.distanceKm,
      plannedDuration: race.durationMin,
      coachNotes: 'Critic repair: inserted missing race-day session.',
      tags: ['race-day', 'key-session', 'race-pace', 'critic-repair'],
      candidateId: 'RUN_RACE_DAY_01',
      primaryAdaptation: 'threshold',
      estimatedTss: Math.round(race.durationMin * 1.1),
      isKeySession: true,
      structure: null,
      swimStructure: null,
    })
    changed = true
  }
  if (changed) {
    sessions.sort(
      (a, b) => a.weekIndex - b.weekIndex || a.dayOfWeek - b.dayOfWeek,
    )
  }
  return changed
}

/**
 * Map known critic blocker codes to deterministic repairs.
 * Unknown / unrepairable codes stay advisory (returned in advisoryIssues).
 * Does NOT invent free-form AI edits — only coded structural fixes.
 */
export function applyCriticSafeRepairs(args: {
  sessions: PlannedSession[]
  blueprints: WeekBlueprint[]
  critic: CriticAiResult | null
  goal?: GoalProfile | null
}): CriticRepairResult {
  const sessions = args.sessions.map((s) => ({ ...s }))
  if (!args.critic?.issues.length) {
    return {
      sessions,
      repairsApplied: [],
      advisoryIssues: [],
      changed: false,
    }
  }

  const repairsApplied: CriticRepairableCode[] = []
  const advisoryIssues: CriticAiResult['issues'] = []
  const seen = new Set<CriticRepairableCode>()

  for (const issue of args.critic.issues) {
    const code = resolveCriticRepairCode(issue.code)
    if (!code) {
      advisoryIssues.push(issue)
      continue
    }
    // Prefer repairing blockers; still repair warns for the same known codes.
    if (seen.has(code)) continue
    let applied = false
    if (code === 'EXCESS_THRESHOLD') {
      applied = repairExcessThreshold(sessions, issue.week_index)
    } else if (code === 'DELOAD_VOLUME_HIGH') {
      applied = repairDeloadVolume(
        sessions,
        args.blueprints,
        issue.week_index,
      )
    } else if (code === 'MISSING_PEAK_LONG') {
      applied = repairMissingPeakLong(
        sessions,
        args.blueprints,
        issue.week_index,
      )
    } else if (code === 'RACE_WEEK_NO_RACE') {
      applied = repairRaceWeekNoRace(
        sessions,
        args.blueprints,
        args.goal,
        issue.week_index,
      )
    }
    if (applied) {
      seen.add(code)
      repairsApplied.push(code)
    } else {
      advisoryIssues.push(issue)
    }
  }

  return {
    sessions,
    repairsApplied,
    advisoryIssues,
    changed: repairsApplied.length > 0,
  }
}
