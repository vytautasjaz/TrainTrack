import { WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import { formatDistance } from '@/lib/utils'

function distanceLabel(sport: WorkoutType, workout: PlanWorkoutDetail): string | null {
  if (sport === WorkoutType.SWIM) {
    if (workout.plannedDistanceMeters && workout.plannedDistanceMeters > 0) {
      return formatSwimDistance(workout.plannedDistanceMeters)
    }
    if (workout.plannedDistance && workout.plannedDistance > 0) {
      return formatDistance(workout.plannedDistance)
    }
    return null
  }
  if (workout.plannedDistance && workout.plannedDistance > 0) {
    return formatDistance(workout.plannedDistance)
  }
  return null
}

function triathlonSummaryLine(items: PlanWorkoutDetail[]): string | null {
  const byType = new Map(items.map((w) => [w.type, w]))
  const swim = byType.get(WorkoutType.SWIM)
  const bike = byType.get(WorkoutType.BIKE)
  const run = byType.get(WorkoutType.RUN)
  const parts: string[] = []
  if (swim) {
    const d = distanceLabel(WorkoutType.SWIM, swim)
    if (d) parts.push(`Swim ${d}`)
  }
  if (bike) {
    const d = distanceLabel(WorkoutType.BIKE, bike)
    if (d) parts.push(`Bike ${d}`)
  }
  if (run) {
    const d = distanceLabel(WorkoutType.RUN, run)
    if (d) parts.push(`Run ${d}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * List/month views: collapse split triathlon race rows (swim/bike/run) into one card.
 * Week table stays unchanged by not using this helper there.
 */
export function collapseTriathlonRaceWorkouts(
  workouts: PlanWorkoutDetail[],
): PlanWorkoutDetail[] {
  if (workouts.length < 2) return workouts

  const grouped = new Map<string, PlanWorkoutDetail[]>()
  for (const w of workouts) {
    if (!w.isRace || w.raceType !== 'TRIATHLON' || !w.raceId) continue
    const list = grouped.get(w.raceId) ?? []
    list.push(w)
    grouped.set(w.raceId, list)
  }
  if (grouped.size === 0) return workouts

  const mergedById = new Map<string, PlanWorkoutDetail>()
  for (const [raceId, items] of grouped.entries()) {
    if (items.length < 2) continue
    const first = items[0]!
    const plannedDistance = items.reduce((sum, i) => sum + (i.plannedDistance ?? 0), 0)
    const plannedDuration = items.reduce((sum, i) => sum + (i.plannedDuration ?? 0), 0)
    const actualDistance = items.reduce((sum, i) => sum + (i.result?.actualDistance ?? 0), 0)
    const actualDuration = items.reduce((sum, i) => sum + (i.result?.actualDuration ?? 0), 0)
    const summary = triathlonSummaryLine(items)
    const raceDistanceBySport = items.reduce<NonNullable<PlanWorkoutDetail['raceDistanceBySport']>>(
      (acc, i) => ({ ...acc, ...(i.raceDistanceBySport ?? {}) }),
      {},
    )

    mergedById.set(raceId, {
      ...first,
      id: `race-${raceId}`,
      type: WorkoutType.TRIATHLON,
      description: summary,
      // In compact list/month cards we keep splits in the subtitle and hide aggregate distance.
      plannedDistance: null,
      plannedDistanceMeters: null,
      plannedDuration: plannedDuration > 0 ? plannedDuration : null,
      raceDistanceBySport,
      result:
        first.result || actualDistance > 0 || actualDuration > 0
          ? {
              actualDistance: actualDistance > 0 ? actualDistance : null,
              actualDuration: actualDuration > 0 ? actualDuration : null,
              rpe: null,
              athleteNotes: null,
              coachReply: null,
              coachReplyReadAt: null,
              stravaActivityUrl: null,
              stravaActivityName: null,
              stravaActivityDescription: null,
              logType: null,
            }
          : null,
    })
  }

  if (mergedById.size === 0) return workouts

  const consumed = new Set<string>()
  const out: PlanWorkoutDetail[] = []
  for (const w of workouts) {
    if (!w.isRace || w.raceType !== 'TRIATHLON' || !w.raceId) {
      out.push(w)
      continue
    }
    const merged = mergedById.get(w.raceId)
    if (!merged) {
      out.push(w)
      continue
    }
    if (!consumed.has(w.raceId)) {
      out.push(merged)
      consumed.add(w.raceId)
    }
  }
  return out
}
