import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { isStravaSynced } from '@/lib/plan-workout'
import { StravaMark, StravaWordmark } from '@/components/plan/strava-mark'
import {
  workoutStatusIconClass,
  type WorkoutStatusIconSize,
} from '@/components/ui/workout-status-icon'
import { cn } from '@/lib/utils'

type StravaSyncedIndicatorProps = {
  workout: PlanWorkoutDetail
  /** `wordmark` = full STRAVA logo (list rows); `mark` = circled A (cards). */
  variant?: 'badge' | 'icon' | 'dot' | 'mark' | 'wordmark'
  /** Size for mark circle / wordmark height. */
  size?: WorkoutStatusIconSize
  className?: string
}

/** Logo inside the circle — slightly smaller than the outline. */
const INNER_MARK_CLASS: Record<WorkoutStatusIconSize, string> = {
  xs: 'h-[9px] w-[9px]',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
}

const WORDMARK_CLASS: Record<WorkoutStatusIconSize, string> = {
  xs: 'h-2.5 w-auto',
  sm: 'h-3 w-auto',
  md: 'h-3.5 w-auto',
  lg: 'h-4 w-auto',
}

export function StravaSyncedIndicator({
  workout,
  variant = 'mark',
  size = 'xs',
  className,
}: StravaSyncedIndicatorProps) {
  if (!isStravaSynced(workout)) return null

  const url = workout.result?.stravaActivityUrl ?? null

  if (variant === 'dot') {
    const dot = (
      <span
        className={cn(
          'pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#FC4C02] ring-1 ring-card',
          className,
        )}
        title="Synced from Strava"
        aria-hidden
      />
    )
    if (!url) return dot
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute -right-0.5 -top-0.5 z-[1]"
        title="View on Strava"
        aria-label="View on Strava"
      >
        <span className="pointer-events-none block h-1.5 w-1.5 rounded-full bg-[#FC4C02] ring-1 ring-card" />
      </a>
    )
  }

  if (variant === 'wordmark') {
    const wordmark = (
      <StravaWordmark
        className={cn('text-muted-foreground/55', WORDMARK_CLASS[size], className)}
      />
    )
    if (!url) {
      return (
        <span title="Synced from Strava" aria-label="Synced from Strava" className="inline-flex">
          {wordmark}
        </span>
      )
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex shrink-0 items-center rounded-sm px-0.5 py-1 text-muted-foreground/55 transition hover:text-[#FC4C02]/80"
        title="View on Strava"
        aria-label="View on Strava"
      >
        <StravaWordmark className={cn(WORDMARK_CLASS[size], 'text-current', className)} />
      </a>
    )
  }

  if (variant === 'mark' || variant === 'icon') {
    const circled = (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-[#FC4C02]/70 text-[#FC4C02]',
          workoutStatusIconClass(size),
          className,
        )}
        aria-hidden={Boolean(url)}
      >
        <StravaMark className={INNER_MARK_CLASS[size]} />
      </span>
    )

    if (!url) {
      return (
        <span title="Synced from Strava" aria-label="Synced from Strava" className="inline-flex">
          {circled}
        </span>
      )
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex shrink-0 items-center justify-center rounded-full transition hover:bg-[#FC4C02]/10"
        title="View on Strava"
        aria-label="View on Strava"
      >
        {circled}
      </a>
    )
  }

  const badge = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#FC4C02]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#FC4C02]',
        className,
      )}
      title="Synced from Strava"
    >
      <StravaMark className="h-2.5 w-2.5" />
      Strava
    </span>
  )

  if (!url) return badge

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label="View on Strava"
    >
      {badge}
    </a>
  )
}
