/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { WorkoutStatus } from '@prisma/client'
import { markWorkoutDone, markWorkoutSkipped, unlogWorkout } from '@/app/actions/workouts'
import { athleteHasQuickLogActions, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { toUserMessage } from '@/lib/action-error'
import {
  WorkoutStatusIcon,
  workoutQuickActionIconClass,
  workoutStatusKindFromStatus,
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
  /**
   * `inline` — check + skip side by side.
   * `below` — check + skip stacked (desktop list).
   * `picker` — one status circle; tap opens Complete / Skip (mobile).
   */
  layout?: 'inline' | 'below' | 'picker'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [menuPos, setMenuPos] = useState<{
    top?: number
    bottom?: number
    right: number
  } | null>(null)
  const pickerTriggerRef = useRef<HTMLButtonElement>(null)
  const internalOptimistic = useOptimisticWorkoutStatus(workout)
  const status = displayStatus ?? internalOptimistic.status
  const setOptimisticStatus = onDisplayStatusChange ?? internalOptimistic.setOptimisticStatus
  const clearOptimisticStatus = onDisplayStatusChange
    ? () => onDisplayStatusChange(workout.status)
    : internalOptimistic.clearOptimisticStatus

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useLayoutEffect(() => {
    if (!menuOpen || layout !== 'picker') {
      setMenuPos(null)
      return
    }
    function updatePos() {
      const trigger = pickerTriggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 4
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const openUp = spaceBelow < 110
      setMenuPos({
        right: Math.max(8, window.innerWidth - rect.right),
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [menuOpen, layout])

  if (!athleteHasQuickLogActions(workout, isCoach)) return null

  const isCompleted = status === WorkoutStatus.COMPLETED
  const isSkipped = status === WorkoutStatus.SKIPPED
  const isLogged = isCompleted || isSkipped
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
    setMenuOpen(false)
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

  if (layout === 'picker') {
    const statusKind = workoutStatusKindFromStatus(status)

    return (
      <div
        className={cn(
          'relative flex shrink-0 flex-col items-end gap-0.5',
          isPending && 'opacity-60',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={pickerTriggerRef}
          type="button"
          disabled={isPending}
          aria-label={
            isCompleted
              ? 'Completed — change status'
              : isSkipped
                ? 'Skipped — change status'
                : 'Mark workout completed or skipped'
          }
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            buttonClass,
            isCompleted
              ? 'text-success'
              : isSkipped
                ? 'text-destructive'
                : 'text-muted-foreground/50 hover:text-foreground',
          )}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setMenuOpen((open) => !open)
          }}
        >
          <WorkoutStatusIcon
            kind={statusKind}
            active={isLogged}
            className={cn(iconClass, !isLogged && 'text-inherit')}
            aria-hidden
          />
        </button>

        {menuOpen && menuPos && portalReady
          ? createPortal(
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[280] cursor-default"
                  aria-label="Close status menu"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                  }}
                />
                <div
                  role="menu"
                  aria-label="Workout status"
                  className="fixed z-[290] min-w-[8.5rem] overflow-hidden rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] py-1 shadow-[var(--tt-shadow)]"
                  style={{
                    top: menuPos.top,
                    right: menuPos.right,
                    bottom: menuPos.bottom,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isPending}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                      isCompleted
                        ? 'text-success'
                        : 'text-[var(--tt-ink,#111)]',
                    )}
                    onClick={handleComplete}
                  >
                    <WorkoutStatusIcon
                      kind="completed"
                      active={isCompleted}
                      className={workoutQuickActionIconClass('xs')}
                      aria-hidden
                    />
                    {isCompleted ? 'Undo complete' : 'Complete'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isPending}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                      isSkipped
                        ? 'text-destructive'
                        : 'text-[var(--tt-ink,#111)]',
                    )}
                    onClick={handleSkip}
                  >
                    <WorkoutStatusIcon
                      kind="skipped"
                      active={isSkipped}
                      className={workoutQuickActionIconClass('xs')}
                      aria-hidden
                    />
                    {isSkipped ? 'Undo skip' : 'Skip'}
                  </button>
                </div>
              </>,
              document.body,
            )
          : null}

        {actionError ? (
          <p role="alert" className="text-[10px] leading-tight text-destructive">
            {actionError}
          </p>
        ) : null}
      </div>
    )
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
      <div
        className={cn(
          'flex shrink-0',
          layout === 'below' ? 'flex-col items-center gap-0' : 'items-center gap-0.5',
        )}
      >
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
