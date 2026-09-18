'use client'

import { useState } from 'react'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutBlock } from '@/components/workout-block'
import { planWorkoutItemShellClass } from '@/components/plan/plan-workout-item-shell'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { canDragPlanWorkout, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type RacePlanItemProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  tableCell?: boolean
  className?: string
  /** Allow same-day reorder (and block cross-day via isRace on drag item). */
  draggable?: boolean
}

/** Week/plan race chip — same WorkoutBlock chrome as training cards. */
export function RacePlanItem({
  workout,
  isCoach,
  tableCell = false,
  className,
  draggable = false,
}: RacePlanItemProps) {
  const dnd = usePlanWeekDnd()
  const [isDragging, setIsDragging] = useState(false)
  const canDrag = Boolean(
    draggable && dnd && canDragPlanWorkout(workout),
  )

  return (
    <div
      className={planWorkoutItemShellClass(
        workout,
        cn(
          'group/card relative w-full min-w-0',
          tableCell && PLAN_WORKOUT_ITEM_CLASS,
          isDragging && 'opacity-40',
          className,
        ),
      )}
    >
      <WorkoutModalTrigger
        workout={workout}
        isCoach={isCoach}
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
        title={
          canDrag
            ? `${workout.title} — drag to reorder within this day`
            : undefined
        }
        draggable={canDrag}
        onDragStart={(e) => {
          if (!dnd || !canDrag) return
          setIsDragging(true)
          dnd.setDragWorkout({
            id: workout.id,
            sport: workout.type,
            dateKey: workout.dateKey,
            isRace: true,
          })
          e.dataTransfer.effectAllowed = 'copyMove'
          e.dataTransfer.setData('text/plain', workout.id)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          dnd?.setDragWorkout(null)
        }}
      >
        <WorkoutBlock workout={workout} density="md" />
      </WorkoutModalTrigger>
    </div>
  )
}
