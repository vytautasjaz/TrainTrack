'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SharedWorkoutEditor } from '@/components/workout-editor/shared-workout-editor'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutType } from '@prisma/client'

type WorkoutEditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  sport: WorkoutType
  workout?: PlanWorkoutDetail | null
  athleteMode?: boolean
}

export function WorkoutEditorDialog({
  open,
  onOpenChange,
  date,
  sport,
  workout = null,
  athleteMode = false,
}: WorkoutEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[42rem] flex-col gap-0 overflow-hidden border-0 bg-transparent p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{workout ? 'Edit Workout' : 'Add Workout'}</DialogTitle>
        <DialogDescription className="sr-only">
          Card-style workout editor for {sport.toLowerCase()}
        </DialogDescription>
        {open ? (
          <SharedWorkoutEditor
            key={`${workout?.id ?? 'new'}-${sport}-${date}`}
            mode="plan"
            sportType={sport}
            date={date}
            workout={workout}
            athleteMode={athleteMode}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
