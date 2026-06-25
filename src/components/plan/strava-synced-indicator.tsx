import { Activity } from 'lucide-react'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { isStravaSynced } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type StravaSyncedIndicatorProps = {
  workout: PlanWorkoutDetail
  variant?: 'badge' | 'icon' | 'dot'
  className?: string
}

export function StravaSyncedIndicator({
  workout,
  variant = 'badge',
  className,
}: StravaSyncedIndicatorProps) {
  if (!isStravaSynced(workout)) return null

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#FC4C02] ring-1 ring-card',
          className,
        )}
        title="Synced from Strava"
        aria-hidden
      />
    )
  }

  if (variant === 'icon') {
    return (
      <Activity
        className={cn('h-3 w-3 shrink-0 text-[#FC4C02]', className)}
        aria-label="Synced from Strava"
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#FC4C02]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#FC4C02]',
        className,
      )}
      title="Synced from Strava"
    >
      <Activity className="h-2.5 w-2.5" aria-hidden />
      Strava
    </span>
  )
}
