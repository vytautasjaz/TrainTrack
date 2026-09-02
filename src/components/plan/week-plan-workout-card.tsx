'use client'

import type { CSSProperties, ReactNode } from 'react'
import { WorkoutStatus } from '@prisma/client'
import {
  WorkoutCardDiagram,
  workoutHasCardDiagram,
} from '@/components/plan/workout-card-diagram'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import {
  getRescheduleBadgeLabel,
  RescheduleBadge,
} from '@/components/plan/reschedule-badge'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutChatIndicator } from '@/components/plan/workout-chat-indicator'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { WorkoutInlineFeedback } from '@/components/plan/workout-inline-feedback'
import { useOptionalWeekCardSize } from '@/components/plan/week-card-size-context'
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
import { isStravaSynced, workoutHasCoachingChat, type PlanWorkoutDetail } from '@/lib/plan-workout'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import type { WeekCardSize } from '@/lib/week-card-size'
import { WORKOUT_TYPE_CALENDAR_SURFACE } from '@/lib/workout-display'
import { surfaces } from '@/lib/design-tokens'
import { workoutStatusToBlockStatus } from '@/components/workout-block/types'
import { cn } from '@/lib/utils'

type WeekPlanWorkoutCardProps = {
  workout: PlanWorkoutDetail
  status?: WorkoutStatus
  className?: string
  actions?: ReactNode
  footer?: ReactNode
  /** Kept for callers that overlay interactive Done/Skip — hide the static status icon. */
  hideCompletedBadge?: boolean
  size?: WeekCardSize
  isCoach?: boolean
  onOpenWorkout?: () => void
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

function weekCardSecondary(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
): { actual: string; planned?: string } | null {
  return getWorkoutCardDuration(workout, status)
}

/**
 * Quiet week-grid card — S/M/L density.
 * Completion / skipped chrome + type colors match design mock.
 */
export function WeekPlanWorkoutCard({
  workout,
  status = workout.status,
  className,
  actions,
  footer,
  hideCompletedBadge = false,
  size: sizeProp,
  isCoach = false,
  onOpenWorkout,
}: WeekPlanWorkoutCardProps) {
  const colorMode =
    useOptionalPlanSportFilter()?.colorMode ?? ('completion' as PlanColorMode)
  const ctxSize = useOptionalWeekCardSize()?.cardSize
  const size: WeekCardSize = sizeProp ?? ctxSize ?? 'm'

  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const stravaSynced = isStravaSynced(workout)
  const subtitle = getWorkoutCardSubtitle(workout)
  const hero = getWorkoutCardHero(workout, status)
  const secondary = weekCardSecondary(workout, status)
  const showLoggedMetrics = !completed || workoutHasLoggedActuals(workout)
  const metricPrimary =
    showLoggedMetrics && hero ? formatHeroPrimary(hero) : null
  const metricPlanned =
    showLoggedMetrics && hero ? formatHeroPlanned(hero) : null
  const showSubtitle = size !== 's'
  /** M + L: secondary metric only when coach enabled visibility on card. */
  const showSecondary = (size === 'm' || size === 'l') && Boolean(secondary)
  const showStructure =
    size === 'l' && workoutHasCardDiagram(workout) && !workout.isRescheduleGhost

  const pad =
    size === 'l'
      ? 'px-2.5 py-2 pl-3'
      : size === 'm'
        ? 'px-2 py-1.5 pl-2.5'
        : 'px-1.5 py-1.5 pl-2'

  const titleSize = size === 'l' ? 'text-[0.8125rem]' : 'text-[0.75rem]'

  const completionPercent =
    colorMode === 'completion' && completed && !workout.isRace
      ? (getWorkoutCompletionPercent(workout, status) ?? 100)
      : null
  const completionStyle =
    completionPercent != null
      ? ({
          '--tt-completion': `${Math.min(100, Math.max(0, completionPercent))}%`,
        } as CSSProperties)
      : undefined

  const statusTrailing = stravaSynced ? (
    <StravaSyncedIndicator workout={workout} variant="wordmark" size="xs" />
  ) : null

  const chatIndicator =
    !actions && workoutHasCoachingChat(workout) ? (
      <WorkoutChatIndicator
        workout={workout}
        role={isCoach ? 'coach' : 'athlete'}
      />
    ) : null

  const titleTrailing =
    chatIndicator || statusTrailing || actions ? (
      <div className="mt-0.5 flex shrink-0 items-center gap-0.5 self-start">
        {chatIndicator}
        {statusTrailing}
        {actions}
      </div>
    ) : null

  const hasReschedule = Boolean(getRescheduleBadgeLabel(workout)) && !footer
  const belowTitle =
    workout.selfLogged || hasReschedule ? (
      <div className="mt-0.5 flex flex-col items-start gap-0.5">
        {workout.selfLogged ? <SelfAddedBadge className="self-start" /> : null}
        {hasReschedule ? <RescheduleBadge workout={workout} /> : null}
      </div>
    ) : null

  const completionChrome = colorMode === 'completion'
  // Mock: title green when done; faint + strike when skipped.
  const titleClass = cn(
    'min-w-0 flex-1 font-medium leading-snug text-[var(--tt-ink,#111)]',
    titleSize,
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)] line-through',
  )

  const subtitleClass = cn(
    'mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]',
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]/75',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )

  // Mock metrics: primary = dark ink; secondary / planned after slash = faint grey.
  const metricPrimaryClass =
    'font-medium tabular-nums text-[var(--tt-ink,#111)]'
  const metricFaintClass = 'tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]'

  const blockStatus = workoutStatusToBlockStatus(status)
  // Mock skipped = white card (not pink); completed = green soft in completion mode.
  const blockSurface =
    colorMode === 'sport' || colorMode === 'white'
      ? surfaces.workoutBlock
      : skipped
        ? cn(surfaces.workoutBlock, surfaces.workoutBlockPlanned)
        : cn(
            surfaces.workoutBlock,
            blockStatus === 'completed'
              ? surfaces.workoutBlockCompleted
              : surfaces.workoutBlockPlanned,
          )

  const content = (
    <>
      <div className="flex items-start justify-between gap-1">
        <p className={titleClass}>{workout.title}</p>
        {titleTrailing}
      </div>
      {belowTitle}
      {showSubtitle && subtitle ? (
        <p className={subtitleClass}>{subtitle}</p>
      ) : null}
      {metricPrimary || (showSecondary && showLoggedMetrics) ? (
        <div
          className={cn(
            'mt-1.5 flex flex-col gap-0.5 text-[11px] tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]',
            size === 's' && 'mt-0.5',
          )}
        >
          {metricPrimary ? (
            <p className="min-w-0 truncate">
              <span className={metricPrimaryClass}>{metricPrimary}</span>
              {metricPlanned ? (
                <span className={metricFaintClass}>
                  {'\u00a0/\u00a0'}
                  {metricPlanned}
                </span>
              ) : null}
            </p>
          ) : null}
          {showSecondary && showLoggedMetrics && secondary ? (
            <p className="min-w-0 truncate">
              <span
                className={
                  metricPrimary ? metricFaintClass : metricPrimaryClass
                }
              >
                {secondary.actual}
              </span>
              {secondary.planned ? (
                <span className={metricFaintClass}>
                  {'\u00a0/\u00a0'}
                  {secondary.planned}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
      {showStructure ? (
        <div className={cn('mt-2', skipped && 'opacity-40')}>
          <WorkoutCardDiagram
            workout={workout}
            completed={completed}
            skipped={skipped}
            density="week"
            tone={
              skipped || colorMode !== 'completion' || !completed
                ? 'muted'
                : 'completed'
            }
          />
        </div>
      ) : null}
    </>
  )

  const feedbackSectionPad =
    size === 'l'
      ? 'px-2.5 pl-3'
      : size === 'm'
        ? 'px-2 pl-2.5'
        : 'px-1.5 pl-2'
  const feedbackSectionBleed =
    size === 'l' ? '-mx-2.5' : size === 'm' ? '-mx-2' : '-mx-1.5'
  const feedbackSectionBottomBleed =
    size === 'l' ? '-mb-2 pb-2' : '-mb-1.5 pb-1.5'

  const feedbackSection = (
    <WorkoutInlineFeedback
      workout={workout}
      isCoach={isCoach}
      weekView
      compact={size === 's'}
      onOpenWorkout={onOpenWorkout}
      className={cn(
        feedbackSectionBleed,
        footer ? pad : feedbackSectionPad,
        !footer && feedbackSectionBottomBleed,
      )}
    />
  )

  const block = (
    <div
      className={cn(
        blockSurface,
        'tt-week-plan-card relative w-full min-w-0 overflow-hidden border text-left',
        pad,
        footer && 'flex flex-col p-0',
        skipped && 'tt-week-plan-card-skipped opacity-55',
        workout.isRescheduleGhost && 'tt-workout-block-ghost',
        className,
      )}
      data-density={size}
      data-card-size={size}
      data-ghost={workout.isRescheduleGhost ? 'true' : undefined}
      data-status={
        workout.isRescheduleGhost ? 'ghost' : workoutStatusToBlockStatus(status)
      }
      data-completion={
        completionPercent != null ? Math.min(100, completionPercent) : undefined
      }
      style={completionStyle}
    >
      {footer ? (
        <>
          <div
            className={cn(
              pad,
              workout.isRescheduleGhost && 'tt-workout-block-ghost-body',
            )}
          >
            {content}
          </div>
          {feedbackSection}
          {footer}
        </>
      ) : (
        <>
          {content}
          {feedbackSection}
        </>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        WORKOUT_TYPE_CALENDAR_SURFACE[workout.type],
        colorMode === 'white' && 'tt-calendar-card-white',
        colorMode === 'completion' && 'tt-calendar-card-completion',
      )}
    >
      {block}
    </div>
  )
}
