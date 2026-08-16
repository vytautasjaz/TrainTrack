'use client'

import { getRescheduleBadgeLabel } from '@/components/plan/reschedule-badge'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type ReschedulePlanIndicatorProps = {
  workout: PlanWorkoutDetail
  compact?: boolean
  className?: string
}

export function getReschedulePlanLabel(workout: PlanWorkoutDetail): string | null {
  return getRescheduleBadgeLabel(workout)
}

export function hasReschedulePlanIndicator(workout: PlanWorkoutDetail): boolean {
  return Boolean(getReschedulePlanLabel(workout))
}

export function ReschedulePlanIndicator({
  workout,
  compact = false,
  className,
}: ReschedulePlanIndicatorProps) {
  const label = getReschedulePlanLabel(workout)
  if (!label) return null

  return (
    <p
      className={cn(
        'font-medium leading-tight text-amber-700 dark:text-amber-400',
        compact ? 'text-[8px] landscape:max-lg:text-[7px]' : 'text-[10px]',
        className,
      )}
    >
      {label}
    </p>
  )
}
