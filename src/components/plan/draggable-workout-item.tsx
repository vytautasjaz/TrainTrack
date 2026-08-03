'use client'

import { useState } from 'react'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { PlanWorkoutActionsMenu } from '@/components/plan/plan-workout-actions-menu'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutBlock } from '@/components/workout-block'
import { planWorkoutItemShellClass } from '@/components/plan/plan-workout-item-shell'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type DraggableWorkoutItemProps = {
  workout: PlanWorkoutDetail
  draggable?: boolean
  tableCell?: boolean
}

export function DraggableWorkoutItem({
  workout,
  draggable = false,
  tableCell = false,
}: DraggableWorkoutItemProps) {
  const dnd = usePlanWeekDnd()
  const [isDragging, setIsDragging] = useState(false)
  const canDrag = Boolean(draggable && dnd)

  if (workout.isRace) {
    return <RacePlanItem workout={workout} isCoach compact tableCell={tableCell} />
  }

  return (
    <div
      className={planWorkoutItemShellClass(
        workout,
        cn(
          'relative w-full min-w-0 overflow-hidden',
          'group/card',
          tableCell && PLAN_WORKOUT_ITEM_CLASS,
          isDragging && 'opacity-40',
        ),
      )}
    >
      <WorkoutModalTrigger
        workout={workout}
        isCoach
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
        title={canDrag ? `${workout.title} — drag to move` : undefined}
        draggable={canDrag}
        onDragStart={(e) => {
          if (!dnd) return
          setIsDragging(true)
          dnd.setDragWorkout({
            id: workout.id,
            sport: workout.type,
            dateKey: workout.dateKey,
          })
          e.dataTransfer.effectAllowed = 'copyMove'
          e.dataTransfer.setData('text/plain', workout.id)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          dnd?.setDragWorkout(null)
        }}
      >
        <WorkoutBlock
          workout={workout}
          density="md"
          actions={<span className="inline-block w-6" aria-hidden />}
        />
      </WorkoutModalTrigger>
      <div className="absolute right-1.5 top-1.5 z-10 opacity-60 transition group-hover/card:opacity-100">
        <PlanWorkoutActionsMenu workout={workout} compact />
      </div>
    </div>
  )
}
