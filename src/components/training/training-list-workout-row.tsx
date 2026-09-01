'use client'

import { useState, type CSSProperties } from 'react'
import { Flag } from 'lucide-react'
import { WorkoutStatus } from '@prisma/client'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutChatIndicator } from '@/components/plan/workout-chat-indicator'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
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
import {
  athleteHasQuickLogActions,
  canDragPlanWorkout,
  isStravaSynced,
  workoutHasCoachingChat,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  getWorkoutCompletionPercent,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
  workoutHasLoggedActuals,
  type WorkoutCardHero,
} from '@/lib/workout-card'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { WorkoutInlineFeedback } from '@/components/plan/workout-inline-feedback'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import { cn } from '@/lib/utils'

function sportRailVar(type: PlanWorkoutDetail['type']): string {
  switch (type) {
    case 'BIKE':
      return 'var(--color-sport-bike)'
    case 'SWIM':
      return 'var(--color-sport-swim)'
    case 'STRENGTH':
    case 'RECOVERY':
      return 'var(--color-sport-strength)'
    case 'HYROX':
      return 'var(--color-sport-hyrox)'
    case 'TRIATHLON':
      return 'var(--color-sport-tri)'
    case 'REST':
      return 'var(--color-sport-rest)'
    default:
      return 'var(--color-sport-run)'
  }
}

function formatHeroPrimary(hero: WorkoutCardHero): string {
  return `${hero.approximate ? '~ ' : ''}${hero.value}${
    hero.unit ? ` ${hero.unit}` : ''
  }`
}

function formatHeroPlanned(hero: WorkoutCardHero): string | null {
  if (!hero.plannedValue) return null
  return `${hero.plannedValue}${hero.plannedUnit ? ` ${hero.plannedUnit}` : ''}`
}

function listSecondaryMetric(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
): { actual: string; planned?: string } | null {
  return getWorkoutCardDuration(workout, status)
}

function listPrescriptionLine(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
): string | null {
  const subtitle = getWorkoutCardSubtitle(workout)
  if (subtitle) return subtitle
  const metrics = getWorkoutPlanMetrics(workout, status)
  return metrics.distance ?? metrics.duration
}

type TrainingListWorkoutRowProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  onOpen: () => void
  /** Dashboard Home: stacked day rows with sport left edge. */
  appearance?: 'default' | 'dashboard'
  /** Last row in a day card — hide bottom border. */
  last?: boolean
  /** Selected in list detail panel. */
  selected?: boolean
}

