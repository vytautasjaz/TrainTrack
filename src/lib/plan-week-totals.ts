import { WorkoutType } from '@prisma/client'
import type { PlanDay } from '@/lib/plan-week'
import { formatDistance, formatDuration } from '@/lib/utils'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import { estimateSwimDurationMinFromCss } from '@/lib/athlete-preferences'

const SPORTS_WITHOUT_PLANNED_DISTANCE = new Set<WorkoutType>([WorkoutType.STRENGTH])

export function sportUsesPlannedDistance(sport: WorkoutType): boolean {
  return !SPORTS_WITHOUT_PLANNED_DISTANCE.has(sport)
}

export type SportWeekTotals = {
  distanceKm: number
  durationMin: number
  actualDistanceKm: number
  actualDurationMin: number
  /** Swim totals in meters (plannedDistanceMeters / actualDistance km→m). */
  distanceMeters: number
  actualDistanceMeters: number
}

export type WeekTotalsOptions = {
  /** Used to estimate swim duration when plannedDuration is missing. */
  swimCssSecPer100m?: number | null
}

function plannedSwimMeters(workout: {
  plannedDistanceMeters: number | null
  plannedDistance: number | null
}): number {
  if (workout.plannedDistanceMeters != null && workout.plannedDistanceMeters > 0) {
    return workout.plannedDistanceMeters
  }
  if (workout.plannedDistance != null && workout.plannedDistance > 0) {
    return Math.round(workout.plannedDistance * 1000)
  }
  return 0
}

function plannedSwimDurationMin(
  workout: {
    plannedDuration: number | null
    plannedDistanceMeters: number | null
    plannedDistance: number | null
  },
  swimCssSecPer100m?: number | null,
): number {
  if (workout.plannedDuration != null && workout.plannedDuration > 0) {
    return workout.plannedDuration
  }
  if (typeof swimCssSecPer100m === 'number' && swimCssSecPer100m > 0) {
    const meters = plannedSwimMeters(workout)
    if (meters > 0) return estimateSwimDurationMinFromCss(meters, swimCssSecPer100m)
  }
  return 0
}

export function sumSportWeekTotals(
  days: { workouts: PlanDay['workouts'] }[],
  sport: WorkoutType,
  options?: WeekTotalsOptions,
): SportWeekTotals {
  let distanceKm = 0
  let durationMin = 0
  let actualDistanceKm = 0
  let actualDurationMin = 0
  let distanceMeters = 0
  let actualDistanceMeters = 0
  const css = options?.swimCssSecPer100m

  for (const day of days) {
    for (const workout of day.workouts) {
      if (workout.type === WorkoutType.REST) continue

      // Races contribute by sport split (triathlon → swim/bike/run), not only race.sport.
      if (workout.isRace) {
        const contrib =
          workout.raceDistanceBySport &&
          (sport === WorkoutType.RUN ||
            sport === WorkoutType.BIKE ||
            sport === WorkoutType.SWIM)
            ? workout.raceDistanceBySport[sport]
            : null
        if (contrib) {
          if (sport === WorkoutType.SWIM) {
            if (contrib.plannedKm > 0) {
              distanceMeters += Math.round(contrib.plannedKm * 1000)
            }
            if (contrib.actualKm != null && contrib.actualKm > 0) {
              actualDistanceMeters += Math.round(contrib.actualKm * 1000)
            }
          } else {
            if (contrib.plannedKm > 0) distanceKm += contrib.plannedKm
            if (contrib.actualKm != null && contrib.actualKm > 0) {
              actualDistanceKm += contrib.actualKm
            }
          }
          if (contrib.plannedMin > 0) durationMin += contrib.plannedMin
          if (contrib.actualMin != null && contrib.actualMin > 0) {
            actualDurationMin += contrib.actualMin
          }
        } else if (workout.type === sport) {
          // Race on this sport row without split metrics (e.g. HYROX) — use card fields.
          if (workout.plannedDuration) durationMin += workout.plannedDuration
          if (workout.result?.actualDuration) {
            actualDurationMin += workout.result.actualDuration
          }
        }
        continue
      }

      if (workout.type !== sport) continue

      if (sport === WorkoutType.SWIM) {
        distanceMeters += plannedSwimMeters(workout)
        durationMin += plannedSwimDurationMin(workout, css)
        if (workout.result?.actualDistance) {
          actualDistanceMeters += Math.round(workout.result.actualDistance * 1000)
        }
      } else {
        if (workout.plannedDuration) durationMin += workout.plannedDuration
        if (workout.plannedDistance) distanceKm += workout.plannedDistance
        if (workout.result?.actualDistance) actualDistanceKm += workout.result.actualDistance
      }

      if (workout.result?.actualDuration) actualDurationMin += workout.result.actualDuration
    }
  }

  return {
    distanceKm,
    durationMin,
    actualDistanceKm,
    actualDurationMin,
    distanceMeters,
    actualDistanceMeters,
  }
}

/** Total planned/actual duration across all sports for the week (excludes REST). */
export function sumWeekDurationMinutes(
  days: PlanDay[],
  options?: WeekTotalsOptions,
): { planned: number; actual: number } {
  let planned = 0
  let actual = 0
  const css = options?.swimCssSecPer100m

  for (const day of days) {
    for (const workout of day.workouts) {
      if (workout.type === WorkoutType.REST) continue
      if (workout.isRace && workout.raceDistanceBySport) {
        for (const contrib of Object.values(workout.raceDistanceBySport)) {
          if (!contrib) continue
          if (contrib.plannedMin > 0) planned += contrib.plannedMin
          if (contrib.actualMin != null && contrib.actualMin > 0) {
            actual += contrib.actualMin
          }
        }
        continue
      }
      if (workout.type === WorkoutType.SWIM) {
        planned += plannedSwimDurationMin(workout, css)
      } else if (workout.plannedDuration) {
        planned += workout.plannedDuration
      }
      if (workout.result?.actualDuration) actual += workout.result.actualDuration
    }
  }

  return { planned, actual }
}

export function sportHasPlannedDistance(sport: WorkoutType, totals: SportWeekTotals): boolean {
  if (!sportUsesPlannedDistance(sport)) return false
  if (sport === WorkoutType.SWIM) return totals.distanceMeters > 0
  return totals.distanceKm > 0
}

export function formatSportWeekDistance(sport: WorkoutType, totals: SportWeekTotals): string | null {
  if (!sportHasPlannedDistance(sport, totals)) return null
  if (sport === WorkoutType.SWIM) return formatSwimDistance(totals.distanceMeters) || null
  const formatted = formatDistance(totals.distanceKm)
  return formatted === '—' ? null : formatted
}

export function formatSportWeekActualDistance(
  sport: WorkoutType,
  totals: SportWeekTotals,
): string | null {
  if (sport === WorkoutType.SWIM) {
    if (totals.actualDistanceMeters <= 0) return null
    return formatSwimDistance(totals.actualDistanceMeters) || null
  }
  if (totals.actualDistanceKm <= 0) return null
  const formatted = formatDistance(totals.actualDistanceKm)
  return formatted === '—' ? null : formatted
}

export function formatSportWeekTotals(sport: WorkoutType, totals: SportWeekTotals): string | null {
  const parts: string[] = []

  const distance = formatSportWeekDistance(sport, totals)
  if (distance) parts.push(distance)
  if (totals.durationMin > 0) {
    parts.push(formatDuration(totals.durationMin))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}
