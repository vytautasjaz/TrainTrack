'use client'

import { useState, type DragEvent } from 'react'
import { Clock, Mountain } from 'lucide-react'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import {
  WorkoutActualSparkline,
  workoutHasActualSparkline,
} from '@/components/plan/workout-actual-sparkline'
import {
  WorkoutCardDiagram,
  workoutHasCardDiagram,
} from '@/components/plan/workout-card-diagram'
import { WorkoutCardCoachNote } from '@/components/plan/workout-card-coach-note'
import { WorkoutCardEssenceLine } from '@/components/plan/workout-card-essence-line'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { useSessionLoadThresholds } from '@/components/plan/session-load-thresholds-context'
import { DayLabel } from '@/components/ui/typography'
import {
  useSwimDistanceUnit,
  useUnitSystem,
} from '@/components/units/units-context'
import { v2 } from '@/lib/design-tokens'
import {
  canDragPlanWorkout,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import {
  getWorkoutCardEssence,
  getWorkoutCardHero,
  getWorkoutCardTss,
  isWorkoutCardCompleted,
} from '@/lib/workout-card'
import { DEFAULT_DURATION_NOTATION } from '@/lib/workout-builder/duration-notation'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { cn } from '@/lib/utils'
import {
  isHikeLike,
  tagToneForWorkout,
} from '@/components/dashboard/v2/home-week-utils'

function DayLabelLine({
  label,
  isToday = false,
}: {
  label: string
  isToday?: boolean
}) {
  return (
    <DayLabel
      className={cn(
        'mb-1.5',
        isToday
          ? 'text-[var(--tt-v2-accent)]'
          : 'text-[var(--tt-v2-light-ink-faint)]',
      )}
    >
      {label}
    </DayLabel>
  )
}

export function HomeWeekRestCard({
  note,
  dayLabel,
  isToday = false,
  density = 'week',
}: {
  note: string
  dayLabel?: string
  isToday?: boolean
  density?: 'week' | 'list'
}) {
  const isList = density === 'list'

  return (
    <div
      className={cn(
        v2.surfaces.dayCard,
        'tt-v2-day-card--recovery',
        isList ? 'p-3.5' : 'p-2',
      )}
    >
      {dayLabel ? <DayLabelLine label={dayLabel} isToday={isToday} /> : null}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-black/5 text-[var(--tt-v2-light-ink-faint)]',
            isList ? 'h-9 w-9' : 'h-5 w-5',
          )}
        >
          <Clock
            className={isList ? 'h-4 w-4' : 'h-3 w-3'}
            strokeWidth={1.75}
          />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              isList
                ? 'text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em] text-[var(--tt-v2-light-ink)]'
                : 'text-[13px] font-semibold leading-snug',
            )}
          >
            Rest
          </p>
          <p
            className={cn(
              'line-clamp-2 leading-snug text-[var(--tt-v2-light-ink-soft)]',
              isList ? 'mt-1 text-[13px]' : 'mt-1 text-[12px]',
            )}
          >
            {note}
          </p>
        </div>
      </div>
    </div>
  )
}

