import { WorkoutStatus, WorkoutType } from '@prisma/client'
import {
  sumSportWeekTotals,
  type SportWeekTotals,
} from '@/lib/plan-week-totals'
import { SPORT_ROW_ORDER } from '@/lib/constants'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatDuration } from '@/lib/utils'

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

export type WeekSportMetric = {
  actual: number
  planned: number
  actualLabel: string
  plannedLabel: string
  unit: string
}

function formatKmValue(km: number): string {
  if (km <= 0) return '0'
  return km % 1 === 0 ? String(km) : km.toFixed(1)
}

function formatMetersValue(meters: number): string {
  return Math.round(Math.max(0, meters)).toLocaleString('en-US')
}

function formatDurationValue(min: number): string {
  if (min <= 0) return '0'
  return formatDuration(min)
}

export function weekSportMetric(
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
    }
  }

  if (sport === WorkoutType.STRENGTH) {
    if (totals.durationMin > 0 || totals.actualDurationMin > 0) {
      return {
        actual: totals.actualDurationMin,
        planned: totals.durationMin,
        actualLabel: formatDurationValue(totals.actualDurationMin),
        plannedLabel: formatDurationValue(totals.durationMin),
        unit: '',
      }
    }
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
    }
  }

  if (
    sport === WorkoutType.RUN ||
    sport === WorkoutType.BIKE ||
    sport === WorkoutType.HYROX
  ) {
    return {
      actual: totals.actualDistanceKm,
      planned: totals.distanceKm,
      actualLabel: formatKmValue(totals.actualDistanceKm),
      plannedLabel: formatKmValue(totals.distanceKm),
      unit: 'km',
    }
  }

  if (totals.durationMin > 0 || totals.actualDurationMin > 0) {
    return {
      actual: totals.actualDurationMin,
      planned: totals.durationMin,
      actualLabel: formatDurationValue(totals.actualDurationMin),
      plannedLabel: formatDurationValue(totals.durationMin),
      unit: '',
    }
  }

  return {
    actual: totals.actualDistanceKm,
    planned: totals.distanceKm,
    actualLabel: formatKmValue(totals.actualDistanceKm),
    plannedLabel: formatKmValue(totals.distanceKm),
    unit: 'km',
  }
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
