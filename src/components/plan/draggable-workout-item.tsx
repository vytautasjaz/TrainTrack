'use client'

import { useState } from 'react'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { PlanWorkoutActionsMenu } from '@/components/plan/plan-workout-actions-menu'
import {
  CoachRescheduleReviewActions,
  needsCoachRescheduleReview,
} from '@/components/plan/coach-reschedule-review-actions'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutBlock } from '@/components/workout-block'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { planWorkoutItemShellClass } from '@/components/plan/plan-workout-item-shell'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import {
  athleteHasQuickLogActions,
  canDragPlanWorkout,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type DraggableWorkoutItemProps = {
  workout: PlanWorkoutDetail
  isCoach?: boolean
  draggable?: boolean
  tableCell?: boolean
}

export function DraggableWorkoutItem({
  workout,
  isCoach = true,
  draggable = false,
  tableCell = false,
}: DraggableWorkoutItemProps) {
  const dnd = usePlanWeekDnd()
  const [isDragging, setIsDragging] = useState(false)
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const showReview = isCoach && needsCoachRescheduleReview(workout)
  const canDrag = Boolean(
    draggable && dnd && canDragPlanWorkout(workout, status),
  )

  if (workout.isRace) {
    return (
      <RacePlanItem workout={workout} isCoach={isCoach} compact tableCell={tableCell} />
    )
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
        isCoach={isCoach}
        nestedInteractive={showReview}
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
        title={
          canDrag
            ? isCoach
              ? `${workout.title} — drag to move`
              : `${workout.title} — drag to reschedule`
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
          status={status}
          hideCompletedBadge={showQuickActions}
          actions={
            showQuickActions || isCoach ? (
              <span className="inline-block w-6" aria-hidden />
            ) : null
          }
          footer={
            showReview ? (
              <CoachRescheduleReviewActions workout={workout} isCoach={isCoach} />
            ) : null
          }
        />
      </WorkoutModalTrigger>
      <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 opacity-80 transition group-hover/card:opacity-100">
        {isCoach ? <PlanWorkoutActionsMenu workout={workout} compact /> : null}
        {showQuickActions ? (
          <AthleteWorkoutQuickActions
            workout={workout}
            isCoach={false}
            size="xs"
            displayStatus={status}
            onDisplayStatusChange={setOptimisticStatus}
          />
        ) : null}
      </div>
    </div>
  )
}
