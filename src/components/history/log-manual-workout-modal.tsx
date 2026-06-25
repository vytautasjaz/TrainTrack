'use client'

import { useTransition } from 'react'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { logManualWorkout } from '@/app/actions/workouts'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { todayDateKey } from '@/lib/dates'

const WORKOUT_TYPES = (Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

type LogManualWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogManualWorkoutModal({ open, onOpenChange }: LogManualWorkoutModalProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await logManualWorkout(formData)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a workout</DialogTitle>
          <DialogDescription>
            Add a completed workout that wasn&apos;t on your plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Date</span>
            <input
              name="date"
              type="date"
              required
              defaultValue={todayDateKey()}
              max={todayDateKey()}
              className="input-field mt-1"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Sport</span>
            <select name="type" required defaultValue={WorkoutType.RUN} className="input-field mt-1">
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORKOUT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Title</span>
            <input
              name="title"
              placeholder="e.g. Evening run"
              className="input-field mt-1"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">Distance (km)</span>
              <input
                name="actualDistance"
                type="number"
                step="0.1"
                min={0}
                placeholder="Optional"
                className="input-field mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Duration (min)</span>
              <input
                name="actualDuration"
                type="number"
                min={0}
                placeholder="Optional"
                className="input-field mt-1"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">RPE (1–10)</span>
            <input
              name="rpe"
              type="number"
              min={1}
              max={10}
              placeholder="Optional"
              className="input-field mt-1 max-w-[8rem]"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea
              name="athleteNotes"
              rows={3}
              placeholder="How did it feel?"
              className="input-field mt-1"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save workout'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