/** Compact list-view workout row (Training → List) — matches design mock agenda. */
export function TrainingListWorkoutRow({
  workout,
  isCoach,
  onOpen,
  appearance = 'default',
  last = false,
  selected = false,
}: TrainingListWorkoutRowProps) {
  const dnd = usePlanWeekDnd()
  const [dragging, setDragging] = useState(false)
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const colorMode: PlanColorMode =
    useOptionalPlanSportFilter()?.colorMode ?? 'completion'
  const completionChrome = colorMode === 'completion'
  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const isRace = Boolean(workout.isRace)
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const showCoachActions = isCoach && !isRace
  const showReview = isCoach && needsCoachRescheduleReview(workout)
  const canDrag = Boolean(dnd) && canDragPlanWorkout(workout, status)
  const stravaSynced = isStravaSynced(workout)
  const isDashboard = appearance === 'dashboard'

  if (isDashboard) {
    return (
      <DashboardListRow
        workout={workout}
        isCoach={isCoach}
        onOpen={onOpen}
        status={status}
        setOptimisticStatus={setOptimisticStatus}
        completed={completed}
        skipped={skipped}
        isRace={isRace}
        showQuickActions={showQuickActions}
        showReview={showReview}
        canDrag={canDrag}
        dragging={dragging}
        setDragging={setDragging}
        stravaSynced={stravaSynced}
      />
    )
  }

  const pct = Math.min(
    100,
    Math.max(
      0,
      getWorkoutCompletionPercent(workout, status) ?? (completed ? 100 : 0),
    ),
  )
  const sportRail = sportRailVar(workout.type)
  // Side rail stays sport-colored in every view mode (incl. Completion / Plain).
  const rail = sportRail
  const hero = getWorkoutCardHero(workout, status)
  const secondary = listSecondaryMetric(workout, status)
  const showCompletedMetrics =
    completed && workoutHasLoggedActuals(workout) && Boolean(hero || secondary)
  const prescription = !completed
    ? listPrescriptionLine(workout, status)
    : null
  const SportIcon = isRace ? Flag : WORKOUT_TYPE_ICONS[workout.type]
  const iconColor =
    completionChrome && completed
      ? 'var(--tt-good, #1a9f5c)'
      : completionChrome && skipped
        ? 'var(--tt-ink-faint, #9a9a9a)'
        : sportRail

  const metricInk = 'font-normal tabular-nums text-[var(--tt-ink,#111)]'
  const metricFaint = 'font-normal tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]'

  // Color mode: sport wash (deeper when selected).
  // Plain / Completion: white or completion green; selected = grey wash only.
  const rowBackground = (() => {
    if (colorMode === 'sport' && !skipped) {
      return `color-mix(in srgb, ${sportRail} ${selected ? 16 : 7}%, white)`
    }
    if (selected) {
      return 'color-mix(in srgb, var(--tt-ink, #111) 5%, var(--color-card, #fff))'
    }
    return undefined
  })()

  return (
    <div
      role="button"
      tabIndex={0}
      data-status={
        isRace
          ? undefined
          : skipped
            ? 'skipped'
            : completed
              ? 'completed'
              : 'planned'
      }
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'group/card relative flex w-full cursor-pointer flex-col overflow-hidden text-left transition',
        'px-3.5 py-3.5 pl-4',
        !last &&
          (completionChrome && completed
            ? 'border-b border-[color-mix(in_srgb,var(--tt-good,#1a9f5c)_28%,var(--tt-line,#ebebeb))]'
            : 'border-b border-[var(--tt-line,#ebebeb)]'),
        completionChrome &&
          completed &&
          !selected &&
          'bg-[color-mix(in_srgb,var(--tt-good,#1a9f5c)_8%,var(--color-card,#fff))]',
        skipped && 'opacity-60',
        workout.isRescheduleGhost && 'tt-list-workout-row-ghost',
        canDrag && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
      style={
        {
          ...(rowBackground ? { background: rowBackground } : null),
          ...(selected
            ? {
                boxShadow:
                  colorMode === 'sport'
                    ? `inset 0 0 0 1.5px color-mix(in srgb, ${sportRail} 42%, white)`
                    : 'inset 0 0 0 1.5px var(--tt-line-strong, #ddd)',
              }
            : null),
        } as CSSProperties
      }
      aria-current={selected ? 'true' : undefined}
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
        className="absolute inset-y-0 left-0 w-[3px] bg-[var(--tt-line,#ebebeb)]"
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: completed ? `${pct}%` : '100%',
            background: rail,
          }}
        />
      </div>

      <div
        className={cn(
          'flex w-full items-center gap-3',
          workout.isRescheduleGhost &&
            showReview &&
            'tt-list-workout-row-ghost-body',
        )}
      >
        <SportIcon
          className="h-5 w-5 shrink-0"
          strokeWidth={2}
          style={{ color: iconColor }}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p
              className={cn(
                'truncate text-base font-medium leading-snug text-[var(--tt-ink,#111)]',
                completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
                skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
              )}
            >
              {isRace ? `⚑ ${workout.title}` : workout.title}
            </p>
            {workoutHasCoachingChat(workout) && !showQuickActions ? (
              <WorkoutChatIndicator
                workout={workout}
                role={isCoach ? 'coach' : 'athlete'}
                size="sm"
                className="translate-y-0.5"
              />
            ) : null}
            {workout.selfLogged ? <SelfAddedBadge /> : null}
            {showReview ? null : <RescheduleBadge workout={workout} />}
          </div>
          {showCompletedMetrics ? (
            <p className="mt-1 truncate text-xs leading-snug tracking-[0.004em]">
              {hero ? (
                <>
                  <span className={metricInk}>{formatHeroPrimary(hero)}</span>
                  {formatHeroPlanned(hero) ? (
                    <span className={metricFaint}>
                      {'\u00a0/\u00a0'}
                      {formatHeroPlanned(hero)}
                    </span>
                  ) : null}
                </>
              ) : null}
              {secondary ? (
                <>
                  {hero ? <span className={metricFaint}>{' · '}</span> : null}
                  <span className={hero ? metricFaint : metricInk}>
                    {secondary.actual}
                  </span>
                  {secondary.planned ? (
                    <span className={metricFaint}>
                      {'\u00a0/\u00a0'}
                      {secondary.planned}
                    </span>
                  ) : null}
                </>
              ) : null}
            </p>
          ) : prescription ? (
            <p
              className={cn(
                'mt-1 truncate text-xs leading-snug tracking-[0.004em] text-[var(--tt-ink-soft,#6b6b6b)]',
                skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
              )}
            >
              {prescription}
            </p>
          ) : null}
        </div>

        <div
          className="flex shrink-0 flex-col items-end gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            {showQuickActions ? (
              <AthleteWorkoutQuickActions
                workout={workout}
                isCoach={isCoach}
                size="sm"
                displayStatus={status}
                onDisplayStatusChange={setOptimisticStatus}
              />
            ) : stravaSynced ? (
              <StravaSyncedIndicator workout={workout} variant="wordmark" size="xs" />
            ) : null}
            {showCoachActions ? (
              <div className="opacity-60 transition group-hover/card:opacity-100">
                <PlanWorkoutActionsMenu workout={workout} compact />
              </div>
            ) : null}
          </div>
          {workoutHasCoachingChat(workout) && showQuickActions ? (
            <WorkoutChatIndicator
              workout={workout}
              role={isCoach ? 'coach' : 'athlete'}
              size="sm"
            />
          ) : null}
        </div>
      </div>

      <WorkoutInlineFeedback
        workout={workout}
        isCoach={isCoach}
        listView
        onOpenWorkout={onOpen}
        className="-mx-3.5 -mb-3.5 mt-2.5 px-3.5 pb-3.5 pl-4 pt-2.5"
      />

      {showReview ? (
        <CoachRescheduleReviewActions workout={workout} isCoach={isCoach} />
      ) : null}
    </div>
  )
}

