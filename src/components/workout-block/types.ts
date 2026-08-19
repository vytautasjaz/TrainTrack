import { SessionType, WorkoutStatus } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { hasIncludeItems, hasStructureContent } from '@/lib/workout-builder/utils'

/** Density scale from Workout Block Specification v5/v7. */
export type WorkoutBlockDensity = 'xs' | 'sm' | 'md' | 'lg'

export type WorkoutBlockStatus =
  | 'planned'
  | 'completed'
  | 'skipped'
  | 'adjusted'

export function workoutStatusToBlockStatus(
  status: WorkoutStatus,
): WorkoutBlockStatus {
  if (status === WorkoutStatus.COMPLETED) return 'completed'
  if (status === WorkoutStatus.SKIPPED) return 'skipped'
  return 'planned'
}

/** Structured sessions that show a fingerprint (Design System v3). */
const FINGERPRINT_SESSIONS = new Set<SessionType>([
  SessionType.THRESHOLD,
  SessionType.VO2_MAX,
  SessionType.TEMPO,
  SessionType.INTERVALS,
  SessionType.HILL_REPEATS,
  SessionType.FARTLEK,
  SessionType.RACE_PACE,
])

export function shouldShowFingerprint(workout: PlanWorkoutDetail): boolean {
  if (hasIncludeItems(workout.structure)) return true
  if (workout.structure && hasStructureContent(workout.structure)) {
    if (workout.sessionType && FINGERPRINT_SESSIONS.has(workout.sessionType)) {
      return true
    }
    // Structured blocks without an easy/recovery session still get a fingerprint.
    if (
      !workout.sessionType ||
      (workout.sessionType !== SessionType.EASY_RUN &&
        workout.sessionType !== SessionType.RECOVERY_RUN)
    ) {
      return true
    }
  }
  return Boolean(
    workout.sessionType && FINGERPRINT_SESSIONS.has(workout.sessionType),
  )
}

export function densityToDiagramSize(
  density: WorkoutBlockDensity,
): 'week' | 'list' | 'month' {
  if (density === 'lg') return 'list'
  if (density === 'sm' || density === 'xs') return 'month'
  return 'week'
}
