/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutStatus } from '@prisma/client'
import { markWorkoutDone, markWorkoutSkipped, unlogWorkout } from '@/app/actions/workouts'
import { athleteHasQuickLogActions, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { toUserMessage } from '@/lib/action-error'
import {
  WorkoutStatusIcon,
  workoutQuickActionIconClass,
  type WorkoutStatusIconSize,
} from '@/components/ui/workout-status-icon'
import { cn } from '@/lib/utils'

export function useOptimisticWorkoutStatus(
  workout: Pick<PlanWorkoutDetail, 'id' | 'status'>,
) {
  const [override, setOverride] = useState<WorkoutStatus | null>(null)

  useEffect(() => {
    setOverride(null)
  }, [workout.id, workout.status])

  const status = override ?? workout.status

  const setOptimisticStatus = useCallback((next: WorkoutStatus) => {
    setOverride(next)
  }, [])

  const clearOptimisticStatus = useCallback(() => {
    setOverride(null)
  }, [])

  return { status, setOptimisticStatus, clearOptimisticStatus }
}

type AthleteWorkoutQuickActionsProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  size?: WorkoutStatusIconSize
  layout?: 'inline' | 'below'
  className?: string
  displayStatus?: WorkoutStatus
  onDisplayStatusChange?: (status: WorkoutStatus) => void
}

function workoutFormData(workoutId: string) {
  const formData = new FormData()
  formData.set('workoutId', workoutId)
  return formData
}

export function AthleteWorkoutQuickActions({
  workout,
  isCoach,
  size = 'md',
  layout = 'inline',
  className,
  displayStatus,
  onDisplayStatusChange,
}: AthleteWorkoutQuickActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const internalOptimistic = useOptimisticWorkoutStatus(workout)
  const status = displayStatus ?? internalOptimistic.status
  const setOptimisticStatus = onDisplayStatusChange ?? internalOptimistic.setOptimisticStatus
  const clearOptimisticStatus = onDisplayStatusChange
    ? () => onDisplayStatusChange(workout.status)
    : internalOptimistic.clearOptimisticStatus

  if (!athleteHasQuickLogActions(workout, isCoach)) return null

  const isCompleted = status === WorkoutStatus.COMPLETED
  const isSkipped = status === WorkoutStatus.SKIPPED
  const iconClass = workoutQuickActionIconClass(size)
  const buttonClass =
    size === 'xs'
      ? 'rounded-md p-0.5 transition hover:bg-muted/60'
      : 'rounded-md p-1 transition hover:bg-muted/60'

  function run(
    action: (formData: FormData) => Promise<void>,
    optimisticNext: WorkoutStatus,
  ) {
    setActionError(null)
    setOptimisticStatus(optimisticNext)
    startTransition(async () => {
      try {
        await action(workoutFormData(workout.id))
        router.refresh()
      } catch (error) {
        clearOptimisticStatus()
        setActionError(toUserMessage(error, 'Could not update workout'))
      }
    })
  }

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (isCompleted) {
      run(unlogWorkout, WorkoutStatus.PLANNED)
      return
    }
    run(markWorkoutDone, WorkoutStatus.COMPLETED)
  }

  function handleSkip(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (isSkipped) {
      run(unlogWorkout, WorkoutStatus.PLANNED)
      return
    }
    run(markWorkoutSkipped, WorkoutStatus.SKIPPED)
  }

  return (
    <div
      className={cn(
        layout === 'below' ? 'flex flex-col items-start gap-0.5' : 'flex shrink-0 items-center gap-0.5',
        layout === 'below' && 'justify-start pt-0.5',
        isPending && 'opacity-60',
        className,
      )}
      title={layout === 'inline' && actionError ? actionError : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        disabled={isPending}
        onClick={handleComplete}
        className={cn(
          buttonClass,
          isCompleted ? 'text-success' : 'text-muted-foreground/50 hover:text-success',
        )}
        aria-label={isCompleted ? 'Unlog completed workout' : 'Mark workout completed'}
        aria-pressed={isCompleted}
      >
        <WorkoutStatusIcon
          kind="completed"
          active={isCompleted}
          className={cn(iconClass, !isCompleted && 'text-inherit')}
          aria-hidden
        />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={handleSkip}
        className={cn(
          buttonClass,
          isSkipped ? 'text-destructive' : 'text-muted-foreground/50 hover:text-destructive',
        )}
        aria-label={isSkipped ? 'Unlog skipped workout' : 'Mark workout skipped'}
        aria-pressed={isSkipped}
      >
        <WorkoutStatusIcon
          kind="skipped"
          active={isSkipped}
          className={cn(iconClass, !isSkipped && 'text-inherit')}
          aria-hidden
        />
      </button>
      </div>
      {layout === 'below' && actionError ? (
        <p role="alert" className="text-[10px] leading-tight text-destructive">
          {actionError}
        </p>
      ) : null}
    </div>
  )
}
