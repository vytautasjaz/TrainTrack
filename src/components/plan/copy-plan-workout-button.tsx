'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { CopyPlanWorkoutModal } from '@/components/plan/copy-plan-workout-modal'
import { cn } from '@/lib/utils'

type CopyPlanWorkoutButtonProps = {
  workoutId: string
  workoutTitle: string
  sourceDateKey: string
  className?: string
  /** Compact for week grid cells */
  compact?: boolean
}

export function CopyPlanWorkoutButton({
  workoutId,
  workoutTitle,
  sourceDateKey,
  className,
  compact = false,
}: CopyPlanWorkoutButtonProps) {
  const [open, setOpen] = useState(false)

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
        aria-label={`Copy ${workoutTitle}`}
        title="Copy"
      >
        <Copy className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>

      <CopyPlanWorkoutModal
        open={open}
        onOpenChange={setOpen}
        workoutId={workoutId}
        workoutTitle={workoutTitle}
        sourceDateKey={sourceDateKey}
      />
    </>
  )
}
