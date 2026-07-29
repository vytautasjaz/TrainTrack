'use client'

/**
 * @deprecated Use WorkoutEditorDialog. Kept as a thin wrapper for any leftover imports.
 */
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type AddSwimWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  workout?: PlanWorkoutDetail | null
}

export function AddSwimWorkoutModal({
  open,
  onOpenChange,
  date,
  workout = null,
}: AddSwimWorkoutModalProps) {
  return (
    <WorkoutEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      date={date}
      sport={WorkoutType.SWIM}
      workout={workout}
    />
  )
}
