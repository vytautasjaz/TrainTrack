'use client'

import { useState, type CSSProperties } from 'react'
import { Calendar, Flag } from 'lucide-react'
import { WorkoutStatus } from '@prisma/client'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
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
  workoutCoachingChatUnread,
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
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { WorkoutInlineFeedback } from '@/components/plan/workout-inline-feedback'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import { SESSION_TYPE_LABELS } from '@/lib/workout-builder/types'
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

/** Session type label for the DETAILS column (e.g. "Easy Run", "Threshold"). */
function detailsLabel(workout: PlanWorkoutDetail): string | null {
  const st = workout.sessionType
  if (!st || st === 'CUSTOM') return null
  return SESSION_TYPE_LABELS[st as keyof typeof SESSION_TYPE_LABELS] ?? null
}

function compactSessionLabel(label: string): string {
  return label
    .replace(/\s+run$/i, '')
    .replace(/\s+workout$/i, '')
    .trim()
}

/** Compact workout type label used when no session type is set. */
function typeLabel(workout: PlanWorkoutDetail): string {
  return WORKOUT_TYPE_LABELS[workout.type] ?? workout.type
}

type ListMetricCell = {
  planned: string | null
  completed: string | null
}

/** Planned on top, completed below (when both exist). */
function listMetricCell(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
  hero: WorkoutCardHero | null,
  secondary: ReturnType<typeof listSecondaryMetric>,
): ListMetricCell | null {
  const hasCompleted =
    status === WorkoutStatus.COMPLETED && workoutHasLoggedActuals(workout)

  if (hasCompleted) {
    let completed: string | null = null
    let planned: string | null = null
    if (hero) {
      completed = formatHeroPrimary(hero)
      planned = formatHeroPlanned(hero)
    } else if (secondary) {
      completed = secondary.actual
      planned = secondary.planned ?? null
    }
    if (!completed && !planned) return null
    return { planned, completed }
  }

  if (hero) return { planned: formatHeroPrimary(hero), completed: null }
  if (secondary) return { planned: secondary.actual, completed: null }
  return null
}

type TrainingListWorkoutRowProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  onOpen: () => void
  /** Dashboard Home: stacked day rows with sport left edge. */
  appearance?: 'default' | 'dashboard'
  /**
   * Hide the bottom border — for the very last row in the whole table (desktop)
   * or the last row inside a day card. On mobile the border is always shown
   * to separate day blocks (since there is no outer wrapper border).
   */
  last?: boolean
  /** Selected in list detail panel. */
  selected?: boolean
  /** Today’s day strip — keep rose wash, no gray selected fill. */
  isToday?: boolean
}

