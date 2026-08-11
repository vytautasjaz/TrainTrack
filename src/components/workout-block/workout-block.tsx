'use client'

import type { ReactNode } from 'react'
import { WorkoutStatus } from '@prisma/client'
import { Clock, Flag } from 'lucide-react'
import { WorkoutCardDiagram } from '@/components/plan/workout-card-diagram'
import { PlanWorkoutCardInlineEdit } from '@/components/plan/plan-workout-card-inline-edit'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutStatusIcon } from '@/components/ui/workout-status-icon'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { surfaces } from '@/lib/design-tokens'
import { RACE_PRIORITY_BLOCK } from '@/lib/race-day'
import { isStravaSynced, type PlanWorkoutDetail } from '@/lib/plan-workout'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
} from '@/lib/workout-card'
import {
  WORKOUT_TYPE_CALENDAR_SURFACE,
  WORKOUT_TYPE_ICONS,
} from '@/lib/workout-display'
import { cn } from '@/lib/utils'
import {
  densityToDiagramSize,
  shouldShowFingerprint,
  workoutStatusToBlockStatus,
  type WorkoutBlockDensity,
} from '@/components/workout-block/types'

export type { WorkoutBlockDensity } from '@/components/workout-block/types'

type WorkoutBlockProps = {
  workout: PlanWorkoutDetail
  density?: WorkoutBlockDensity
  status?: WorkoutStatus
  className?: string
  actions?: ReactNode
  hideCompletedBadge?: boolean
  /** Coach inline edit for title / distance / duration (week/list densities). */
  editable?: boolean
  /** Override shared training filter color mode when set. */
  colorMode?: PlanColorMode
}

const DENSITY = {
  xs: {
    pad: 'px-2 py-1.5',
    title: 'text-[11px] font-semibold leading-snug text-foreground',
    subtitle: 'text-[9px] leading-snug',
    hero: 'text-[14px] font-bold leading-none tracking-tight text-foreground',
    unit: 'text-[10px] font-medium leading-none text-foreground',
    planned: 'text-[10px] font-medium leading-none text-tt-muted',
    secondary: 'text-[10px] font-medium',
    clock: 'h-2.5 w-2.5',
    gap: 'gap-0.5',
    showSubtitle: false,
    showSecondary: false,
    showFingerprint: false,
    showSportIcon: true,
  },
  sm: {
    pad: 'p-2',
    title: 'text-[12px] font-semibold leading-snug text-foreground',
    subtitle: 'text-[10px] leading-snug',
    hero: 'text-[18px] font-bold leading-none tracking-tight text-foreground',
    unit: 'text-[11px] font-medium leading-none text-foreground',
    planned: 'text-[11px] font-medium leading-none text-tt-muted',
    secondary: 'text-[10px] font-medium',
    clock: 'h-2.5 w-2.5',
    gap: 'gap-1',
    showSubtitle: true,
    showSecondary: false,
    showFingerprint: true,
    showSportIcon: false,
  },
  md: {
    pad: 'p-2',
    title: 'text-[13px] font-semibold leading-snug text-foreground',
    subtitle: 'text-[11px] leading-snug',
    hero: 'text-[22px] font-bold leading-none tracking-tight text-foreground',
    unit: 'text-[12px] font-medium leading-none text-foreground',
    planned: 'text-[12px] font-medium leading-none text-tt-muted',
    secondary: 'text-[11px] font-medium',
    clock: 'h-3 w-3',
    gap: 'gap-1',
    showSubtitle: true,
    showSecondary: true,
    showFingerprint: true,
    showSportIcon: false,
  },
  lg: {
    pad: 'p-3',
    title: 'text-[15px] font-semibold leading-snug text-foreground',
    subtitle: 'text-[13px] leading-snug',
    hero: 'text-[32px] font-bold leading-none tracking-tight text-foreground',
    unit: 'text-[16px] font-medium leading-none text-foreground',
    planned: 'text-[14px] font-medium leading-none text-tt-muted',
    secondary: 'text-[13px] font-medium',
    clock: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
    showSubtitle: true,
    showSecondary: true,
    showFingerprint: true,
    showSportIcon: true,
  },
} as const

