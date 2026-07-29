'use client'

import { useState } from 'react'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { CopyPlanWorkoutButton } from '@/components/plan/copy-plan-workout-button'
import { DeletePlanWorkoutButton } from '@/components/plan/delete-plan-workout-button'
import { EditPlanWorkoutButton } from '@/components/plan/edit-plan-workout-button'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { PlanWorkoutDataCard } from '@/components/plan/plan-workout-data-card'
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
          'relative w-full min-w-0',
          'group/card',
          tableCell && PLAN_WORKOUT_ITEM_CLASS,
          isDragging && 'opacity-40',
        ),
      )}
    >
      <WorkoutModalTrigger
        workout={workout}
        isCoach
        nestedInteractive
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
        <PlanWorkoutDataCard
          workout={workout}
          density="week"
          editable
          actions={<span className="inline-block w-5" aria-hidden />}
        />
      </WorkoutModalTrigger>
      <div className="absolute right-1 top-1 z-10 flex flex-col items-center gap-0.5 opacity-50 transition group-hover/card:opacity-100">
        <EditPlanWorkoutButton workout={workout} compact />
        <CopyPlanWorkoutButton
          workoutId={workout.id}
          workoutTitle={workout.title}
          sourceDateKey={workout.dateKey}
          compact
        />
        <DeletePlanWorkoutButton
          workoutId={workout.id}
          workoutTitle={workout.title}
          compact
        />
      </div>
    </div>
  )
}
