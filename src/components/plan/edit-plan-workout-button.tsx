'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type EditPlanWorkoutButtonProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** Athlete editing a self-added workout. */
  selfLoggedCreate?: boolean
  /** Dark modal hero vs light side panel. */
  heroTone?: 'dark' | 'light'
  /** Compact icon-only control (week grid). */
  compact?: boolean
  onSaved?: () => void
}

export function EditPlanWorkoutButton({
  workout,
  className,
  selfLoggedCreate = false,
  heroTone = 'light',
  compact = false,
  onSaved,
}: EditPlanWorkoutButtonProps) {
  const [open, setOpen] = useState(false)
  const darkHero = heroTone === 'dark'

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
          compact
            ? cn(
                'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition',
                'hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30',
                'h-5 w-5',
              )
            : cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30',
                darkHero
                  ? 'bg-white/10 text-white hover:bg-white/16'
                  : 'border border-border bg-white text-foreground hover:bg-muted',
              ),
          className,
        )}
        aria-label={`Edit ${workout.title}`}
        title="Edit"
      >
        <Pencil className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2} />
        {compact ? null : <span>Edit</span>}
      </button>

      <WorkoutEditorDialog
        open={open}
        onOpenChange={setOpen}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
        selfLoggedCreate={selfLoggedCreate}
        onSaved={onSaved}
      />
    </>
  )
}
