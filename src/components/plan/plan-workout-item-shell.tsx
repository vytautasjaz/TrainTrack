'use client'

import { WorkoutStatus } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

/** Soft sky wash for athlete self-logged workouts (no label text). */
export function isAthleteAddedWorkout(
  workout: Pick<PlanWorkoutDetail, 'selfLogged' | 'status'>,
) {
  return Boolean(workout.selfLogged) && workout.status !== WorkoutStatus.COMPLETED
}

export function athleteAddedFieldClass(active: boolean) {
  return active
    ? 'bg-sky-500/[0.08] ring-1 ring-inset ring-sky-500/15 dark:bg-sky-400/[0.1] dark:ring-sky-400/20'
    : undefined
}

/** Transparent wrapper for grip/delete around data cards (no sky tint — cards own surface). */
export function planWorkoutItemShellClass(_workout: PlanWorkoutDetail, extra?: string) {
  return cn('min-w-0', extra)
}
