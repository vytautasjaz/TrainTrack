'use client'

import { useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { saveRecoveryDay } from '@/app/actions/workout-builder'
import { deleteWorkout } from '@/app/actions/workouts'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type RecoveryDayModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  workout?: PlanWorkoutDetail | null
}

export function RecoveryDayModal({ open, onOpenChange, date, workout }: RecoveryDayModalProps) {
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(workout)

  useEffect(() => {
    if (!open) return
  }, [open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const coachNotes = (form.elements.namedItem('coachNotes') as HTMLTextAreaElement).value.trim()
    startTransition(async () => {
      await saveRecoveryDay({
        date,
        coachNotes: coachNotes || undefined,
        workoutId: workout?.id,
      })
      onOpenChange(false)
    })
  }

  function handleRemove() {
    if (!workout) return
    if (!confirm('Remove recovery day from the plan?')) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('workoutId', workout.id)
      await deleteWorkout(fd)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recovery day' : 'Mark recovery day'}</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Coach comment</span>
            <textarea
              key={workout?.id ?? 'new'}
              name="coachNotes"
              defaultValue={workout?.coachNotes ?? ''}
              rows={4}
              autoFocus
              placeholder="Optional guidance for the athlete (e.g. easy spin, foam roll, full rest)"
              className="input-field mt-1"
            />
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={handleRemove}
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save' : 'Mark recovery day'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
