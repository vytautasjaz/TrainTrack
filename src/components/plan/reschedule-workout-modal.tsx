'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { rescheduleWorkout } from '@/app/actions/workouts'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type RescheduleWorkoutModalProps = {
  workout: PlanWorkoutDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

export function RescheduleWorkoutModal({
  workout,
  open,
  onOpenChange,
  onDone,
}: RescheduleWorkoutModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(workout.dateKey)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('rescheduledDate', date)
    startTransition(async () => {
      try {
        await rescheduleWorkout(formData)
        onOpenChange(false)
        router.refresh()
        onDone?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reschedule')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(workout.dateKey)
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to another day</DialogTitle>
          <DialogDescription>
            Leaves a ghost on the original plan day and places this workout on the new date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="New date">
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
          {workout.rescheduledFromDateKey ? (
            <p className="text-xs text-muted-foreground">
              Originally planned{' '}
              <span className="font-medium text-foreground">{workout.rescheduledFromDateKey}</span>
              . Pick that date again to move it back.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              {pending ? 'Moving…' : 'Move workout'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type RescheduleWorkoutButtonProps = {
  workout: PlanWorkoutDetail
  className?: string
  onDone?: () => void
}

export function RescheduleWorkoutButton({
  workout,
  className,
  onDone,
}: RescheduleWorkoutButtonProps) {
  const [open, setOpen] = useState(false)

  if (workout.isRace || workout.isRescheduleGhost) return null
  if (workout.type === 'REST' || workout.type === 'RECOVERY') return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <CalendarClock className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Move to another day
      </Button>
      <RescheduleWorkoutModal
        workout={workout}
        open={open}
        onOpenChange={setOpen}
        onDone={onDone}
      />
    </>
  )
}
