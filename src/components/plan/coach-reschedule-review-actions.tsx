'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, CalendarClock } from 'lucide-react'
import {
  acceptAthleteReschedule,
  rejectAthleteReschedule,
} from '@/app/actions/workouts'
import { getRescheduleBadgeLabel } from '@/components/plan/reschedule-badge'
import {
  isRescheduledWorkout,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { toUserMessage } from '@/lib/action-error'
import { cn } from '@/lib/utils'

export function needsCoachRescheduleReview(workout: PlanWorkoutDetail): boolean {
  return Boolean(workout.isRescheduleGhost) || isRescheduledWorkout(workout)
}

type CoachRescheduleReviewActionsProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  className?: string
  /** footer = card bottom strip; inline = banners / modals. */
  placement?: 'footer' | 'inline'
}

/** Check / X on pending athlete reschedules — accept keeps the move, reject restores the plan day. */
export function CoachRescheduleReviewActions({
  workout,
  isCoach,
  className,
  placement = 'footer',
}: CoachRescheduleReviewActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const label = getRescheduleBadgeLabel(workout)

  if (!isCoach || !needsCoachRescheduleReview(workout)) return null

  function run(action: (id: string) => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action(workout.id)
        router.refresh()
      } catch (err) {
        setError(toUserMessage(err, 'Could not update reschedule'))
      }
    })
  }

  const buttons = (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        disabled={pending}
        title={error ?? 'Accept move — remove ghost'}
        aria-label="Accept reschedule"
        onClick={() => run(acceptAthleteReschedule)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[3px] text-emerald-700 transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-400',
          placement === 'footer' ? 'h-5 w-5' : 'rounded p-1',
        )}
      >
        <Check
          className={placement === 'footer' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          strokeWidth={2.5}
        />
      </button>
      <button
        type="button"
        disabled={pending}
        title={error ?? 'Reject move — restore original day'}
        aria-label="Reject reschedule"
        onClick={() => run(rejectAthleteReschedule)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[3px] text-red-600 transition hover:bg-red-500/15 disabled:opacity-50 dark:text-red-400',
          placement === 'footer' ? 'h-5 w-5' : 'rounded p-1',
        )}
      >
        <X
          className={placement === 'footer' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          strokeWidth={2.5}
        />
      </button>
    </div>
  )

  if (placement === 'inline') {
    return (
      <div
        className={cn(
          'flex max-w-full flex-col gap-0.5 overflow-hidden rounded-md border border-amber-500/30 bg-amber-50/95 p-0.5 shadow-sm dark:bg-amber-950/80',
          className,
        )}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex max-w-full items-center gap-1.5 overflow-hidden">
          {label ? (
            <span
              className="inline-flex min-w-0 items-center gap-1 overflow-hidden px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300"
              title={label}
            >
              <CalendarClock className="h-2.5 w-2.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
            </span>
          ) : null}
          {buttons}
        </div>
        {error ? (
          <p className="px-1 pb-0.5 text-[9px] font-medium leading-snug text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  // Footer: grid keeps ✓/✗ in-bounds; label truncates first in narrow week cells.
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 overflow-hidden border-t border-border/60 bg-muted/60 py-0.5 pl-2 pr-1 dark:bg-muted/40',
        className,
      )}
      data-review-footer="true"
      title={error ?? undefined}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {label ? (
        <span
          className="inline-flex min-w-0 items-center gap-1 overflow-hidden text-[8px] font-semibold uppercase leading-none tracking-wide text-muted-foreground"
          title={error ?? label}
        >
          <CalendarClock className="h-2.5 w-2.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="min-w-0 truncate">{error ?? label}</span>
        </span>
      ) : (
        <span />
      )}
      {buttons}
    </div>
  )
}
