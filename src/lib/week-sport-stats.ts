import { WorkoutStatus, WorkoutType } from '@prisma/client'
import {
  sumSportWeekTotals,
  type SportWeekTotals,
} from '@/lib/plan-week-totals'
import { SPORT_ROW_ORDER } from '@/lib/constants'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  sportSessionLoadActual,
  sportSessionLoadPlanned,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'

export const DEFAULT_WEEK_STATS_SPORTS: WorkoutType[] = SPORT_ROW_ORDER.filter(
  (s) =>
    s !== WorkoutType.REST &&
    s !== WorkoutType.RECOVERY &&
    s !== WorkoutType.TRIATHLON &&
    s !== WorkoutType.HYROX,
)

export const WEEK_STATS_SPORT_ICON_COLOR: Record<WorkoutType, string> = {
  [WorkoutType.RUN]: 'text-[var(--color-sport-run)]',
  [WorkoutType.BIKE]: 'text-[var(--color-sport-bike)]',
  [WorkoutType.SWIM]: 'text-[var(--color-sport-swim)]',
  [WorkoutType.STRENGTH]: 'text-[var(--color-sport-strength)]',
  [WorkoutType.HYROX]: 'text-[var(--color-sport-hyrox)]',
  [WorkoutType.TRIATHLON]: 'text-[var(--color-sport-tri)]',
  [WorkoutType.RECOVERY]: 'text-[var(--color-sport-recovery)]',
  [WorkoutType.REST]: 'text-[var(--color-sport-rest)]',
}

/**
 * Shared Week overview mode — drives sport progress rows and the load chart.
 * Distance = km/m (default). Time = duration. TSS = session load.
 */
export type WeekSportStatMode = 'distance' | 'time' | 'tss'

export type WeekSportMetric = {
  actual: number
  planned: number
  actualLabel: string
  plannedLabel: string
  unit: string
  kind: 'distance' | 'time' | 'count' | 'tss'
  /**
   * Active mode has no native data for this sport (e.g. Distance on Strength).
   * UI still shows a fallback (usually time) but the row looks disabled.
   */
  unavailableForMode?: boolean
}

/** Sports measured in km/m — others only have time (or session count). */
export function sportSupportsDistance(sport: WorkoutType): boolean {
  return (
    sport === WorkoutType.RUN ||
    sport === WorkoutType.BIKE ||
    sport === WorkoutType.SWIM ||
    sport === WorkoutType.HYROX ||
    sport === WorkoutType.TRIATHLON
  )
}

function formatKmValue(km: number): string {
  if (km <= 0) return '0'
  return km % 1 === 0 ? String(km) : km.toFixed(1)
}

function formatMetersValue(meters: number): string {
  return Math.round(Math.max(0, meters)).toLocaleString('en-US')
}

