import type { EnduranceDetails, EnduranceSport, Workout, WorkoutType } from '../types/workout'
import { isEnduranceType } from '../types/workout'
import { resolveWorkoutType } from './workoutDisplay'

export type ActivityStats = {
  distanceBySport: Record<EnduranceSport, number>
  totalDistanceKm: number
  totalDurationMin: number
  workoutCount: number
}

export type WeekStats = ActivityStats

const emptyStats = (): ActivityStats => ({
  distanceBySport: { running: 0, cycling: 0, swimming: 0 },
  totalDistanceKm: 0,
  totalDurationMin: 0,
  workoutCount: 0,
})

function addEndurance(
  stats: ActivityStats,
  sport: EnduranceSport,
  details?: EnduranceDetails,
) {
  if (details?.distanceKm) {
    stats.distanceBySport[sport] += details.distanceKm
    stats.totalDistanceKm += details.distanceKm
  }
  if (details?.durationMin) {
    stats.totalDurationMin += details.durationMin
  }
}

export function computeActivityStats(workouts: Workout[]): ActivityStats {
  const stats = emptyStats()
  stats.workoutCount = workouts.length

  for (const workout of workouts) {
    const type = resolveWorkoutType(workout.type)

    if (isEnduranceType(type)) {
      addEndurance(stats, type, workout.endurance)
    } else if (type === 'brick' && workout.brick?.length) {
      for (const segment of workout.brick) {
        addEndurance(stats, segment.sport, segment.details)
      }
    }
  }

  return stats
}

export const computeWeekStats = computeActivityStats

export function computeTypeCounts(workouts: Workout[]): Record<WorkoutType, number> {
  const counts: Record<WorkoutType, number> = {
    running: 0,
    cycling: 0,
    swimming: 0,
    brick: 0,
    gym: 0,
    hyrox: 0,
  }

  for (const workout of workouts) {
    counts[resolveWorkoutType(workout.type)]++
  }

  return counts
}
