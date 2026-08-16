'use client'

import { useState, type CSSProperties } from 'react'
import { WorkoutStatusIcon } from '@/components/ui/workout-status-icon'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { WorkoutCardDiagram } from '@/components/plan/workout-card-diagram'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import { RescheduleBadge } from '@/components/plan/reschedule-badge'
import {
  CoachRescheduleReviewActions,
  needsCoachRescheduleReview,
} from '@/components/plan/coach-reschedule-review-actions'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { PlanWorkoutActionsMenu } from '@/components/plan/plan-workout-actions-menu'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import {
  athleteHasQuickLogActions,
  canDragPlanWorkout,
  isStravaSynced,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { getSessionIntensity } from '@/lib/workout-builder/session-intensity'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { RACE_PRIORITY_BLOCK } from '@/lib/race-day'
import { WORKOUT_TYPE_CALENDAR_SURFACE } from '@/lib/workout-display'
import { cn } from '@/lib/utils'
import {
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
  getWorkoutCompletionPercent,
} from '@/lib/workout-card'

function workoutSubtitle(workout: PlanWorkoutDetail): string {
  if (workout.isRace) return workout.description?.trim() || 'Race'
  const sport = WORKOUT_TYPE_LABELS[workout.type]
  const intensity = getSessionIntensity(workout.sessionType)?.label
  if (intensity) return `${sport} · ${intensity}`
  const session = getSessionTypeLabel(workout.sessionType, workout.type)
  if (session.toLowerCase().includes(sport.toLowerCase())) return session
  return `${sport} · ${session}`
}

type TrainingListWorkoutRowProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  onOpen: () => void
  /** Dashboard Home: stacked day rows with sport left edge. */
  appearance?: 'default' | 'dashboard'
}

