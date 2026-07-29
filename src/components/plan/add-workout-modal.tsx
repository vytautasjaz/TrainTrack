'use client'

/**
 * @deprecated Use WorkoutEditorDialog. Kept as a thin wrapper for any leftover imports.
 */
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutType } from '@prisma/client'

type AddWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  sport?: WorkoutType
  workout?: PlanWorkoutDetail | null
  athleteMode?: boolean
}

export function AddWorkoutModal({
  open,
  onOpenChange,
  date,
  sport,
  workout = null,
  athleteMode = false,
}: AddWorkoutModalProps) {
  const resolvedSport = workout?.type ?? sport
  if (!resolvedSport) return null

  return (
    <WorkoutEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      date={date}
      sport={resolvedSport}
      workout={workout}
      athleteMode={athleteMode}
    />
  )
}
