'use client'

import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutBlock } from '@/components/workout-block'
import { planWorkoutItemShellClass } from '@/components/plan/plan-workout-item-shell'
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

/** Week/plan race chip — same WorkoutBlock chrome as training cards. */
export function RacePlanItem({
  workout,
  isCoach,
  tableCell = false,
  className,
}: RacePlanItemProps) {
  return (
    <div
      className={planWorkoutItemShellClass(
        workout,
        cn(
          'group/card relative w-full min-w-0 overflow-hidden',
          tableCell && PLAN_WORKOUT_ITEM_CLASS,
          className,
        ),
      )}
    >
      <WorkoutModalTrigger
        workout={workout}
        isCoach={isCoach}
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
      >
        <WorkoutBlock workout={workout} density="md" />
      </WorkoutModalTrigger>
    </div>
  )
}
