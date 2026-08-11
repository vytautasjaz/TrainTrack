'use client'

import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { RacePlanItem } from '@/components/plan/race-plan-item'
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
        className={cn(PLAN_WORKOUT_ITEM_CLASS, 'block w-full min-w-0')}
      >
        <WorkoutBlock
          workout={workout}
          density="md"
          status={status}
          hideCompletedBadge={showQuickActions}
          actions={
            showQuickActions ? (
              <span className="inline-block w-[2.75rem]" aria-hidden />
            ) : null
          }
        />
      </WorkoutModalTrigger>
      {showQuickActions ? (
        <div className="absolute right-1 top-1 z-10 opacity-60 transition group-hover/card:opacity-100">
          <AthleteWorkoutQuickActions
            workout={workout}
            isCoach={isCoach}
            size="xs"
            displayStatus={status}
            onDisplayStatusChange={setOptimisticStatus}
          />
        </div>
      ) : null}
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
