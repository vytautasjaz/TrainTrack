'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

function statusDot(status: PlanWorkoutDetail['status']) {
  if (status === 'COMPLETED') return 'bg-green-500'
  if (status === 'SKIPPED') return 'bg-red-400'
  return 'bg-muted-foreground/40'
}

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

  if (workout.isRace) {
    return <RacePlanItem workout={workout} isCoach compact tableCell={tableCell} />
  }

  const content = (
    <>
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', statusDot(workout.status))} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-xs font-medium leading-snug group-hover:text-brand">{workout.title}</p>
          <StravaSyncedIndicator workout={workout} variant="icon" />
        </div>
        <WorkoutPlanMeta workout={workout} />
      </div>
    </>
  )

  if (!draggable || !dnd) {
    return (
      <WorkoutModalTrigger
        workout={workout}
        isCoach
        className={cn(
          'group flex w-full items-start gap-1.5 rounded-md px-1 py-0.5',
          tableCell ? PLAN_WORKOUT_ITEM_CLASS : 'hover:bg-muted/40',
        )}
      >
        {content}
      </WorkoutModalTrigger>
    )
  }

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-0.5 rounded-md border border-transparent px-0.5 py-0.5 transition',
        tableCell && PLAN_WORKOUT_ITEM_CLASS,
        isDragging && 'opacity-40',
        !tableCell && 'hover:bg-muted/40',
      )}
    >
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          setIsDragging(true)
          dnd.setDragWorkout({
            id: workout.id,
            sport: workout.type,
            dateKey: workout.dateKey,
          })
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', workout.id)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          dnd.setDragWorkout(null)
        }}
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag ${workout.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <WorkoutModalTrigger
        workout={workout}
        isCoach
        className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
      >
        {content}
      </WorkoutModalTrigger>
    </div>
  )
}