/** Compact list-view workout row (Training → List) — matches design mock agenda. */
export function TrainingListWorkoutRow({
  workout,
  isCoach,
  onOpen,
  appearance = 'default',
  last = false,
  selected = false,
  isToday = false,
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
  const showCompletionRail = completed && !isRace
  const railTrack = showCompletionRail
    ? '#d8f0e0'
    : 'var(--tt-line,#ebebeb)'
  const railFill = showCompletionRail
    ? 'var(--tt-good, #1a9f5c)'
    : sportRail
  const hero = getWorkoutCardHero(workout, status)
  const secondary = listSecondaryMetric(workout, status)
  const prescription = !completed ? listPrescriptionLine(workout, status) : null
  const SportIcon = isRace ? Flag : WORKOUT_TYPE_ICONS[workout.type]
  const iconColor =
    completionChrome && completed
      ? 'var(--tt-good, #1a9f5c)'
      : completionChrome && skipped
        ? 'var(--tt-ink-faint, #9a9a9a)'
        : sportRail

  // Left subtitle under title: compact session label (e.g. "Easy", "Threshold")
  const detailsRaw = detailsLabel(workout)
  const subtitle = detailsRaw ? compactSessionLabel(detailsRaw) : typeLabel(workout)
  // DETAILS column: type / intensity family
  const detailPrimary = typeLabel(workout)

  // DURATION/DISTANCE column — planned above, completed below
  const metricCell = listMetricCell(workout, status, hero, secondary)

  const rowBackground = (() => {
    if (colorMode === 'sport' && !skipped) {
      return `color-mix(in srgb, ${sportRail} ${selected ? 16 : 7}%, white)`
    }
    // Today already has a day-content wash — don't stack a second rose fill.
    if (selected && isToday) {
      return undefined
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
        !last && 'border-b border-[var(--tt-line,#ebebeb)]',
        completionChrome && completed && !selected &&
          'bg-[color-mix(in_srgb,var(--tt-good,#1a9f5c)_6%,var(--color-card,#fff))]',
        skipped && 'opacity-60',
        workout.isRescheduleGhost && 'tt-list-workout-row-ghost',
        canDrag && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
        selected &&
          !isToday &&
          'bg-[color-mix(in_srgb,var(--tt-ink,#111)_4%,var(--color-card,#fff))]',
      )}
      style={rowBackground ? { background: rowBackground } as CSSProperties : undefined}
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
      {/* 3px sport/completion rail — only the workout body, not the full row */}
      <div
        className="absolute top-2 bottom-2 left-0 w-[3px] overflow-hidden rounded-full"
        style={{ background: railTrack }}
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{ height: showCompletionRail ? `${pct}%` : '100%', background: railFill }}
        />
      </div>

      {/* Main row body */}
      <div
        className={cn(
          'flex w-full items-start gap-2 py-3.5 pl-[calc(0.75rem+3px)] pr-2.5',
          'lg:gap-4',
          workout.isRescheduleGhost && showReview && 'tt-list-workout-row-ghost-body',
        )}
      >
        {/* Sport icon — races: filled accent + white glyph; chat = corner dot */}
        <div
          className={cn(
            'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]',
            isRace
              ? 'border-transparent'
              : 'border border-[var(--tt-line,#ebebeb)] bg-white',
          )}
          style={isRace ? { background: sportRail } : undefined}
        >
          <SportIcon
            className="h-[16px] w-[16px] shrink-0"
            strokeWidth={2}
            style={{ color: isRace ? '#fff' : iconColor }}
            aria-hidden
          />
          {workoutHasCoachingChat(workout) ? (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-white',
                workoutCoachingChatUnread(workout, isCoach ? 'coach' : 'athlete')
                  ? 'bg-[var(--tt-red,#da2f36)]'
                  : 'bg-[var(--tt-ink-soft,#6b6b6b)]',
              )}
              aria-label="Workout has a chat thread"
            />
          ) : null}
        </div>

        {/* WORKOUT / TITLE — desktop fixed width matches header */}
        <div className="min-w-0 flex-1 lg:w-[20rem] lg:flex-none">
          <p
            className={cn(
              'line-clamp-2 break-words text-[13.5px] font-semibold leading-snug text-[var(--tt-ink,#111)]',
              completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
              skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
            )}
          >
            {isRace ? `⚑ ${workout.title}` : workout.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {workout.selfLogged ? <SelfAddedBadge /> : null}
            {showReview ? null : <RescheduleBadge workout={workout} />}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-normal text-[var(--tt-ink-soft,#6b6b6b)]">
            {subtitle}
          </p>
        </div>

        {/* DETAILS — desktop centered on column axis */}
        <div className="hidden w-[5.5rem] shrink-0 -ml-2 text-center lg:block">
          <p className="truncate text-center text-[12px] font-normal text-[var(--tt-ink,#111)]">
            {detailPrimary}
          </p>
          {prescription ? (
            <p className="mt-0.5 truncate text-center text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
              {prescription}
            </p>
          ) : null}
        </div>

        {/* DUR / DIST — mobile right, desktop centered on column axis */}
        <div className="w-[4.25rem] shrink-0 pt-0.5 text-right lg:w-[4.5rem] lg:text-center">
          {metricCell ? (
            <div className="flex flex-col items-end gap-0.5 leading-tight lg:items-center">
              {metricCell.planned && metricCell.completed ? (
                <>
                  <p className="truncate text-[12px] font-normal tabular-nums text-[var(--tt-good,#1a9f5c)]">
                    {metricCell.completed}
                  </p>
                  <p className="truncate text-[11px] font-normal tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                    {metricCell.planned}
                  </p>
                </>
              ) : metricCell.completed ? (
                <p className="truncate text-[12px] font-normal tabular-nums text-[var(--tt-good,#1a9f5c)]">
                  {metricCell.completed}
                </p>
              ) : metricCell.planned ? (
                <p className="truncate text-[12px] font-normal tabular-nums text-[var(--tt-ink,#111)]">
                  {metricCell.planned}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">—</p>
          )}
        </div>

        {/* STATUS — desktop centered on column axis (right side) */}
        <div
          className="flex min-w-8 shrink-0 items-start justify-end pt-0.5 lg:ml-auto lg:w-[4.75rem] lg:items-center lg:justify-center lg:pt-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {showQuickActions ? (
            <>
              <AthleteWorkoutQuickActions
                workout={workout}
                isCoach={isCoach}
                size="xs"
                layout="picker"
                className="lg:hidden"
                displayStatus={status}
                onDisplayStatusChange={setOptimisticStatus}
              />
              <AthleteWorkoutQuickActions
                workout={workout}
                isCoach={isCoach}
                size="sm"
                layout="inline"
                className="hidden justify-center lg:flex"
                displayStatus={status}
                onDisplayStatusChange={setOptimisticStatus}
              />
            </>
          ) : stravaSynced ? (
            <StravaSyncedIndicator workout={workout} variant="wordmark" size="xs" />
          ) : showCoachActions ? (
            <div className="opacity-60 transition group-hover/card:opacity-100">
              <PlanWorkoutActionsMenu workout={workout} compact />
            </div>
          ) : null}
        </div>
      </div>

      {/* Feedback strip */}
      <WorkoutInlineFeedback
        workout={workout}
        isCoach={isCoach}
        listView
        onOpenWorkout={onOpen}
        className="border-t border-[var(--tt-line,#ebebeb)] pl-[calc(0.75rem+3px)] pr-3.5 pb-2.5 pt-2"
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
  const completionPercent =
    completed && !isRace
      ? (getWorkoutCompletionPercent(workout, status) ?? 100)
      : null
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
