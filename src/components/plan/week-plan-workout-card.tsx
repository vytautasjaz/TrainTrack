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
import { WorkoutCardMetricIcon } from '@/components/plan/workout-card-metric-icon'
import { WorkoutCardEssenceLine } from '@/components/plan/workout-card-essence-line'
import { useOptionalWeekCardSize } from '@/components/plan/week-card-size-context'
import {
  getWorkoutCardDuration,
  getWorkoutCardEssence,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  getWorkoutCompletionPercent,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
  workoutHasLoggedActuals,
  type WorkoutCardHero,
} from '@/lib/workout-card'
import { useDurationNotation } from '@/components/workout-builder/duration-notation-context'
import { isStravaSynced, workoutHasCoachingChat, type PlanWorkoutDetail } from '@/lib/plan-workout'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import type { WeekCardSize } from '@/lib/week-card-size'
import { defaultWeekCardSize } from '@/lib/week-card-size'
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
  const durationNotation = useDurationNotation()
  const ctxSize = useOptionalWeekCardSize()?.cardSize
  const size: WeekCardSize = sizeProp ?? ctxSize ?? defaultWeekCardSize()

  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const stravaSynced = isStravaSynced(workout)
  const subtitle = getWorkoutCardSubtitle(workout)
  const hero = getWorkoutCardHero(workout, status)
  const secondary = weekCardSecondary(workout, status)
  const cardEssence = !workout.isRace
    ? getWorkoutCardEssence(workout, durationNotation, {
        includeAllBlocks: size === 'm' || size === 'l',
      })
    : []
  const showLoggedMetrics = !completed || workoutHasLoggedActuals(workout)
  const metricPrimary =
    showLoggedMetrics && hero ? formatHeroPrimary(hero) : null
  const metricPlanned =
    showLoggedMetrics && hero ? formatHeroPlanned(hero) : null
  const showSubtitle = size !== 's'
  const showSecondary = Boolean(secondary) && showLoggedMetrics
  const showEssence = cardEssence.length > 0
  const showStructure =
    size === 'l' && workoutHasCardDiagram(workout) && !workout.isRescheduleGhost

  const distanceMetric =
    hero?.kind === 'distance' && metricPrimary
      ? { value: metricPrimary, planned: metricPlanned }
      : showSecondary && hero?.kind === 'duration' && secondary
        ? { value: secondary.actual, planned: secondary.planned }
        : null
  const durationMetric =
    hero?.kind === 'duration' && metricPrimary
      ? { value: metricPrimary, planned: metricPlanned }
      : showSecondary && hero?.kind === 'distance' && secondary
        ? { value: secondary.actual, planned: secondary.planned }
        : null
  const showMetrics = Boolean(distanceMetric || durationMetric)

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
  // Mock: title green when done; faint when skipped.
  const titleClass = cn(
    'min-w-0 flex-1 font-medium leading-snug text-[var(--tt-ink,#111)]',
    titleSize,
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )

  const subtitleClass = cn(
    'mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]',
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]/75',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )

  const essenceCoreClass = cn(
    'text-[var(--tt-ink,#111)]',
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )
  const essenceDetailClass = cn(
    'text-[var(--tt-ink-soft,#6b6b6b)]',
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]/75',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )

  const metricValueClass = cn(
    'font-medium tabular-nums text-[var(--tt-ink,#111)]',
    completionChrome && completed && 'text-[var(--tt-good,#1a9f5c)]',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )
  const metricFaintClass = cn(
    'tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]',
    skipped && 'text-[var(--tt-ink-faint,#9a9a9a)]',
  )
  const metricIconSize = size === 's' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  function renderMetric(
    kind: 'distance' | 'duration',
    metric: { value: string; planned?: string | null },
  ) {
    return (
      <p className="flex min-w-0 items-center gap-1 truncate">
        <WorkoutCardMetricIcon
          kind={kind}
          className={cn(metricIconSize, metricValueClass)}
        />
        <span className={metricValueClass}>{metric.value}</span>
        {metric.planned ? (
          <span className={metricFaintClass}>
            {'\u00a0/\u00a0'}
            {metric.planned}
          </span>
        ) : null}
      </p>
    )
  }

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
      {showEssence ? (
        <div
          className={cn(
            'mt-1 flex min-w-0 flex-col gap-0.5 leading-snug',
            size === 's' ? 'text-[10px]' : 'text-[11px]',
          )}
        >
          {cardEssence.map((line, index) => (
            <WorkoutCardEssenceLine
              key={`${index}-${line}`}
              line={line}
              coreClassName={essenceCoreClass}
              detailClassName={essenceDetailClass}
            />
          ))}
        </div>
      ) : null}
      {showMetrics ? (
        <div
          className={cn(
            'flex items-center gap-3 text-[11px] tabular-nums',
            showEssence ? 'mt-1.5 border-t border-[var(--tt-line,#ebebeb)] pt-1.5' : 'mt-1.5',
            size === 's' && !showEssence && 'mt-0.5',
          )}
        >
          {distanceMetric ? renderMetric('distance', distanceMetric) : null}
          {durationMetric ? renderMetric('duration', durationMetric) : null}
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
