'use client'

import { useTransition } from 'react'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
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
          <FormField label="Date">
            <Input
              name="date"
              type="date"
              required
              defaultValue={todayDateKey()}
              max={todayDateKey()}
            />
          </FormField>

          <FormField label="Sport">
            <Select name="type" required defaultValue={WorkoutType.RUN}>
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORKOUT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Title">
            <Input name="title" placeholder="e.g. Evening run" />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Distance (km)">
              <Input
                name="actualDistance"
                type="number"
                step="0.1"
                min={0}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Duration (min)">
              <Input name="actualDuration" type="number" min={0} placeholder="Optional" />
            </FormField>
          </div>

          <FormField label="RPE (1–10)">
            <Input
              name="rpe"
              type="number"
              min={1}
              max={10}
              placeholder="Optional"
              className="max-w-[8rem]"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea name="athleteNotes" rows={3} placeholder="How did it feel?" />
            <PrivateNoteToggle
              hideFrom="coach"
              name="athleteNotesPrivate"
              className="mt-2"
            />
          </FormField>

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
