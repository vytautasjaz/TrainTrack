'use client'

import { useState } from 'react'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { useOptimisticWorkoutStatus } from '@/components/plan/athlete-workout-quick-actions'
import {
  WorkoutCardCornerOverlay,
  workoutCardCornerSpacerClass,
} from '@/components/plan/workout-card-corner-overlay'
import {
  CoachRescheduleReviewActions,
  needsCoachRescheduleReview,
} from '@/components/plan/coach-reschedule-review-actions'
import { PlanWorkoutActionsMenu } from '@/components/plan/plan-workout-actions-menu'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { WorkoutBlock } from '@/components/workout-block'
import {
  athleteHasQuickLogActions,
  canDragPlanWorkout,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type TrainingWorkoutCardProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  detailed?: boolean
  className?: string
  /** Home today: compact lg hero without diagram/subtitle. */
  appearance?: 'default' | 'dashboard-today'
}

export function TrainingWorkoutCard({
  workout,
  isCoach,
  className,
  appearance = 'default',
}: TrainingWorkoutCardProps) {
  const dnd = usePlanWeekDnd()
  const [dragging, setDragging] = useState(false)
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)

  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const showCoachDelete = isCoach && !workout.isRace
  const showReview = isCoach && needsCoachRescheduleReview(workout)
  const canDrag = Boolean(dnd) && canDragPlanWorkout(workout, status)
  const reserveActions = showCoachDelete || showQuickActions || isCoach
  const isDashboardToday = appearance === 'dashboard-today'

  return (
    <div className={cn('py-3', className, dragging && 'opacity-50')}>
      <div className="group/card relative min-w-0 overflow-hidden">
        <WorkoutModalTrigger
          workout={workout}
          isCoach={isCoach}
          nestedInteractive={showReview}
          className="block w-full min-w-0"
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
            setDragging(true)
            dnd.setDragWorkout({
              id: workout.id,
              sport: workout.type,
              dateKey: workout.dateKey,
            })
            e.dataTransfer.effectAllowed = 'copyMove'
            e.dataTransfer.setData('text/plain', workout.id)
          }}
          onDragEnd={() => {
            setDragging(false)
            dnd?.setDragWorkout(null)
          }}
        >
          <WorkoutBlock
            workout={workout}
            density="lg"
            status={status}
            isCoach={isCoach}
            hideCompletedBadge={showQuickActions}
            hideFingerprint={isDashboardToday}
            hideSubtitle={isDashboardToday}
            actions={
              reserveActions ? (
                <span
                  className={workoutCardCornerSpacerClass(workout, {
                    showQuickActions,
                    showCoachMenu: showCoachDelete,
                  })}
                  aria-hidden
                />
              ) : null
            }
            footer={
              showReview ? (
                <CoachRescheduleReviewActions workout={workout} isCoach={isCoach} />
              ) : null
            }
          />
        </WorkoutModalTrigger>

        <WorkoutCardCornerOverlay
          workout={workout}
          isCoach={isCoach}
          showQuickActions={showQuickActions}
          status={status}
          onStatusChange={setOptimisticStatus}
          quickActionSize="sm"
          className="right-2 top-2"
          leading={
            showCoachDelete ? (
              <PlanWorkoutActionsMenu workout={workout} />
            ) : undefined
          }
        />
      </div>
    </div>
  )
}
