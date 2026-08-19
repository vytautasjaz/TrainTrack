'use client'

import type { ReactNode } from 'react'
import { WorkoutStatus } from '@prisma/client'
import { Clock, Flag } from 'lucide-react'
import { WorkoutCardDiagram, workoutHasCardDiagram } from '@/components/plan/workout-card-diagram'
import { PlanWorkoutCardInlineEdit } from '@/components/plan/plan-workout-card-inline-edit'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutStatusIcon } from '@/components/ui/workout-status-icon'
import { isStravaSynced, type PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
} from '@/lib/workout-card'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

export type PlanWorkoutDataCardDensity = 'week' | 'list' | 'month' | 'micro'

type PlanWorkoutDataCardProps = {
  workout: PlanWorkoutDetail
  density: PlanWorkoutDataCardDensity
  status?: WorkoutStatus
  className?: string
  /** Top-right actions (e.g. delete spacer) — sits beside the completed check. */
  actions?: ReactNode
  /** Hide the static completed badge when an interactive check overlays the card. */
  hideCompletedBadge?: boolean
  /**
   * Coach inline edit for title / distance / duration on plan cards.
   * Not used for library templates (edit those via modal/page only).
   */
  editable?: boolean
}

const DENSITY = {
  week: {
    pad: 'p-1.5',
    title: 'text-[12px] font-semibold leading-snug text-[#111827]',
    subtitle: 'text-[10px] leading-snug',
    hero: 'text-[22px] font-bold leading-none tracking-tight text-[#111827]',
    unit: 'text-[12px] font-medium leading-none text-[#111827]',
    duration: 'text-[11px] font-medium',
    clock: 'h-3 w-3',
    gap: 'gap-1',
    showSubtitle: true,
    showDuration: true,
    showDiagram: true,
    showSportIcon: false,
    heroPad: 'pt-0.5',
  },
  list: {
    pad: 'p-3',
    title: 'text-[15px] font-semibold leading-snug text-[#111827]',
    subtitle: 'text-[13px] leading-snug',
    hero: 'text-[34px] font-bold leading-none tracking-tight text-[#111827]',
    unit: 'text-[18px] font-medium leading-none text-[#111827]',
    duration: 'text-[14px] font-medium',
    clock: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
    showSubtitle: true,
    showDuration: true,
    showDiagram: true,
    showSportIcon: true,
    heroPad: 'pt-1',
  },
  month: {
    pad: 'p-1',
    title: 'text-[11px] font-semibold leading-snug text-[#111827]',
    subtitle: 'text-[9px] leading-snug',
    hero: 'text-[15px] font-bold leading-none tracking-tight text-[#111827]',
    unit: 'text-[10px] font-medium leading-none text-[#111827]',
    duration: 'text-[10px] font-medium',
    clock: 'h-2.5 w-2.5',
    gap: 'gap-0.5',
    showSubtitle: true,
    showDuration: false,
    showDiagram: true,
    showSportIcon: false,
    heroPad: 'pt-0.5',
  },
  /** Ultra-compact for month grid — sport icon + light title/hero. */
  micro: {
    pad: 'px-1.5 py-1',
    title: 'text-[9px] font-medium leading-snug text-[#6B7280]',
    subtitle: 'text-[8px] leading-tight',
    hero: 'text-[12px] font-medium leading-none tracking-tight text-[#374151]',
    unit: 'text-[9px] font-normal leading-none text-[#9CA3AF]',
    duration: 'text-[8px] font-normal',
    clock: 'h-2 w-2',
    gap: 'gap-0.5',
    showSubtitle: false,
    showDuration: false,
    showDiagram: false,
    showSportIcon: true,
    heroPad: 'pt-px',
  },
} as const

export function planWorkoutDataCardSurfaceClass(
  status: WorkoutStatus,
  extra?: string,
) {
  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)

  return cn(
    'w-full min-w-0 rounded-[6px] border text-left shadow-none',
    completed
      ? 'border-[#86D39A] bg-[#F3FAF5]'
      : skipped
        ? 'border-[#F5A3A3] bg-[#FDF2F2]'
        : 'border-[#E5E7EB] bg-card',
    extra,
  )
}

