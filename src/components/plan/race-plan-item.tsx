'use client'

import { Flag } from 'lucide-react'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { racePlanItemClass } from '@/lib/race-day'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type RacePlanItemProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  tableCell?: boolean
  className?: string
}

export function RacePlanItem({
  workout,
  isCoach,
  compact = false,
  tableCell = false,
  className,
}: RacePlanItemProps) {
  return (
    <WorkoutModalTrigger
      workout={workout}
      isCoach={isCoach}
      className={cn(
        'group flex w-full items-start gap-1.5 rounded-md transition',
        racePlanItemClass(compact),
        compact && 'landscape:max-lg:gap-1',
        tableCell && PLAN_WORKOUT_ITEM_CLASS,
        className,
      )}
    >
      <Flag
        className={cn(
          'mt-0.5 shrink-0 fill-amber-500/25 text-amber-600 dark:text-amber-400',
          compact ? 'h-2.5 w-2.5 landscape:max-lg:h-2 landscape:max-lg:w-2' : 'h-3.5 w-3.5',
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'min-w-0 truncate font-semibold leading-snug text-amber-950 group-hover:text-amber-800 dark:text-amber-100 dark:group-hover:text-amber-50',
            compact
              ? 'text-[8px] landscape:max-lg:leading-tight lg:text-xs'
              : 'text-xs',
          )}
        >
          {workout.title}
        </p>
        <div className={cn(compact && 'landscape:max-lg:hidden')}>
          <WorkoutPlanMeta workout={workout} />
        </div>
      </div>
    </WorkoutModalTrigger>
  )
}
