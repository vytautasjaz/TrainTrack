'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SharedWorkoutEditor } from '@/components/workout-editor/shared-workout-editor'
import { prefetchWorkoutCoachingThread } from '@/lib/coaching-thread-prefetch'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutEditorMode } from '@/lib/workout-editor/types'
import type { WorkoutType } from '@prisma/client'

type WorkoutEditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  sport: WorkoutType
  workout?: PlanWorkoutDetail | null
  /** Library template id when editing an existing template */
  entityId?: string
  athleteMode?: boolean
  /** plan (default) or template (coach library) */
  mode?: Extract<WorkoutEditorMode, 'plan' | 'template'>
}

export function WorkoutEditorDialog({
  open,
  onOpenChange,
  date,
  sport,
  workout = null,
  entityId,
  athleteMode = false,
  mode = 'plan',
}: WorkoutEditorDialogProps) {
  const isTemplate = mode === 'template'
  const title = workout || entityId
    ? isTemplate
      ? 'Edit template'
      : 'Edit Workout'
    : isTemplate
      ? 'New template'
      : 'Add Workout'

  useEffect(() => {
    if (open && workout?.id && !athleteMode && !isTemplate) {
      prefetchWorkoutCoachingThread(workout.id)
    }
  }, [open, workout?.id, athleteMode, isTemplate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[min(64rem,calc(100%-1.5rem))] flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:w-auto"
        overlayClassName="bg-black/50"
        hideCloseButton
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {isTemplate
            ? `Card-style template editor for ${sport.toLowerCase()}`
            : `Card-style workout editor for ${sport.toLowerCase()}`}
        </DialogDescription>
        {open ? (
          <SharedWorkoutEditor
            key={`${mode}-${entityId ?? workout?.id ?? 'new'}-${sport}-${date}`}
            mode={mode}
            sportType={sport}
            date={date}
            workout={workout}
            entityId={entityId}
            athleteMode={athleteMode}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
