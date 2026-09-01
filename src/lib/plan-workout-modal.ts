import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { isStravaSynced, type PlanWorkoutDetail } from '@/lib/plan-workout'

/**
 * Coaches edit planned workouts in WorkoutEditorDialog.
 * Logged workouts open the read-only detail modal (results + athlete feedback).
 */
export function coachOpensPlanWorkoutEditor(
  isCoach: boolean,
  workout: PlanWorkoutDetail,
): boolean {
  if (!isCoach || workout.isRace || workout.type === WorkoutType.RECOVERY) {
    return false
  }
  if (
    workout.status === WorkoutStatus.COMPLETED ||
    workout.status === WorkoutStatus.SKIPPED ||
    isStravaSynced(workout)
  ) {
    return false
  }
  return true
}