/** Compact list-view workout row (Training → List). */
export function TrainingListWorkoutRow({
  workout,
  isCoach,
  onOpen,
  appearance = 'default',
}: TrainingListWorkoutRowProps) {
  const dnd = usePlanWeekDnd()
  const [dragging, setDragging] = useState(false)
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const colorMode = useOptionalPlanSportFilter()?.colorMode ?? 'completion'
  const metrics = getWorkoutPlanMetrics(workout, status)
  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const isRace = Boolean(workout.isRace)
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const showCoachActions = isCoach && !isRace
  const showReview = isCoach && needsCoachRescheduleReview(workout)
  const canDrag = Boolean(dnd) && canDragPlanWorkout(workout, status)
  const stravaSynced = isStravaSynced(workout)
  const isDashboard = appearance === 'dashboard'
  const completionPercent =
    isDashboard || colorMode === 'completion'
      ? getWorkoutCompletionPercent(workout, status)
      : null
  const completionStyle =
    completionPercent != null
      ? ({
          '--tt-completion': `${Math.min(100, Math.max(0, completionPercent))}%`,
        } as CSSProperties)
      : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      data-status={
        isRace ? undefined : skipped ? 'skipped' : completed ? 'completed' : 'planned'
      }
      data-completion={
        completionPercent != null ? Math.min(100, completionPercent) : undefined
      }
      style={completionStyle}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'group/card relative flex w-full cursor-pointer flex-col overflow-hidden text-left transition',
        isDashboard
          ? cn(
              'tt-dashboard-workout-row',
              workout.type === 'BIKE' && '[--tt-row-sport:var(--color-sport-bike)]',
              workout.type === 'SWIM' && '[--tt-row-sport:var(--color-sport-swim)]',
              workout.type === 'STRENGTH' && '[--tt-row-sport:var(--color-sport-strength)]',
              workout.type === 'TRIATHLON' && '[--tt-row-sport:var(--color-sport-tri)]',
              workout.type === 'HYROX' && '[--tt-row-sport:var(--color-sport-hyrox)]',
              (workout.type === 'RUN' ||
                workout.type === 'RECOVERY' ||
                workout.type === 'REST') &&
                '[--tt-row-sport:var(--color-sport-run)]',
              isRace && '[--tt-row-sport:var(--color-sport-race)]',
            )
          : cn(
              'rounded-[6px] border',
              isRace
                ? RACE_PRIORITY_BLOCK[workout.racePriority ?? 'C']
                : colorMode === 'sport'
                  ? cn('border', WORKOUT_TYPE_CALENDAR_SURFACE[workout.type])
                  : colorMode === 'white'
                    ? cn(
                        'border border-border/70 bg-card',
                        WORKOUT_TYPE_CALENDAR_SURFACE[workout.type],
                        'tt-calendar-card-white',
                      )
                    : cn(
                        WORKOUT_TYPE_CALENDAR_SURFACE[workout.type],
                        'tt-calendar-card-completion',
                        completed
                          ? 'border-[#86D39A]/70 bg-[#F3FAF5]'
                          : skipped
                            ? 'border-[#F5A3A3]/70 bg-[#FDF2F2]'
                            : 'border-border/70 bg-card',
                      ),
            ),
        workout.isRescheduleGhost && 'tt-list-workout-row-ghost',
        canDrag && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
      data-ghost={workout.isRescheduleGhost ? 'true' : undefined}
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
      <div
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3',
          workout.isRescheduleGhost && showReview && 'tt-list-workout-row-ghost-body',
        )}
      >
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(4.5rem,0.55fr)_auto] sm:gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <WorkoutSportIcon
            type={workout.type}
            isRace={isRace}
            size="sm"
            className={cn(
              isDashboard && 'h-[38px] w-[38px] rounded-[10px]',
              (isDashboard || colorMode === 'completion') &&
                skipped &&
                !isRace &&
                'bg-[color-mix(in_srgb,var(--color-tt-skipped-border)_22%,white)] text-[var(--color-tt-skipped-border)]',
              (isDashboard || colorMode === 'completion') &&
                completed &&
                !isRace &&
                'bg-[color-mix(in_srgb,var(--color-tt-completed-border)_18%,white)] text-[var(--color-tt-completed-border)]',
            )}
          />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 truncate text-[14px] font-semibold leading-snug text-[#111827]">
                {workout.title}
              </p>
              {workout.selfLogged ? <SelfAddedBadge /> : null}
            </div>
            <div className="mt-0.5 flex flex-col items-start gap-0.5">
              {showReview ? null : <RescheduleBadge workout={workout} />}
              <p className="truncate text-[12px] leading-snug text-[#6B7280]">
                {workoutSubtitle(workout)}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 justify-center sm:flex">
          <WorkoutCardDiagram
            workout={workout}
            completed={completed}
            skipped={skipped}
            density="week"
            className="max-w-[7.5rem]"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-end sm:hidden">
            <p className="text-[12px] font-semibold tabular-nums text-[#111827]">
              {metrics.distance ?? '—'}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {metrics.duration ?? '—'}
            </p>
          </div>
          <div className="hidden w-[5.25rem] text-right sm:block">
            <p className="text-[13px] font-semibold tabular-nums text-[#111827]">
              {metrics.distance ?? '—'}
            </p>
          </div>
          <div className="hidden w-[4.75rem] text-right sm:block">
            <p className="text-[13px] font-semibold tabular-nums text-[#111827]">
              {metrics.duration ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {!isDashboard || showCoachActions ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-end gap-0.5',
            showCoachActions
              ? 'w-[5.5rem] sm:w-[6.5rem]'
              : 'w-[4.75rem] sm:w-[5.75rem] sm:justify-center',
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {showQuickActions ? (
            <AthleteWorkoutQuickActions
              workout={workout}
              isCoach={isCoach}
              size="sm"
              displayStatus={status}
              onDisplayStatusChange={setOptimisticStatus}
            />
          ) : stravaSynced ? (
            <StravaSyncedIndicator workout={workout} variant="wordmark" size="sm" />
          ) : (
            <span className="inline-flex rounded-md p-1">
              <WorkoutStatusIcon status={status} size="sm" />
            </span>
          )}
          {showCoachActions ? (
            <div className="opacity-60 transition group-hover/card:opacity-100">
              <PlanWorkoutActionsMenu workout={workout} compact />
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
      {showReview ? (
        <CoachRescheduleReviewActions workout={workout} isCoach={isCoach} />
      ) : null}
    </div>
  )
}