/** Readable duration for sport rows (e.g. 45m, 1h 20m, 2h). */
export function formatWeekSportTime(min: number): string {
  if (min <= 0) return '0m'
  const total = Math.round(min)
  if (total < 60) return `${total}m`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function strengthCountMetric(workouts: PlanWorkoutDetail[]): WeekSportMetric {
  const sportWorkouts = workouts.filter(
    (w) => w.type === WorkoutType.STRENGTH && !w.isRace,
  )
  const planned = sportWorkouts.filter((w) => !w.selfLogged).length
  const actual = sportWorkouts.filter(
    (w) => w.status === WorkoutStatus.COMPLETED,
  ).length
  return {
    actual,
    planned,
    actualLabel: String(actual),
    plannedLabel: String(planned),
    unit: planned === 1 ? 'workout' : 'workouts',
    kind: 'count',
  }
}

function timeMetric(
  sport: WorkoutType,
  totals: SportWeekTotals,
  workouts: PlanWorkoutDetail[],
): WeekSportMetric {
  if (totals.durationMin > 0 || totals.actualDurationMin > 0) {
    return {
      actual: totals.actualDurationMin,
      planned: totals.durationMin,
      actualLabel: formatWeekSportTime(totals.actualDurationMin),
      plannedLabel: formatWeekSportTime(totals.durationMin),
      unit: '',
      kind: 'time',
    }
  }
  if (sport === WorkoutType.STRENGTH) {
    return strengthCountMetric(workouts)
  }
  return {
    actual: 0,
    planned: 0,
    actualLabel: formatWeekSportTime(0),
    plannedLabel: formatWeekSportTime(0),
    unit: '',
    kind: 'time',
  }
}

function distanceMetric(
  sport: WorkoutType,
  totals: SportWeekTotals,
  workouts: PlanWorkoutDetail[],
): WeekSportMetric {
  if (sport === WorkoutType.SWIM) {
    return {
      actual: totals.actualDistanceMeters,
      planned: totals.distanceMeters,
      actualLabel: formatMetersValue(totals.actualDistanceMeters),
      plannedLabel: formatMetersValue(totals.distanceMeters),
      unit: 'm',
      kind: 'distance',
    }
  }

  if (
    sport === WorkoutType.RUN ||
    sport === WorkoutType.BIKE ||
    sport === WorkoutType.HYROX ||
    sport === WorkoutType.TRIATHLON
  ) {
    return {
      actual: totals.actualDistanceKm,
      planned: totals.distanceKm,
      actualLabel: formatKmValue(totals.actualDistanceKm),
      plannedLabel: formatKmValue(totals.distanceKm),
      unit: 'km',
      kind: 'distance',
    }
  }

  // Strength / recovery — no distance; fall back to time, marked unavailable.
  return {
    ...timeMetric(sport, totals, workouts),
    unavailableForMode: true,
  }
}

function tssMetric(
  sport: WorkoutType,
  workouts: PlanWorkoutDetail[],
  thresholds: SessionLoadThresholds = {},
): WeekSportMetric {
  const planned = sportSessionLoadPlanned(workouts, sport, thresholds)
  const actual = sportSessionLoadActual(workouts, sport, thresholds)
  return {
    actual,
    planned,
    actualLabel: String(actual),
    plannedLabel: String(planned),
    unit: 'TSS',
    kind: 'tss',
  }
}

/**
 * Sport row metric for Week overview.
 * - `distance` (default): km/m for distance sports; time fallback (disabled look) for the rest.
 * - `time`: duration for every sport.
 * - `tss`: session load for every sport.
 */
export function weekSportMetric(
  sport: WorkoutType,
  totals: SportWeekTotals,
  workouts: PlanWorkoutDetail[],
  mode: WeekSportStatMode = 'distance',
  thresholds: SessionLoadThresholds = {},
): WeekSportMetric {
  if (mode === 'time') {
    return timeMetric(sport, totals, workouts)
  }
  if (mode === 'tss') {
    return tssMetric(sport, workouts, thresholds)
  }
  return distanceMetric(sport, totals, workouts)
}

export function weekSportProgressPercent(actual: number, planned: number): number {
  if (planned <= 0) return actual > 0 ? 100 : 0
  return Math.min(100, Math.round((actual / planned) * 100))
}

export function countWeekWorkouts(workouts: PlanWorkoutDetail[]): {
  planned: number
  completed: number
} {
  const countable = workouts.filter(
    (w) => w.type !== WorkoutType.REST && w.type !== WorkoutType.RECOVERY,
  )
  return {
    planned: countable.filter((w) => !w.selfLogged).length,
    completed: countable.filter((w) => w.status === WorkoutStatus.COMPLETED)
      .length,
  }
}

export function resolveWeekStatsSports(
  planSportRows: WorkoutType[],
): WorkoutType[] {
  const sports = [...DEFAULT_WEEK_STATS_SPORTS]
  for (const sport of planSportRows) {
    if (
      sport === WorkoutType.REST ||
      sport === WorkoutType.RECOVERY ||
      sports.includes(sport)
    ) {
      continue
    }
    sports.push(sport)
  }
  return sports
}

export function sportHasPlannedWork(
  sport: WorkoutType,
  totals: SportWeekTotals,
  workouts: PlanWorkoutDetail[],
): boolean {
  if (sport === WorkoutType.SWIM) {
    return (
      totals.distanceMeters > 0 ||
      totals.durationMin > 0 ||
      totals.actualDistanceMeters > 0 ||
      totals.actualDurationMin > 0
    )
  }
  if (sport === WorkoutType.STRENGTH) {
    if (totals.durationMin > 0 || totals.actualDurationMin > 0) return true
    return workouts.some(
      (w) => w.type === WorkoutType.STRENGTH && !w.isRace && !w.selfLogged,
    )
  }
  if (
    totals.distanceKm > 0 ||
    totals.durationMin > 0 ||
    totals.actualDistanceKm > 0 ||
    totals.actualDurationMin > 0
  ) {
    return true
  }
  return workouts.some((w) => w.type === sport && !w.isRace && !w.selfLogged)
}

/** Sports that have planned work in the given week days. */
export function weekSportsWithPlannedWork(
  planDays: { workouts: PlanWorkoutDetail[] }[],
  planSportRows: WorkoutType[],
  options?: Parameters<typeof sumSportWeekTotals>[2],
): WorkoutType[] {
  const allWorkouts = planDays.flatMap((d) => d.workouts)
  return resolveWeekStatsSports(planSportRows).filter((sport) =>
    sportHasPlannedWork(
      sport,
      sumSportWeekTotals(planDays, sport, options),
      allWorkouts,
    ),
  )
}
