'use client'

import { Clock, Route } from 'lucide-react'
import type { CSSProperties } from 'react'
import { StravaWordmark } from '@/components/plan/strava-mark'
import { WorkoutStatusIcon } from '@/components/ui/workout-status-icon'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import { SportIcon } from './mock-ui'
import { sportRailColor } from './prescription-workout-card'
import type { WeekCardSize } from './training-toolbar'
import type { TrainingSport, TrainingWorkout } from './training-mock-data'

const SPORT_BG: Record<TrainingSport, string> = {
  run: 'var(--tt-sport-run-bg)',
  bike: 'var(--tt-sport-bike-bg)',
  swim: 'var(--tt-sport-swim-bg)',
  strength: 'var(--tt-sport-strength-bg)',
  recovery: 'var(--tt-sport-recovery-bg)',
}

function MockStructureSketch({
  bars,
  done,
  skipped,
  colorMode,
}: {
  bars: NonNullable<TrainingWorkout['structureBars']>
  done?: boolean
  skipped?: boolean
  colorMode: PlanColorMode
}) {
  const fill =
    colorMode === 'completion' && done
      ? 'var(--tt-good)'
      : 'var(--tt-ink-faint)'

  return (
    <div className="mt-2 h-3 w-full" role="img" aria-label="Workout structure">
      <div className="flex h-full w-full items-end gap-px overflow-hidden">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="min-w-px shrink-0 rounded-t-[1px]"
            style={{
              flexGrow: bar.weight,
              flexBasis: 0,
              height: `${Math.max(18, Math.round(bar.intensity * 100))}%`,
              background: fill,
              opacity: skipped ? 0.35 : done && colorMode === 'completion' ? 0.55 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function weekBlockChrome(
  workout: TrainingWorkout,
  colorMode: PlanColorMode,
): {
  rail: string
  surface: string
  titleClass: string
  captionDone: string
  bg?: string
  borderColor?: string
} {
  const done = workout.status === 'done'
  const skipped = workout.status === 'skipped'
  const sportRail = sportRailColor(workout.sport)

  if (colorMode === 'sport') {
    return {
      rail: sportRail,
      surface: 'border shadow-[0_1px_2px_rgb(0_0_0_/0.045)]',
      bg: SPORT_BG[workout.sport],
      borderColor: sportRail,
      titleClass: skipped
        ? '!text-[var(--tt-ink-faint)] line-through'
        : workout.race
          ? '!text-[var(--tt-red)]'
          : '',
      captionDone: '',
    }
  }

  if (colorMode === 'white') {
    return {
      rail: sportRail,
      surface:
        'border-[var(--tt-line-strong)] bg-white shadow-[0_1px_2px_rgb(0_0_0_/0.045)]',
      titleClass: skipped
        ? '!text-[var(--tt-ink-faint)] line-through'
        : workout.race
          ? '!text-[var(--tt-red)]'
          : '',
      captionDone: '',
    }
  }

  // completion
  return {
    rail: done ? 'var(--tt-good)' : skipped ? 'var(--tt-ink-faint)' : sportRail,
    surface: done
      ? 'border-[rgb(26_159_92/0.28)] bg-[var(--tt-good-soft)] shadow-[0_1px_2px_rgb(0_0_0_/0.045)]'
      : 'border-[var(--tt-line-strong)] bg-white shadow-[0_1px_2px_rgb(0_0_0_/0.045)]',
    titleClass: done
      ? '!text-[var(--tt-good)]'
      : skipped
        ? '!text-[var(--tt-ink-faint)] line-through'
        : workout.race
          ? '!text-[var(--tt-red)]'
          : '',
    captionDone: done ? '!text-[var(--tt-good)]/75' : '',
  }
}

/** Quiet week card — prescription-first; respects Color / Plain / Completion. */
export function WeekWorkoutBlock({
  workout,
  size = 'm',
}: {
  workout: TrainingWorkout
  size?: WeekCardSize
}) {
  const colorMode = useOptionalPlanSportFilter()?.colorMode ?? 'completion'
  const done = workout.status === 'done'
  const skipped = workout.status === 'skipped'
  const chrome = weekBlockChrome(workout, colorMode)
  const metric = done
    ? workout.actualMetric ?? workout.prescriptionMetric
    : workout.prescriptionMetric
  const duration = done ? workout.actualSecondary : workout.estimatedDuration

  const showPrescription = size !== 's'
  const showMeta = size === 'l'
  const showStructure = size === 'l' && Boolean(workout.structureBars?.length)
  const pad = size === 'l' ? 'px-2.5 py-2 pl-3' : size === 'm' ? 'px-2 py-1.5 pl-2.5' : 'px-1.5 py-1.5 pl-2'

  return (
    <div
      className={`relative overflow-hidden rounded-[6px] border text-left ${pad} ${chrome.surface} ${
        skipped ? 'opacity-55' : ''
      }`}
      style={
        {
          '--tt-week-rail': chrome.rail,
          ...(chrome.bg ? { background: chrome.bg } : null),
          ...(chrome.borderColor
            ? {
                borderColor: `color-mix(in srgb, ${chrome.borderColor} 32%, transparent)`,
              }
            : null),
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ background: chrome.rail }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-1">
        <p
          className={`tt-mock-h3 min-w-0 flex-1 !font-medium !leading-snug ${
            size === 'l' ? '!text-[0.8125rem]' : '!text-[0.75rem]'
          } ${chrome.titleClass}`}
        >
          {workout.race ? `⚑ ${workout.title}` : workout.title}
        </p>
        {done && workout.strava ? (
          <span
            className="mt-0.5 inline-flex shrink-0 items-center text-[var(--tt-ink-faint)]"
            title="Synced from Strava"
            aria-label="Synced from Strava"
          >
            <StravaWordmark className="h-2 w-auto" />
          </span>
        ) : (
          <WorkoutStatusIcon
            kind={done ? 'completed' : skipped ? 'skipped' : 'planned'}
            size="xs"
            className="mt-0.5 shrink-0"
            title={done ? 'Completed' : skipped ? 'Skipped' : 'Planned'}
          />
        )}
      </div>

      {showPrescription && workout.prescription ? (
        <p className={`tt-mock-caption mt-0.5 line-clamp-2 !text-[11px] ${chrome.captionDone}`}>
          {workout.prescription}
        </p>
      ) : null}

      {(metric || (showMeta && duration)) && (
        <p
          className={`tt-mock-caption mt-1.5 tabular-nums !text-[var(--tt-ink-soft)] ${
            colorMode === 'completion' && done ? '!text-[var(--tt-good)]/90' : ''
          }`}
        >
          <span className="font-medium text-[var(--tt-ink)]">{metric}</span>
          {showMeta && duration ? (
            <span className="text-[var(--tt-ink-faint)]"> · {duration}</span>
          ) : null}
        </p>
      )}

      {showStructure && workout.structureBars ? (
        <MockStructureSketch
          bars={workout.structureBars}
          done={done}
          skipped={skipped}
          colorMode={colorMode}
        />
      ) : null}
    </div>
  )
}

export function WeekSportLabel({
  name,
  color,
  sport,
  weekDistancePlanned,
  weekDistanceActual,
  weekDurationPlanned,
  weekDurationActual,
}: {
  name: string
  color: string
  sport: TrainingSport
  weekDistancePlanned: string | null
  weekDistanceActual: string | null
  weekDurationPlanned: string
  weekDurationActual: string | null
}) {
  const showDistance = Boolean(weekDistancePlanned || weekDistanceActual)

  return (
    <div
      className="relative flex h-full min-w-0 flex-col justify-start gap-1 px-2 py-2"
      style={{ background: SPORT_BG[sport] }}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color }}
        aria-hidden
      />
      <div className="flex min-w-0 items-center gap-1 pl-0.5">
        <SportIcon sport={sport} className="h-3.5 w-3.5 shrink-0" color={color} />
        <p className="tt-mock-h3 truncate !text-[0.75rem] !font-semibold" style={{ color }}>
          {name}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 pl-0.5 text-muted-foreground">
        {showDistance ? (
          <StatLine
            icon={Route}
            actual={weekDistanceActual}
            planned={weekDistancePlanned}
          />
        ) : null}
        <StatLine
          icon={Clock}
          actual={weekDurationActual}
          planned={weekDurationPlanned}
        />
      </div>
    </div>
  )
}

function StatLine({
  icon: Icon,
  actual,
  planned,
}: {
  icon: typeof Clock
  actual: string | null
  planned: string | null
}) {
  if (!actual && !planned) return null

  return (
    <div className="flex min-w-0 items-center gap-1 text-[9px] leading-none tabular-nums">
      <Icon className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
      {actual && planned ? (
        <span className="min-w-0 truncate whitespace-nowrap" title={`${actual} / ${planned}`}>
          <span className="font-semibold text-foreground">{actual}</span>
          <span className="opacity-50"> / </span>
          <span className="font-normal">{planned}</span>
        </span>
      ) : (
        <span
          className={`min-w-0 truncate whitespace-nowrap ${
            actual ? 'font-semibold text-foreground' : ''
          }`}
        >
          {actual ?? planned}
        </span>
      )}
    </div>
  )
}
