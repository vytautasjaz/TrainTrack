import { WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

/** Coaches edit plan workouts in WorkoutEditorDialog — not the athlete read-only modal. */
export function coachOpensPlanWorkoutEditor(
  isCoach: boolean,
  workout: PlanWorkoutDetail,
): boolean {
  return (
    isCoach &&
    !workout.isRace &&
    workout.type !== WorkoutType.RECOVERY
  )
}
