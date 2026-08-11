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
  /**
   * `wordmark` = horizontal STRAVA; `mark` / `icon` = grey A (no circle);
   * `dot` = tiny corner pip; `badge` = grey pill.
   */
  variant?: 'badge' | 'icon' | 'dot' | 'mark' | 'wordmark'
  size?: WorkoutStatusIconSize
  className?: string
}

const MARK_CLASS: Record<WorkoutStatusIconSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
}

const WORDMARK_CLASS: Record<WorkoutStatusIconSize, string> = {
  xs: 'h-2 w-auto',
  sm: 'h-3 w-auto',
  md: 'h-3.5 w-auto',
  lg: 'h-4 w-auto',
}

const GREY = 'text-muted-foreground/55'
const GREY_HOVER = 'transition hover:text-muted-foreground'

export function StravaSyncedIndicator({
  workout,
  variant = 'wordmark',
  size = 'xs',
  className,
}: StravaSyncedIndicatorProps) {
  if (!isStravaSynced(workout)) return null

  const url = workout.result?.stravaActivityUrl ?? null

  if (variant === 'dot') {
    const dot = (
      <span
        className={cn(
          'pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/45 ring-1 ring-card',
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
        <span className="pointer-events-none block h-1.5 w-1.5 rounded-full bg-muted-foreground/45 ring-1 ring-card" />
      </a>
    )
  }

  if (variant === 'wordmark') {
    const wordmark = (
      <StravaWordmark className={cn(GREY, WORDMARK_CLASS[size], className)} />
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
        className={cn('inline-flex shrink-0 items-center rounded-sm px-0.5 py-1', GREY, GREY_HOVER)}
        title="View on Strava"
        aria-label="View on Strava"
      >
        <StravaWordmark className={cn(WORDMARK_CLASS[size], 'text-current', className)} />
      </a>
    )
  }

  if (variant === 'mark' || variant === 'icon') {
    const mark = (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center',
          GREY,
          workoutStatusIconClass(size),
          className,
        )}
        aria-hidden={Boolean(url)}
      >
        <StravaMark className={MARK_CLASS[size]} />
      </span>
    )

    if (!url) {
      return (
        <span title="Synced from Strava" aria-label="Synced from Strava" className="inline-flex">
          {mark}
        </span>
      )
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn('inline-flex shrink-0 items-center justify-center rounded-sm', GREY_HOVER)}
        title="View on Strava"
        aria-label="View on Strava"
      >
        {mark}
      </a>
    )
  }

  const badge = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground',
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
