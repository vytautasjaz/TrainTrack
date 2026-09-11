import { SessionType, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { buildStructureChart } from '@/lib/workout-builder/structure-chart'

/** Athlete thresholds used for session load estimates. */
export type SessionLoadThresholds = {
  bikeFtpWatts?: number | null
  paceThresholdMinPerKm?: number | null
  swimCssSecPer100m?: number | null
  hrMax?: number | null
  hrResting?: number | null
  /** Closest LTHR proxy we store today. */
  hrZone4Max?: number | null
}

export type SessionLoadSource =
  | 'power'
  | 'pace'
  | 'hr'
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

function structureIntensityFactor(
  workout: Pick<PlanWorkoutDetail, 'structure' | 'plannedDuration'>,
): number | null {
  const chart = buildStructureChart(workout.structure, {
    durationMinutes: workout.plannedDuration ?? undefined,
  })
  if (!chart || chart.segments.length === 0) return null
  const totalWeight = chart.segments.reduce((sum, segment) => sum + segment.weight, 0)
  if (totalWeight <= 0) return null
  const weighted = chart.segments.reduce(
    (sum, segment) => sum + segment.intensity * segment.weight,
    0,
  )
  // Chart intensity is 0–1 profile height; treat as IF-like.
  return clamp(weighted / totalWeight, 0.4, 1.15)
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
  const hours =
    preferPlanned || !completed
      ? (plannedHours ?? actualHours)
      : (actualHours ?? plannedHours)
  if (hours == null) return null

  if (!preferPlanned && completed && result) {
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

  const fromStructure = structureIntensityFactor(workout)
  if (fromStructure != null) {
    return estimateFromIntensity(hours, fromStructure, 'structure')
  }

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