export function HomeWeekSessionCard({
  workout,
  stackDragging = false,
  density = 'week',
  dayLabel,
  isToday = false,
}: {
  workout: PlanWorkoutDetail
  stackDragging?: boolean
  /** `list` = mobile stacked cards (style-guide card hierarchy). */
  density?: 'week' | 'list'
  dayLabel?: string
  isToday?: boolean
}) {
  const dnd = usePlanWeekDnd()
  const unitSystem = useUnitSystem()
  const swimUnit = useSwimDistanceUnit()
  const loadThresholds = useSessionLoadThresholds()
  const [isDragging, setIsDragging] = useState(false)
  const tone = tagToneForWorkout(workout)
  const metrics = getWorkoutPlanMetrics(
    workout,
    workout.status,
    unitSystem,
    swimUnit,
  )
  const hero = getWorkoutCardHero(workout, workout.status)
  const tss = getWorkoutCardTss(workout, workout.status, loadThresholds)
  const essence = !workout.isRace
    ? getWorkoutCardEssence(workout, DEFAULT_DURATION_NOTATION, {
        includeAllBlocks: false,
      }).slice(0, 2)
    : []
  const completed = isWorkoutCardCompleted(workout.status)
  const tssLabel = tss?.actual ? `${tss.actual} TSS` : null
  const metricLine = [
    metrics.distance,
    metrics.duration,
    completed ? tssLabel : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const showActualSpark =
    completed &&
    !workout.isRescheduleGhost &&
    workoutHasActualSparkline(workout)
  const showDiagram =
    !showActualSpark &&
    workoutHasCardDiagram(workout) &&
    !workout.isRescheduleGhost
  const hike = isHikeLike(workout)
  const canDrag = Boolean(
    dnd && canDragPlanWorkout(workout) && !workout.isRace,
  )
  const dragging = isDragging || stackDragging
  const isList = density === 'list'

  const ink = completed
    ? 'text-[var(--tt-good,#16a34a)]'
    : 'text-[var(--tt-v2-light-ink)]'
  const inkSoft = completed
    ? 'text-[var(--tt-good,#16a34a)]/75'
    : 'text-[var(--tt-v2-light-ink-soft)]'
  const inkFaint = completed
    ? 'text-[var(--tt-good,#16a34a)]/60'
    : 'text-[var(--tt-v2-light-ink-faint)]'

  const iconClass = cn(
    'shrink-0 rounded-[var(--radius-sm)]',
    isList ? 'h-9 w-9' : 'h-5 w-5',
    completed && '!bg-transparent !text-[var(--tt-good,#16a34a)]',
    hike && !completed && '!bg-transparent !text-[var(--color-sport-recovery)]',
  )

  const dragHandlers = {
    draggable: canDrag,
    onDragStart: (e: DragEvent) => {
      if (!dnd || !canDrag) return
      setIsDragging(true)
      dnd.setDragWorkout({
        id: workout.id,
        sport: workout.type,
        dateKey: workout.dateKey,
        isRace: false,
      })
      e.dataTransfer.effectAllowed = 'copyMove'
      e.dataTransfer.setData('text/plain', workout.id)
    },
    onDragEnd: () => {
      setIsDragging(false)
      dnd?.setDragWorkout(null)
    },
  }

  /* —— Mobile / list: style-guide card hierarchy —— */
  if (isList) {
    const primaryMetric = hero
      ? {
          value: hero.value,
          unit: hero.unit,
          detail: hero.plannedValue
            ? `/ ${hero.plannedValue}${hero.plannedUnit ? ` ${hero.plannedUnit}` : ''}`
            : null,
        }
      : metrics.distance
        ? { value: metrics.distance, unit: null, detail: metrics.duration }
        : metrics.duration
          ? { value: metrics.duration, unit: null, detail: null }
          : null

    const completedStatParts = completed
      ? [metrics.distance, metrics.duration, tssLabel].filter(Boolean)
      : []

    return (
      <WorkoutModalTrigger
        workout={workout}
        isCoach={false}
        title={
          canDrag
            ? `${workout.title} — drag to reorder or reschedule`
            : undefined
        }
        {...dragHandlers}
        className={cn(
          v2.surfaces.dayCard,
          `tt-v2-day-card--${tone}`,
          completed && 'tt-v2-day-card--completed',
          'block w-full p-3.5 text-left',
          dragging && 'opacity-40',
        )}
      >
        {dayLabel ? <DayLabelLine label={dayLabel} isToday={isToday} /> : null}

        <div className="flex items-start gap-3">
          {hike ? (
            <span
              className={cn(
                'inline-flex items-center justify-center',
                iconClass,
              )}
              title="Hike"
              aria-hidden
            >
              <Mountain className="h-4 w-4" strokeWidth={2} />
            </span>
          ) : (
            <WorkoutSportIcon
              type={workout.type}
              isRace={workout.isRace}
              size="sm"
              className={iconClass}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  'tt-v2-day-card__title min-w-0 flex-1 line-clamp-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em]',
                  ink,
                )}
              >
                {workout.title}
              </p>
              <StravaSyncedIndicator
                workout={workout}
                variant="wordmark"
                size="xs"
                className="mt-0.5 shrink-0"
              />
            </div>

            {workout.selfLogged ? (
              <div className="mt-1">
                <SelfAddedBadge className="self-start" />
              </div>
            ) : null}

            {completed && completedStatParts.length > 0 ? (
              <p
                className={cn(
                  'mt-1.5 text-[13px] font-medium tabular-nums leading-snug',
                  inkSoft,
                )}
              >
                {completedStatParts.join(' · ')}
              </p>
            ) : primaryMetric ? (
              <p className={cn('mt-1.5 leading-none', ink)}>
                <span className="text-[1.375rem] font-semibold tabular-nums tracking-tight">
                  {primaryMetric.value}
                </span>
                {primaryMetric.unit ? (
                  <span
                    className={cn(
                      'ml-1 text-[13px] font-medium',
                      inkSoft,
                    )}
                  >
                    {primaryMetric.unit}
                  </span>
                ) : null}
                {primaryMetric.detail ? (
                  <span className={cn('ml-1.5 text-[13px] font-normal', inkFaint)}>
                    {primaryMetric.detail}
                  </span>
                ) : null}
              </p>
            ) : null}

            {essence.length > 0 ? (
              <div className="mt-2 flex min-w-0 flex-col gap-0.5 text-[13px] leading-snug">
                {essence.map((line, index) => (
                  <WorkoutCardEssenceLine
                    key={`${index}-${line}`}
                    line={line}
                    coreClassName={inkSoft}
                    detailClassName={inkFaint}
                  />
                ))}
              </div>
            ) : null}

            <WorkoutCardCoachNote note={workout.coachNotes} />

            {showActualSpark ? (
              <div className="mt-3">
                <WorkoutActualSparkline workout={workout} />
              </div>
            ) : showDiagram ? (
              <div className="mt-3">
                <WorkoutCardDiagram
                  workout={workout}
                  completed={completed}
                  density="week"
                  tone={completed ? 'completed' : 'sport'}
                />
              </div>
            ) : null}
          </div>
        </div>
      </WorkoutModalTrigger>
    )
  }

  /* —— Desktop week cell: compact —— */
  return (
    <WorkoutModalTrigger
      workout={workout}
      isCoach={false}
      title={
        canDrag
          ? `${workout.title} — drag to reorder or reschedule`
          : undefined
      }
      {...dragHandlers}
      className={cn(
        v2.surfaces.dayCard,
        `tt-v2-day-card--${tone}`,
        completed && 'tt-v2-day-card--completed',
        'block w-full p-2 text-left',
        dragging && 'opacity-40',
      )}
    >
      {dayLabel ? <DayLabelLine label={dayLabel} isToday={isToday} /> : null}
      <div className="flex items-start gap-1.5">
        {hike ? (
          <span
            className={cn(
              'inline-flex items-center justify-center',
              iconClass,
            )}
            title="Hike"
            aria-hidden
          >
            <Mountain className="h-3 w-3" strokeWidth={2} />
          </span>
        ) : (
          <WorkoutSportIcon
            type={workout.type}
            isRace={workout.isRace}
            size="sm"
            className={iconClass}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p
              className={cn(
                'tt-v2-day-card__title min-w-0 flex-1 line-clamp-2 text-[13px] font-semibold leading-snug',
                ink,
              )}
            >
              {workout.title}
            </p>
            <StravaSyncedIndicator
              workout={workout}
              variant="wordmark"
              size="xs"
              className="mt-0.5 shrink-0"
            />
          </div>

          {workout.selfLogged ? (
            <div className="mt-0.5">
              <SelfAddedBadge className="self-start" />
            </div>
          ) : null}

          {essence.length > 0 ? (
            <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-[11px] leading-snug">
              {essence.map((line, index) => (
                <WorkoutCardEssenceLine
                  key={`${index}-${line}`}
                  line={line}
                  coreClassName={ink}
                  detailClassName={inkSoft}
                />
              ))}
            </div>
          ) : null}

          <WorkoutCardCoachNote note={workout.coachNotes} compact />

          {showActualSpark ? (
            <div className="mt-2.5">
              <WorkoutActualSparkline workout={workout} />
            </div>
          ) : showDiagram ? (
            <div className="mt-2.5">
              <WorkoutCardDiagram
                workout={workout}
                completed={completed}
                density="week"
                tone={completed ? 'completed' : 'sport'}
              />
            </div>
          ) : null}

          {metricLine ? (
            <p className={cn('mt-1 text-[11px] tabular-nums leading-snug', inkFaint)}>
              {metricLine}
            </p>
          ) : null}
        </div>
      </div>
    </WorkoutModalTrigger>
  )
}