function blockSurfaceClass(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
  colorMode: PlanColorMode,
) {
  if (workout.isRace) {
    const priority = workout.racePriority ?? 'C'
    return cn(surfaces.workoutBlock, RACE_PRIORITY_BLOCK[priority])
  }
  if (colorMode === 'sport' || colorMode === 'white') {
    return surfaces.workoutBlock
  }
  const kind = workoutStatusToBlockStatus(status)
  return cn(
    surfaces.workoutBlock,
    kind === 'completed'
      ? surfaces.workoutBlockCompleted
      : kind === 'skipped'
        ? surfaces.workoutBlockSkipped
        : surfaces.workoutBlockPlanned,
  )
}

/**
 * Single Workout Block — Design System v3 / Workout Block Spec v7.
 * Calendar densities (xs–md) use radius 0; lg may sit in dashboard/list contexts.
 */
export function WorkoutBlock({
  workout,
  density = 'md',
  status = workout.status,
  className,
  actions,
  hideCompletedBadge = false,
  editable = false,
  colorMode: colorModeProp,
}: WorkoutBlockProps) {
  const filterColorMode = useOptionalPlanSportFilter()?.colorMode
  const colorMode = colorModeProp ?? filterColorMode ?? 'completion'
  const styles = DENSITY[density]
  const completed = !workout.isRace && isWorkoutCardCompleted(status)
  const skipped = !workout.isRace && isWorkoutCardSkipped(status)
  const subtitle = styles.showSubtitle ? getWorkoutCardSubtitle(workout) : null
  const hero = getWorkoutCardHero(workout, status)
  const secondary = styles.showSecondary
    ? getWorkoutCardDuration(workout, status)
    : null
  const showCompletedBadge =
    completed && !hideCompletedBadge && colorMode === 'completion'
  const SportIcon = workout.isRace ? Flag : WORKOUT_TYPE_ICONS[workout.type]
  const stravaSynced = isStravaSynced(workout)
  const showFingerprint =
    styles.showFingerprint && shouldShowFingerprint(workout)
  const canInlineEdit =
    editable &&
    !workout.isRace &&
    !completed &&
    !skipped &&
    (density === 'md' || density === 'lg')

  // Always keep Strava when synced; completion check only in Completion mode.
  const completedStatus = stravaSynced ? (
    <StravaSyncedIndicator
      workout={workout}
      variant="wordmark"
      size={density === 'lg' ? 'sm' : 'xs'}
    />
  ) : showCompletedBadge ? (
    <WorkoutStatusIcon kind="completed" size="xs" aria-label="Completed" />
  ) : null

  // Title-row only — keeps metrics full-width while title truncates before logo/menu.
  const titleTrailing =
    completedStatus || actions ? (
      <div className="flex shrink-0 items-center gap-0.5 self-start">
        {completedStatus}
        {actions}
      </div>
    ) : null

  const fingerprint = showFingerprint ? (
    <div className={density === 'lg' ? 'mt-1.5' : 'mt-1'}>
      <WorkoutCardDiagram
        workout={workout}
        completed={completed}
        skipped={skipped}
        density={densityToDiagramSize(density)}
      />
    </div>
  ) : null

  const metricPrimary = hero ? (
    <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
      {hero.approximate ? (
        <span className={cn('font-medium text-muted-foreground', styles.unit)}>
          ~
        </span>
      ) : null}
      <span className={cn('tabular-nums', styles.hero)}>{hero.value}</span>
      {hero.unit ? (
        <span className={styles.unit}>
          {'\u00a0'}
          {hero.unit}
        </span>
      ) : null}
      {hero.plannedValue ? (
        <span className={cn('tabular-nums', styles.planned)}>
          {'\u00a0/\u00a0'}
          {hero.plannedValue}
          {hero.plannedUnit ? `\u00a0${hero.plannedUnit}` : ''}
        </span>
      ) : null}
    </div>
  ) : null

  const metricSecondary = secondary ? (
    <div
      className={cn(
        'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
        styles.secondary,
      )}
    >
      {hero?.kind === 'distance' ? (
        <Clock
          className={cn(
            styles.clock,
            'mr-1 inline-block shrink-0 align-[-0.1em] text-muted-foreground',
          )}
          aria-hidden
          strokeWidth={1.75}
        />
      ) : null}
      <span className="font-semibold text-foreground">{secondary.actual}</span>
      {secondary.planned ? (
        <span className="text-tt-muted">
          {'\u00a0/\u00a0'}
          {secondary.planned}
        </span>
      ) : null}
    </div>
  ) : null

  const textBlock = canInlineEdit ? (
    <div className="flex min-w-0 flex-1 flex-col">
      <PlanWorkoutCardInlineEdit
        workout={workout}
        titleClassName={styles.title}
        heroClassName={styles.hero}
        unitClassName={styles.unit}
        durationClassName={styles.secondary}
        clockClassName={styles.clock}
        heroPadClassName={subtitle ? 'pt-0.5' : null}
        showSubtitle={styles.showSubtitle}
        showDuration={styles.showSecondary}
        subtitle={subtitle}
        subtitleClassName={styles.subtitle}
        gapClassName={styles.gap}
        titleActions={titleTrailing}
      />
      {fingerprint}
    </div>
  ) : (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        subtitle ? styles.gap : 'gap-0',
      )}
    >
      <div className="flex min-w-0 items-start gap-1">
        <p className={cn('min-w-0 flex-1 truncate', styles.title)}>
          {workout.isRace ? (
            <span className="inline-flex max-w-full items-center gap-1">
              <Flag
                className={cn(
                  'h-3 w-3 shrink-0 fill-current/30',
                  workout.racePriority === 'A' && 'text-red-600 dark:text-red-400',
                  workout.racePriority === 'B' && 'text-blue-600 dark:text-blue-400',
                  (workout.racePriority === 'C' || !workout.racePriority) &&
                    'text-emerald-600 dark:text-emerald-400',
                )}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0 truncate">{workout.title}</span>
            </span>
          ) : (
            workout.title
          )}
        </p>
        {titleTrailing}
      </div>

      {subtitle ? (
        <p className={cn('truncate text-muted-foreground', styles.subtitle)}>
          {subtitle}
        </p>
      ) : null}

      {metricPrimary ? (
        <div className={cn(subtitle ? 'pt-0.5' : null)}>{metricPrimary}</div>
      ) : null}

      {metricSecondary}

      {fingerprint}
    </div>
  )

  const block = (
    <div
      className={cn(
        blockSurfaceClass(workout, status, colorMode),
        styles.pad,
        styles.showSportIcon
          ? 'flex flex-row items-start gap-2'
          : 'flex flex-col',
        className,
      )}
      data-density={density}
      data-status={
        workout.isRace
          ? `race-${workout.racePriority ?? 'C'}`
          : workoutStatusToBlockStatus(status)
      }
    >
      {styles.showSportIcon ? (
        <>
          <span
            className={cn(
              'mt-0.5 flex shrink-0 items-center justify-center',
              density === 'lg' ? 'h-6 w-6' : 'h-4 w-4',
              completed && colorMode === 'completion' && 'text-success',
              skipped && colorMode === 'completion' && 'text-tt-muted',
              !(completed && colorMode === 'completion') &&
                !(skipped && colorMode === 'completion') &&
                'text-muted-foreground',
            )}
            aria-hidden
          >
            <SportIcon
              className={density === 'lg' ? 'h-4 w-4' : 'h-3 w-3'}
              strokeWidth={1.75}
            />
          </span>
          {textBlock}
        </>
      ) : (
        textBlock
      )}
    </div>
  )

  if (workout.isRace) {
    return block
  }

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
