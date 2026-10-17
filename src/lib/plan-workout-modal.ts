import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { isStravaSynced, type PlanWorkoutDetail } from '@/lib/plan-workout'

/**
 * Whether the plan workout may be edited from the preview (Edit button).
 * Coaches: planned coach sessions. Athletes: self-added sessions only.
 * Completed / skipped / Strava / race / recovery stay preview-only.
 */
export function canEditPlanWorkout(
  isCoach: boolean,
  workout: PlanWorkoutDetail,
): boolean {
  if (workout.isRace || workout.type === WorkoutType.RECOVERY) {
    return false
  }
  if (
    workout.status === WorkoutStatus.COMPLETED ||
    workout.status === WorkoutStatus.SKIPPED ||
    isStravaSynced(workout)
  ) {
    return false
  }
  if (isCoach) return true
  return Boolean(workout.selfLogged)
}

/**
 * Whether the plan workout may be removed from the plan.
 * Coaches: any non-race / non-recovery session.
 * Athletes: only workouts they added themselves (`selfLogged`).
 */
export function canDeletePlanWorkout(
  isCoach: boolean,
  workout: PlanWorkoutDetail,
): boolean {
  if (workout.isRace || workout.type === WorkoutType.RECOVERY) {
    return false
  }
  if (workout.isRescheduleGhost) return false
  if (isCoach) return true
  return Boolean(workout.selfLogged)
}
