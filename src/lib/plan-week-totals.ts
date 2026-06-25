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
}

export function sumSportWeekTotals(days: PlanDay[], sport: WorkoutType): SportWeekTotals {
  let distanceKm = 0
  let durationMin = 0

  for (const day of days) {
    for (const workout of day.workouts) {
      if (workout.type !== sport || workout.type === WorkoutType.REST) continue
      if (workout.plannedDistance) distanceKm += workout.plannedDistance
      if (workout.plannedDuration) durationMin += workout.plannedDuration
    }
  }

  return { distanceKm, durationMin }
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
