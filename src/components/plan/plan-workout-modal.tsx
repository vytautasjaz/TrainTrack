'use client'

import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { coachOpensPlanWorkoutEditor } from '@/lib/plan-workout-modal'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'

type PlanWorkoutModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Plan/training workout modal — coaches edit planned sessions; logged ones open the detail view. */
export function PlanWorkoutModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: PlanWorkoutModalProps) {
  if (workout.isRace) {
    return (
      <RaceDetailModal
        workout={workout}
        open={open}
        onOpenChange={onOpenChange}
      />
    )
  }

  if (coachOpensPlanWorkoutEditor(isCoach, workout)) {
    return (
      <WorkoutEditorDialog
        open={open}
        onOpenChange={onOpenChange}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
      />
    )
  }

  return (
    <WorkoutDetailModal
      workout={workout}
      isCoach={isCoach}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
