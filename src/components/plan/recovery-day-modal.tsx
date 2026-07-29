'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
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
import { useCurrentPath } from '@/hooks/use-current-path'

type RecoveryDayModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  workout?: PlanWorkoutDetail | null
}

export function RecoveryDayModal({ open, onOpenChange, date, workout }: RecoveryDayModalProps) {
  const currentPath = useCurrentPath()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isEdit = Boolean(workout)

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
    startTransition(async () => {
      const fd = new FormData()
      fd.set('workoutId', workout.id)
      fd.set('redirectTo', currentPath)
      await deleteWorkout(fd)
      setConfirmOpen(false)
      onOpenChange(false)
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit recovery day' : 'Mark recovery day'}</DialogTitle>
            <DialogDescription>{date}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Coach comment">
              <Textarea
                key={workout?.id ?? 'new'}
                name="coachNotes"
                defaultValue={workout?.coachNotes ?? ''}
                rows={4}
                autoFocus
                placeholder="Optional guidance for the athlete (e.g. easy spin, foam roll, full rest)"
              />
            </FormField>

            <div className="flex items-center justify-between gap-2 pt-1">
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={isPending}
                  onClick={() => setConfirmOpen(true)}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove recovery day?"
        description="This recovery day will be removed from the plan."
        confirmLabel="Remove"
        pending={isPending}
        onConfirm={handleRemove}
      />
    </>
  )
}
