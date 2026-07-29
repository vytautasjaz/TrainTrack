'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteWorkout } from '@/app/actions/workouts'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

type DeletePlanWorkoutButtonProps = {
  workoutId: string
  workoutTitle: string
  className?: string
  /** Compact for week grid cells */
  compact?: boolean
}

export function DeletePlanWorkoutButton({
  workoutId,
  workoutTitle,
  className,
  compact = false,
}: DeletePlanWorkoutButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workoutId', workoutId)
      await deleteWorkout(formData)
      setConfirmOpen(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setConfirmOpen(true)
        }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30',
          compact ? 'h-5 w-5' : 'h-7 w-7',
          className,
        )}
        aria-label={`Remove ${workoutTitle}`}
        title="Remove"
      >
        <Trash2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove workout?"
        description={`“${workoutTitle}” will be removed from the plan.`}
        confirmLabel="Remove"
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
