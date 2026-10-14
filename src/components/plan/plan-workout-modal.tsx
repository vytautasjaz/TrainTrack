'use client'

import {
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { invalidatePlanWorkoutDetailCache } from '@/lib/plan-workout-detail-prefetch'

type PlanWorkoutModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Plan/training workout modal — preview first; Edit opens the builder. */
export function PlanWorkoutModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: PlanWorkoutModalProps) {
  function handleOpenChange(next: boolean) {
    if (!next) invalidatePlanWorkoutDetailCache(workout.id)
    onOpenChange(next)
  }

  if (workout.isRace) {
    return (
      <RaceDetailModal
        workout={workout}
        open={open}
        onOpenChange={handleOpenChange}
        isCoach={isCoach}
      />
    )
  }

  return (
    <WorkoutDetailModal
      workout={workout}
      isCoach={isCoach}
      open={open}
      onOpenChange={handleOpenChange}
    />
  )
}
