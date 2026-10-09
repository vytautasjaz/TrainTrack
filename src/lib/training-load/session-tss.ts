import { SessionType, WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { parsePaceMinPerKm } from '@/lib/athlete-preferences'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  estimateTssFromHrZoneSeconds,
  parseHrZoneSeconds,
} from '@/lib/training-load/hr-zone-tss'
import {
  estimateBlockDurationMinutes,
  FALLBACK_PACES,
  intervalRepMinutes,
  segmentDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import { progressiveMidpointTarget } from '@/lib/workout-builder/progressive'
import type { Target, WorkoutBlock, WorkoutIncludeItem } from '@/lib/workout-builder/types'
import { hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'

export type SessionLoadSource =
  | 'power'
  | 'pace'
  | 'hr'
  | 'hr_zones'
  | 'rpe'
  | 'structure'
  | 'session'
  | 'duration'

export type SessionLoadEstimate = {
  /** Training Stress Score–equivalent points. */
  tss: number
  source: SessionLoadSource
  intensityFactor: number
}

/** Athlete thresholds used for session load estimates. */
export type SessionLoadThresholds = {
  bikeFtpWatts?: number | null
  paceThresholdMinPerKm?: number | null
  swimCssSecPer100m?: number | null
  hrMax?: number | null
  hrResting?: number | null
  /** Closest LTHR proxy we store today. */
  hrZone4Max?: number | null
  hrZone1Max?: number | null
  hrZone2Max?: number | null
  hrZone3Max?: number | null
}

export function sessionLoadThresholdsFromPreferences(
  prefs?: AthletePreferences | null,
): SessionLoadThresholds {
  if (!prefs) return {}
  return {
    bikeFtpWatts: prefs.bikeFtpWatts ?? null,
    paceThresholdMinPerKm: prefs.paceThresholdMinPerKm ?? null,
    swimCssSecPer100m: prefs.swimCssSecPer100m ?? null,
    hrMax: prefs.hrMax ?? null,
    hrResting: prefs.hrResting ?? null,
    hrZone1Max: prefs.hrZone1Max ?? null,
    hrZone2Max: prefs.hrZone2Max ?? null,
    hrZone3Max: prefs.hrZone3Max ?? null,
    hrZone4Max: prefs.hrZone4Max ?? null,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hoursFromMinutes(minutes: number | null | undefined): number | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null
  return minutes / 60
}

function tssFromHoursAndIf(hours: number, intensityFactor: number): number {
  const ifClamped = clamp(intensityFactor, 0.35, 1.25)
  return hours * ifClamped * ifClamped * 100
}

/** Default IF when we only know session type / sport. */
export function sessionTypeIntensityFactor(
  sessionType: SessionType,
  sport: WorkoutType,
): number {
  switch (sessionType) {
    case SessionType.RECOVERY_RUN:
      return 0.55
    case SessionType.EASY_RUN:
    case SessionType.LONG_RUN:
      return 0.65
    case SessionType.FARTLEK:
    case SessionType.CROSS_TRAINING:
      return 0.72
    case SessionType.TEMPO:
    case SessionType.BRICK:
      return 0.8
    case SessionType.THRESHOLD:
    case SessionType.RACE_PACE:
    case SessionType.HILL_REPEATS:
      return 0.88
    case SessionType.INTERVALS:
    case SessionType.VO2_MAX:
      return 0.95
    case SessionType.STRENGTH:
    case SessionType.HYROX:
      return 0.7
    case SessionType.CUSTOM:
    default:
      if (sport === WorkoutType.STRENGTH || sport === WorkoutType.HYROX) return 0.7
      if (sport === WorkoutType.RECOVERY) return 0.55
      if (sport === WorkoutType.SWIM) return 0.7
      return 0.68
  }
}

const ZONE_IF = [0.5, 0.65, 0.8, 0.9, 0.98, 1.1] as const

function intensityFactorFromKeywords(raw: string): number | null {
  const value = raw.toLowerCase().trim()
  if (!value) return null
  if (/\b(anaerobic|neuromuscular)\b/.test(value) || /\bz\s*6\b|zone\s*6/.test(value)) {
    return 1.1
  }
  if (/\b(vo\s*2|vo₂|v\.?o\.?\s*2|sprint|all[-\s]?out)\b/.test(value) || /\bz\s*5\b|zone\s*5/.test(value)) {
    return 0.98
  }
  if (/\b(threshold|critical|css|hard|race|5k|10k)\b/.test(value) || /\bz\s*4\b|zone\s*4/.test(value)) {
    return 0.9
  }
  if (/\b(tempo|sweet\s*spot|moderate|marathon)\b/.test(value) || /\bz\s*3\b|zone\s*3/.test(value)) {
    return 0.8
  }
  if (/\b(easy|endurance|aerobic)\b/.test(value) || /\bz\s*2\b|zone\s*2/.test(value)) {
    return 0.65
  }
  if (
    /\b(recovery|recover|jog|walk|stand|standing)\b/.test(value) ||
    /\bz\s*1\b|zone\s*1/.test(value)
  ) {
    return 0.5
  }
  return null
}

function intensityFactorFromTarget(
  target: Target | undefined,
  thresholds: SessionLoadThresholds,
): number | null {
  if (!target) return null
  const raw = (target.value ?? '').trim()
  const value = raw.toLowerCase()

  const zoneMatch = value.match(/^z\s*([1-6])$/) ?? value.match(/^zone\s*([1-6])$/)
  if (zoneMatch || target.type === 'heartRateZone') {
    const zone = parseInt((zoneMatch?.[1] ?? value.replace(/\D/g, '')).slice(0, 1), 10)
    if (zone >= 1 && zone <= 6) return ZONE_IF[zone - 1]!
  }

  const fromKeywords = intensityFactorFromKeywords(raw)
  if (fromKeywords != null) return fromKeywords

  if (target.type === 'rpe') {
    const rpe = parseFloat(value)
    if (!Number.isNaN(rpe) && rpe > 0) {
      return 0.45 + (clamp(rpe, 1, 10) / 10) * 0.55
    }
  }

  if (
    target.type === 'pace' ||
    /\/\s*km/i.test(raw) ||
    /^\d{1,2}:\d{1,2}/.test(raw)
  ) {
    const pace = parsePaceMinPerKm(raw)
    if (pace != null && pace > 0) {
      const threshold = thresholds.paceThresholdMinPerKm ?? FALLBACK_PACES.threshold
      return clamp(threshold / pace, 0.4, 1.25)
    }
  }

  if (target.type === 'power') {
    const watts = parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(watts) && watts > 0 && thresholds.bikeFtpWatts) {
      return clamp(watts / thresholds.bikeFtpWatts, 0.4, 1.25)
    }
  }

  if (target.type === 'powerZone') {
    const pct = parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(pct) && pct > 0) return clamp(pct / 100, 0.4, 1.25)
  }

  if (target.type === 'heartRate') {
    const hr = parseFloat(value.replace(/[^\d.]/g, ''))
    const lthr = resolveLthr(thresholds)
    if (!Number.isNaN(hr) && hr > 40 && lthr != null) {
      return clamp(hr / lthr, 0.4, 1.25)
    }
  }

  return null
}

function intensityFactorFromTargets(
  targets: Target[] | undefined,
  thresholds: SessionLoadThresholds,
): number | null {
  for (const target of targets ?? []) {
    const value = intensityFactorFromTarget(target, thresholds)
    if (value != null) return value
  }
  return null
}

function sectionDefaultIf(
  section: 'warmup' | 'mainSet' | 'cooldown',
  sessionType: SessionType,
  sport: WorkoutType,
): number {
  if (section === 'warmup' || section === 'cooldown') return 0.65
  return sessionTypeIntensityFactor(sessionType, sport)
}

type LoadAcc = { hours: number; tss: number }

function addLoad(acc: LoadAcc, minutes: number, intensityFactor: number) {
  if (!(minutes > 0)) return
  const hours = minutes / 60
  acc.hours += hours
  acc.tss += tssFromHoursAndIf(hours, intensityFactor)
}

function addBlockLoad(
  acc: LoadAcc,
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown',
  workout: Pick<PlanWorkoutDetail, 'type' | 'sessionType'>,
  thresholds: SessionLoadThresholds,
) {
  const name = (block.name ?? '').toLowerCase()
  const bookend =
    section === 'warmup' ||
    section === 'cooldown' ||
    name.includes('warm') ||
    name.includes('cool')
  const fallbackIf = bookend
    ? 0.65
    : block.type === 'RECOVERY' || block.type === 'REST'
      ? 0.5
      : sectionDefaultIf(section, workout.sessionType, workout.type)
  const workIf =
    intensityFactorFromTargets(
      block.targets?.[0] ? [block.targets[0]] : undefined,
      thresholds,
    ) ?? fallbackIf

  if (block.type === 'INTERVAL') {
    const reps = block.repetitions ?? 1
    const { work, recovery } = intervalRepMinutes(block, null, workout.type)
    const recoveryIf =
      intensityFactorFromTarget(block.targets?.[1], thresholds) ?? 0.55
    addLoad(acc, reps * work, workIf)
    addLoad(acc, Math.max(0, reps - 1) * recovery, recoveryIf)
    return
  }

  if (block.type === 'PROGRESSIVE') {
    const mid = progressiveMidpointTarget(block)
    const midIf =
      intensityFactorFromTargets(mid ? [mid] : block.targets, thresholds) ?? fallbackIf
    addLoad(acc, estimateBlockDurationMinutes(block, null, workout.type), midIf)
    return
  }

  addLoad(acc, estimateBlockDurationMinutes(block, null, workout.type), workIf)
}

function addIncludeLoad(acc: LoadAcc, item: WorkoutIncludeItem) {
  const workIf =
    item.kind === 'hill_sprint'
      ? 1.05
      : item.kind === 'drill'
        ? 0.7
        : 0.95
  const work = segmentDurationMinutes(item.work, FALLBACK_PACES.interval)
  const recovery = item.recovery
    ? segmentDurationMinutes(item.recovery, FALLBACK_PACES.recovery)
    : 0
  const reps = item.repetitions ?? 1
  addLoad(acc, reps * work, workIf)
  addLoad(acc, Math.max(0, reps - 1) * recovery, 0.55)
}

/**
 * Planned TSS from builder blocks: sum(hours × IF² × 100) per piece.
 * Chart profile height is visual only — easy ~0.36 there is IF ~0.65 here.
 */
function estimateLoadFromStructure(
  workout: Pick<
    PlanWorkoutDetail,
    'structure' | 'type' | 'sessionType' | 'plannedDuration'
  >,
  thresholds: SessionLoadThresholds = {},
): SessionLoadEstimate | null {
  if (!hasStructureContent(workout.structure)) return null
  const structure = workout.structure
  if (!structure) return null

  const acc: LoadAcc = { hours: 0, tss: 0 }
  for (const block of structure.warmup) {
    addBlockLoad(acc, block, 'warmup', workout, thresholds)
  }
  for (const block of structure.mainSet) {
    addBlockLoad(acc, block, 'mainSet', workout, thresholds)
  }
  for (const block of structure.cooldown) {
    addBlockLoad(acc, block, 'cooldown', workout, thresholds)
  }
  for (const item of structure.includeItems ?? []) {
    addIncludeLoad(acc, item)
  }

  if (acc.hours <= 0 || acc.tss <= 0) return null
  return {
    tss: acc.tss,
    source: 'structure',
    intensityFactor: clamp(Math.sqrt(acc.tss / (acc.hours * 100)), 0.4, 1.15),
  }
}

/**
 * Planned intensity factor (≈ IF, 0–1+) from structure when present, else session type.
 * Used by plan-canvas week stats (no athlete thresholds required).
 */
export function plannedSessionIntensityFactor(args: {
  type: WorkoutType
  sessionType: SessionType
  structure?: PlanWorkoutDetail['structure']
  plannedDuration?: number | null
}): number | null {
  if (args.type === WorkoutType.REST) return null
  const fromStructure = estimateLoadFromStructure({
    structure: args.structure ?? null,
    type: args.type,
    sessionType: args.sessionType,
    plannedDuration: args.plannedDuration ?? null,
  })
  if (fromStructure != null) return fromStructure.intensityFactor
  return sessionTypeIntensityFactor(args.sessionType, args.type)
}

/**
 * Planned TSS for a prescription session (plan canvas / coaches).
 * Prefers structure-derived load; falls back to duration × session-type IF.
 */
export function estimatePlannedSessionTss(args: {
  type: WorkoutType
  sessionType: SessionType | string
  structure?: PlanWorkoutDetail['structure'] | unknown | null
  plannedDuration?: number | null
  thresholds?: SessionLoadThresholds
}): number | null {
  if (args.type === WorkoutType.REST) return null
  const sessionType = args.sessionType as SessionType
  const structure =
    args.structure == null
      ? null
      : parseStructure(args.structure)
  const fromStructure = estimateLoadFromStructure(
    {
      structure,
      type: args.type,
      sessionType,
      plannedDuration: args.plannedDuration ?? null,
    },
    args.thresholds ?? {},
  )
  if (fromStructure != null && fromStructure.tss > 0) {
    return Math.round(fromStructure.tss)
  }
  const hours = hoursFromMinutes(args.plannedDuration)
  if (hours == null) return null
  return Math.round(
    tssFromHoursAndIf(hours, sessionTypeIntensityFactor(sessionType, args.type)),
  )
}

function paceMinPerKmFromResult(
  result: NonNullable<PlanWorkoutDetail['result']>,
): number | null {
  if (
    result.averageSpeedMps != null &&
    Number.isFinite(result.averageSpeedMps) &&
    result.averageSpeedMps > 0
  ) {
    // min/km = 1000 m / (m/s * 60)
    return 1000 / (result.averageSpeedMps * 60)
  }
  if (
    result.actualDistance != null &&
    result.actualDistance > 0 &&
    result.actualDuration != null &&
    result.actualDuration > 0
  ) {
    return result.actualDuration / result.actualDistance
  }
  return null
}

function resolveLthr(thresholds: SessionLoadThresholds): number | null {
  if (thresholds.hrZone4Max != null && thresholds.hrZone4Max > 0) {
    return thresholds.hrZone4Max
  }
  if (thresholds.hrMax != null && thresholds.hrMax > 0) {
    return thresholds.hrMax * 0.9
  }
  return null
}

function estimateFromPower(
  hours: number,
  watts: number,
  ftp: number,
): SessionLoadEstimate {
  const intensityFactor = watts / ftp
  return {
    tss: tssFromHoursAndIf(hours, intensityFactor),
    source: 'power',
    intensityFactor,
  }
}

function estimateFromPace(
  hours: number,
  actualPaceMinPerKm: number,
  thresholdPaceMinPerKm: number,
): SessionLoadEstimate {
  // Faster than threshold ⇒ IF > 1 (lower min/km is faster).
  const intensityFactor = thresholdPaceMinPerKm / actualPaceMinPerKm
  return {
    tss: tssFromHoursAndIf(hours, intensityFactor),
    source: 'pace',
    intensityFactor,
  }
}

function estimateFromHr(
  hours: number,
  averageHr: number,
  lthr: number,
): SessionLoadEstimate {
  const intensityFactor = averageHr / lthr
  return {
    tss: tssFromHoursAndIf(hours, intensityFactor),
    source: 'hr',
    intensityFactor,
  }
}

function estimateFromRpe(hours: number, rpe: number): SessionLoadEstimate {
  // Map 1–10 RPE onto a usable IF band.
  const intensityFactor = 0.45 + (clamp(rpe, 1, 10) / 10) * 0.55
  return {
    tss: tssFromHoursAndIf(hours, intensityFactor),
    source: 'rpe',
    intensityFactor,
  }
}

function estimateFromIntensity(
  hours: number,
  intensityFactor: number,
  source: Extract<SessionLoadSource, 'structure' | 'session' | 'duration'>,
): SessionLoadEstimate {
  return {
    tss: tssFromHoursAndIf(hours, intensityFactor),
    source,
    intensityFactor,
  }
}

/**
 * Approximate session TSS (or sport-equivalent load).
 * Prefer measured intensity (power → pace → HR → RPE), else planned structure / session type.
 */
export function estimateSessionLoad(
  workout: PlanWorkoutDetail,
  thresholds: SessionLoadThresholds = {},
  options?: { preferPlanned?: boolean },
): SessionLoadEstimate | null {
  if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) return null
  if (workout.status === 'SKIPPED') return null

  const preferPlanned = Boolean(options?.preferPlanned)
  const result = workout.result
  const completed = workout.status === 'COMPLETED'

  const actualHours = hoursFromMinutes(result?.actualDuration ?? null)
  const plannedHours = hoursFromMinutes(workout.plannedDuration)

  if (!preferPlanned && completed && result) {
    const hours = actualHours ?? plannedHours
    if (hours != null) {
      const watts =
        result.weightedAverageWatts ??
        result.averageWatts ??
        null
      if (
        (workout.type === WorkoutType.BIKE || workout.type === WorkoutType.TRIATHLON) &&
        watts != null &&
        watts > 0 &&
        thresholds.bikeFtpWatts != null &&
        thresholds.bikeFtpWatts > 0
      ) {
        return estimateFromPower(hours, watts, thresholds.bikeFtpWatts)
      }

      if (
        (workout.type === WorkoutType.RUN ||
          workout.type === WorkoutType.HYROX ||
          workout.type === WorkoutType.TRIATHLON) &&
        thresholds.paceThresholdMinPerKm != null &&
        thresholds.paceThresholdMinPerKm > 0
      ) {
        const pace = paceMinPerKmFromResult(result)
        if (pace != null && pace > 0) {
          return estimateFromPace(hours, pace, thresholds.paceThresholdMinPerKm)
        }
      }

      const zoneSeconds = parseHrZoneSeconds(result.hrZoneSeconds)
      if (zoneSeconds) {
        const fromZones = estimateTssFromHrZoneSeconds(zoneSeconds)
        return {
          tss: fromZones.tss,
          intensityFactor: fromZones.intensityFactor,
          source: 'hr_zones',
        }
      }

      if (
        result.averageHeartrate != null &&
        result.averageHeartrate > 0
      ) {
        const lthr = resolveLthr(thresholds)
        if (lthr != null) {
          return estimateFromHr(hours, result.averageHeartrate, lthr)
        }
      }

      if (result.rpe != null && result.rpe > 0) {
        return estimateFromRpe(hours, result.rpe)
      }
    }
  }

  const fromStructure = estimateLoadFromStructure(workout, thresholds)
  if (fromStructure) {
    if (!preferPlanned && completed && actualHours != null) {
      return estimateFromIntensity(
        actualHours,
        fromStructure.intensityFactor,
        'structure',
      )
    }
    return fromStructure
  }

  const hours =
    preferPlanned || !completed
      ? (plannedHours ?? actualHours)
      : (actualHours ?? plannedHours)
  if (hours == null) return null

  const fromSession = sessionTypeIntensityFactor(workout.sessionType, workout.type)
  return estimateFromIntensity(hours, fromSession, 'session')
}

