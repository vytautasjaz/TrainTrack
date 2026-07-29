import { WorkoutType } from '@prisma/client'
import type { PlanDay } from '@/lib/plan-week'
import { formatDistance, formatDuration } from '@/lib/utils'

const SPORTS_WITHOUT_PLANNED_DISTANCE = new Set<WorkoutType>([WorkoutType.STRENGTH])

export function sportUsesPlannedDistance(sport: WorkoutType): boolean {
  return !SPORTS_WITHOUT_PLANNED_DISTANCE.has(sport)
}

export type SportWeekTotals = {
  distanceKm: number
  durationMin: number
  actualDistanceKm: number
  actualDurationMin: number
}

export function sumSportWeekTotals(days: PlanDay[], sport: WorkoutType): SportWeekTotals {
  let distanceKm = 0
  let durationMin = 0
  let actualDistanceKm = 0
  let actualDurationMin = 0

  for (const day of days) {
    for (const workout of day.workouts) {
      if (workout.type !== sport || workout.type === WorkoutType.REST) continue
      if (workout.plannedDistance) distanceKm += workout.plannedDistance
      if (workout.plannedDuration) durationMin += workout.plannedDuration
      if (workout.result?.actualDistance) actualDistanceKm += workout.result.actualDistance
      if (workout.result?.actualDuration) actualDurationMin += workout.result.actualDuration
    }
  }

  return { distanceKm, durationMin, actualDistanceKm, actualDurationMin }
}

/** Total planned/actual duration across all sports for the week (excludes REST). */
export function sumWeekDurationMinutes(days: PlanDay[]): { planned: number; actual: number } {
  let planned = 0
  let actual = 0

  for (const day of days) {
    for (const workout of day.workouts) {
      if (workout.type === WorkoutType.REST) continue
      if (workout.plannedDuration) planned += workout.plannedDuration
      if (workout.result?.actualDuration) actual += workout.result.actualDuration
    }
  }

  return { planned, actual }
}

export function formatSportWeekTotals(sport: WorkoutType, totals: SportWeekTotals): string | null {
  const parts: string[] = []

  if (sportUsesPlannedDistance(sport) && totals.distanceKm > 0) {
    parts.push(formatDistance(totals.distanceKm))
  }
  if (totals.durationMin > 0) {
    parts.push(formatDuration(totals.durationMin))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}
