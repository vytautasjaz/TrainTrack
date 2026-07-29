'use client'

/**
 * @deprecated Use WorkoutEditorDialog. Kept as a thin wrapper for any leftover imports.
 */
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type AddRunWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  workout?: PlanWorkoutDetail | null
}

export function AddRunWorkoutModal({
  open,
  onOpenChange,
  date,
  workout = null,
}: AddRunWorkoutModalProps) {
  return (
    <WorkoutEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      date={date}
      sport={WorkoutType.RUN}
      workout={workout}
    />
  )
}