/** Daily load points for Athlete Home training-load chart. */
export function daySessionLoad(
  workouts: PlanWorkoutDetail[],
  dateKey: string,
  todayKey: string,
  weekIsFullyFuture: boolean,
  thresholds: SessionLoadThresholds,
): number {
  let sum = 0
  for (const workout of workouts) {
    if (workout.dateKey !== dateKey) continue
    if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) continue
    if (workout.status === 'SKIPPED') continue

    const usePlanned =
      weekIsFullyFuture ||
      dateKey > todayKey ||
      (dateKey === todayKey && workout.status !== 'COMPLETED')

    const estimate = estimateSessionLoad(workout, thresholds, {
      preferPlanned: usePlanned,
    })
    if (estimate) sum += estimate.tss
  }
  return Math.max(0, Math.round(sum))
}

/** Planned session load for a day (prescription only — ignores completion). */
export function daySessionLoadPlanned(
  workouts: PlanWorkoutDetail[],
  dateKey: string,
  thresholds: SessionLoadThresholds,
): number {
  let sum = 0
  for (const workout of workouts) {
    if (workout.dateKey !== dateKey) continue
    if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) continue
    if (workout.status === 'SKIPPED') continue
    if (workout.selfLogged) continue
    const estimate = estimateSessionLoad(workout, thresholds, { preferPlanned: true })
    if (estimate) sum += estimate.tss
  }
  return Math.max(0, Math.round(sum))
}

