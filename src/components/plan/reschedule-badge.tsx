import { CalendarClock } from 'lucide-react'
import { formatDateKeyCompact } from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type RescheduleBadgeProps = {
  workout: PlanWorkoutDetail
  className?: string
}

export function getRescheduleBadgeLabel(workout: PlanWorkoutDetail): string | null {
  if (workout.isRescheduleGhost && workout.rescheduledToDateKey) {
    return `To ${formatDateKeyCompact(workout.rescheduledToDateKey)}`
  }
  if (
    !workout.isRescheduleGhost &&
    workout.rescheduledFromDateKey &&
    workout.rescheduledFromDateKey !== workout.dateKey
  ) {
    return `From ${formatDateKeyCompact(workout.rescheduledFromDateKey)}`
  }
  return null
}

/** Amber chip — ghost “to” date or moved “from” date. */
export function RescheduleBadge({ workout, className }: RescheduleBadgeProps) {
  const label = getRescheduleBadgeLabel(workout)
  if (!label) return null

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-0.5 rounded-[3px] bg-amber-500/12 px-1 py-px text-[9px] font-semibold uppercase leading-none tracking-wide text-amber-800 dark:text-amber-300',
        className,
      )}
      title={label}
    >
      <CalendarClock className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </span>
  )
}
