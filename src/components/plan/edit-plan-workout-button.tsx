'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type EditPlanWorkoutButtonProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** Compact for week grid cells */
  compact?: boolean
}

export function EditPlanWorkoutButton({
  workout,
  className,
  compact = false,
}: EditPlanWorkoutButtonProps) {
  const [open, setOpen] = useState(false)

  if (workout.isRace || workout.type === WorkoutType.RECOVERY) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30',
          compact ? 'h-5 w-5' : 'h-7 w-7',
          className,
        )}
        aria-label={`Edit ${workout.title}`}
        title="Edit"
      >
        <Pencil className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>

      <WorkoutEditorDialog
        open={open}
        onOpenChange={setOpen}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
      />
    </>
  )
}