/** Actual / completed session load for a day (0 when nothing completed). */
export function daySessionLoadActual(
  workouts: PlanWorkoutDetail[],
  dateKey: string,
  thresholds: SessionLoadThresholds,
): number {
  let sum = 0
  for (const workout of workouts) {
    if (workout.dateKey !== dateKey) continue
    if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) continue
    if (workout.status !== 'COMPLETED') continue
    const estimate = estimateSessionLoad(workout, thresholds, { preferPlanned: false })
    if (estimate) sum += estimate.tss
  }
  return Math.max(0, Math.round(sum))
}

/** Sum planned TSS for a set of workouts (week stats). */
export function weekSessionLoadPlanned(
  workouts: PlanWorkoutDetail[],
  thresholds: SessionLoadThresholds = {},
): number {
  let sum = 0
  for (const workout of workouts) {
    if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) continue
    if (workout.status === 'SKIPPED') continue
    if (workout.selfLogged) continue
    const estimate = estimateSessionLoad(workout, thresholds, {
      preferPlanned: true,
    })
    if (estimate) sum += estimate.tss
  }
  return Math.max(0, Math.round(sum))
}

/** Sum actual TSS for completed workouts in the set. */
export function weekSessionLoadActual(
  workouts: PlanWorkoutDetail[],
  thresholds: SessionLoadThresholds = {},
): number {
  let sum = 0
  for (const workout of workouts) {
    if (workout.type === WorkoutType.REST || workout.isRescheduleGhost) continue
    if (workout.status !== 'COMPLETED') continue
    const estimate = estimateSessionLoad(workout, thresholds, {
      preferPlanned: false,
    })
    if (estimate) sum += estimate.tss
  }
  return Math.max(0, Math.round(sum))
}
