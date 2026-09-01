'use client'

import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { useOptimisticWorkoutStatus } from '@/components/plan/athlete-workout-quick-actions'
import {
  WorkoutCardCornerOverlay,
  workoutCardCornerSpacerClass,
} from '@/components/plan/workout-card-corner-overlay'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import {
  CoachRescheduleReviewActions,
  needsCoachRescheduleReview,
} from '@/components/plan/coach-reschedule-review-actions'
import { WorkoutBlock } from '@/components/workout-block'
import { planWorkoutItemShellClass } from '@/components/plan/plan-workout-item-shell'
import { athleteHasQuickLogActions, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { PLAN_WORKOUT_ITEM_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type PlanWorkoutRowProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
}

export function PlanWorkoutRow({ workout, isCoach }: PlanWorkoutRowProps) {
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const showReview = isCoach && needsCoachRescheduleReview(workout)

  if (workout.isRace) {
    return <RacePlanItem workout={workout} isCoach={isCoach} compact tableCell />
  }

  return (
    <div
      className={planWorkoutItemShellClass(
        workout,
        cn('group/card relative w-full min-w-0'),
      )}
    >
      <WorkoutModalTrigger
        workout={workout}
        isCoach={isCoach}
        nestedInteractive={showReview}
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
      >
        <WorkoutBlock
          workout={workout}
          density="md"
          status={status}
          hideCompletedBadge={showQuickActions}
          actions={
            showQuickActions || isCoach ? (
              <span
                className={workoutCardCornerSpacerClass(workout, {
                  showQuickActions,
                  showCoachMenu: isCoach,
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
        className="right-1 top-1"
      />
    </div>
  )
}

type PlanWorkoutCellProps = {
  workouts: PlanWorkoutDetail[]
  isCoach: boolean
}

export function PlanWorkoutCell({ workouts, isCoach }: PlanWorkoutCellProps) {
  if (workouts.length === 0) return null

  return (
    <div className="space-y-1.5 landscape:max-lg:space-y-0.5">
      {workouts.map((w) => (
        <PlanWorkoutRow key={w.id} workout={w} isCoach={isCoach} />
      ))}
    </div>
  )
}