/** Legacy dashboard home row — keep stacked sport-rail language. */
function DashboardListRow({
  workout,
  isCoach,
  onOpen,
  status,
  setOptimisticStatus,
  completed,
  skipped,
  isRace,
  showQuickActions,
  showReview,
  canDrag,
  dragging,
  setDragging,
  stravaSynced,
}: {
  workout: PlanWorkoutDetail
  isCoach: boolean
  onOpen: () => void
  status: WorkoutStatus
  setOptimisticStatus: (s: WorkoutStatus) => void
  completed: boolean
  skipped: boolean
  isRace: boolean
  showQuickActions: boolean
  showReview: boolean
  canDrag: boolean
  dragging: boolean
  setDragging: (v: boolean) => void
  stravaSynced: boolean
}) {
  const dnd = usePlanWeekDnd()
  const metrics = getWorkoutPlanMetrics(workout, status)
  const hero = getWorkoutCardHero(workout, status)
  const subtitle =
    getWorkoutCardSubtitle(workout) ??
    metrics.distance ??
    metrics.duration
  const completionPercent = getWorkoutCompletionPercent(workout, status)
  const completionStyle =
    completionPercent != null
      ? ({
          '--tt-completion': `${Math.min(100, completionPercent)}%`,
        } as CSSProperties)
      : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      data-status={
        isRace
          ? undefined
          : skipped
            ? 'skipped'
            : completed
              ? 'completed'
              : 'planned'
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
        'tt-dashboard-workout-row group/card relative flex w-full cursor-pointer flex-col overflow-hidden text-left transition',
        workout.type === 'BIKE' && '[--tt-row-sport:var(--color-sport-bike)]',
        workout.type === 'SWIM' && '[--tt-row-sport:var(--color-sport-swim)]',
        workout.type === 'STRENGTH' &&
          '[--tt-row-sport:var(--color-sport-strength)]',
        workout.type === 'TRIATHLON' && '[--tt-row-sport:var(--color-sport-tri)]',
        workout.type === 'HYROX' && '[--tt-row-sport:var(--color-sport-hyrox)]',
        (workout.type === 'RUN' ||
          workout.type === 'RECOVERY' ||
          workout.type === 'REST') &&
          '[--tt-row-sport:var(--color-sport-run)]',
        isRace && '[--tt-row-sport:var(--color-sport-race)]',
        workout.isRescheduleGhost && 'tt-list-workout-row-ghost',
        canDrag && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
      data-ghost={workout.isRescheduleGhost ? 'true' : undefined}
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
      <div className="flex w-full items-center gap-3 px-3 py-2.5">
        <WorkoutSportIcon
          type={workout.type}
          isRace={isRace}
          size="sm"
          className={cn(
            'h-[38px] w-[38px] rounded-[10px]',
            skipped &&
              !isRace &&
              'bg-[color-mix(in_srgb,var(--color-tt-skipped-border)_22%,white)] text-[var(--color-tt-skipped-border)]',
            completed &&
              !isRace &&
              'bg-[color-mix(in_srgb,var(--color-tt-completed-border)_18%,white)] text-[var(--color-tt-completed-border)]',
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-snug text-[#111827]">
            {workout.title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12px] font-semibold tabular-nums text-[#111827]">
            {hero
              ? `${hero.value}${hero.unit ? ` ${hero.unit}` : ''}`
              : metrics.distance ?? '—'}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center"
          onClick={(e) => e.stopPropagation()}
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
            <StravaSyncedIndicator
              workout={workout}
              variant="wordmark"
              size="sm"
            />
          ) : null}
        </div>
      </div>
      {showReview ? (
        <CoachRescheduleReviewActions workout={workout} isCoach={isCoach} />
      ) : null}
    </div>
  )
}