export function PlanWorkoutDataCard({
  workout,
  density,
  status = workout.status,
  className,
  actions,
  hideCompletedBadge = false,
  editable = false,
}: PlanWorkoutDataCardProps) {
  const styles = DENSITY[density]
  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const subtitle = styles.showSubtitle ? getWorkoutCardSubtitle(workout) : null
  const hero = getWorkoutCardHero(workout, status)
  const duration = styles.showDuration
    ? getWorkoutCardDuration(workout, status)
    : null
  const showCompletedBadge = completed && !hideCompletedBadge
  const SportIcon = workout.isRace ? Flag : WORKOUT_TYPE_ICONS[workout.type]
  const stravaSynced = isStravaSynced(workout)
  const canInlineEdit =
    editable &&
    !workout.isRace &&
    !completed &&
    !skipped &&
    (density === 'week' || density === 'list')

  const completedStatus = showCompletedBadge ? (
    stravaSynced ? (
      <StravaSyncedIndicator
        workout={workout}
        variant="wordmark"
        size={density === 'list' ? 'sm' : 'xs'}
      />
    ) : (
      <WorkoutStatusIcon kind="completed" size="xs" aria-label="Completed" />
    )
  ) : null

  const showStructureDiagram =
    styles.showDiagram && workoutHasCardDiagram(workout)

  const textBlock = canInlineEdit ? (
    <div className="flex min-w-0 flex-1 flex-col">
      <PlanWorkoutCardInlineEdit
        workout={workout}
        titleClassName={styles.title}
        heroClassName={styles.hero}
        unitClassName={styles.unit}
        durationClassName={styles.duration}
        clockClassName={styles.clock}
        heroPadClassName={subtitle ? styles.heroPad : null}
        showSubtitle={styles.showSubtitle}
        showDuration={styles.showDuration}
        subtitle={subtitle}
        subtitleClassName={styles.subtitle}
        gapClassName={styles.gap}
        titleActions={
          !styles.showSportIcon ? (
            <div className="flex h-0 shrink-0 items-start gap-0.5 overflow-visible">
              {completedStatus}
              {actions}
            </div>
          ) : null
        }
      />
      {showStructureDiagram ? (
        <div className="mt-1">
          <WorkoutCardDiagram
            workout={workout}
            completed={completed}
            skipped={skipped}
            density={density}
          />
        </div>
      ) : null}
    </div>
  ) : (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        subtitle ? styles.gap : 'gap-0',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-0.5">
        <p className={cn('min-w-0 flex-1 truncate', styles.title)}>{workout.title}</p>
        {!styles.showSportIcon ? (
          <div className="flex h-0 shrink-0 items-start gap-0.5 overflow-visible">
            {completedStatus}
            {actions}
          </div>
        ) : null}
      </div>

      {subtitle ? (
        <p className={cn('truncate text-[#6B7280]', styles.subtitle)}>{subtitle}</p>
      ) : null}

      {hero ? (
        <div
          className={cn(
            'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
            subtitle ? styles.heroPad : null,
          )}
        >
          {hero.approximate ? (
            <span className={cn('font-medium text-[#6B7280]', styles.unit)}>~</span>
          ) : null}
          <span className={cn('tabular-nums', styles.hero)}>{hero.value}</span>
          {hero.unit ? (
            <span className={styles.unit}>
              {'\u00a0'}
              {hero.unit}
            </span>
          ) : null}
          {hero.plannedValue ? (
            <span
              className={cn(
                'tabular-nums font-semibold',
                styles.unit,
                'text-[#9CA3AF]',
              )}
            >
              {'\u00a0/\u00a0'}
              {hero.plannedValue}
              {hero.plannedUnit ? `\u00a0${hero.plannedUnit}` : ''}
            </span>
          ) : null}
        </div>
      ) : null}

      {duration ? (
        <div
          className={cn(
            'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
            styles.duration,
          )}
        >
          {hero?.kind === 'distance' ? (
            <Clock
              className={cn(
                styles.clock,
                'mr-1 inline-block shrink-0 align-[-0.1em] text-[#6B7280]',
              )}
              aria-hidden
            />
          ) : null}
          <span className="font-semibold text-[#111827]">{duration.actual}</span>
          {duration.planned ? (
            <span className="text-[#9CA3AF]">
              {'\u00a0/\u00a0'}
              {duration.planned}
            </span>
          ) : null}
        </div>
      ) : null}

      {showStructureDiagram ? (
        <div className={cn(density === 'month' ? 'mt-0.5' : 'mt-1')}>
          <WorkoutCardDiagram
            workout={workout}
            completed={completed}
            skipped={skipped}
            density={density === 'micro' ? 'month' : density}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      className={cn(
        planWorkoutDataCardSurfaceClass(status),
        styles.pad,
        styles.showSportIcon ? 'flex flex-row items-start gap-1.5' : 'relative flex flex-col',
        styles.showSportIcon && density === 'list' && 'gap-2.5',
        className,
      )}
    >
      {styles.showSportIcon ? (
        <>
          <span
            className={cn(
              'mt-0.5 flex shrink-0 items-center justify-center rounded-[4px]',
              density === 'list' ? 'h-6 w-6' : 'h-4 w-4',
              completed && 'text-[#16a34a]',
              skipped && 'text-[#9CA3AF]',
              !completed && !skipped && 'text-[#6B7280]',
            )}
            aria-hidden
          >
            <SportIcon
              className={density === 'list' ? 'h-4 w-4' : 'h-3 w-3'}
              strokeWidth={1.75}
            />
          </span>
          {textBlock}
          {(showCompletedBadge || actions) && (
            <div className="flex h-0 shrink-0 items-start gap-0.5 overflow-visible">
              {completedStatus}
              {actions}
            </div>
          )}
        </>
      ) : (
        textBlock
      )}
    </div>
  )
}
