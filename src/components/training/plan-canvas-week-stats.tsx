'use client'

import type { CSSProperties } from 'react'
import { Clock } from 'lucide-react'
import { WorkoutType, PlannedMetricSource, type WorkoutType as WT } from '@prisma/client'
import type {
  TrainingPlanPhaseDetail,
  TrainingPlanSessionDetail,
} from '@/lib/training-plan'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { WEEK_STATS_SPORT_ICON_COLOR } from '@/lib/week-sport-stats'
import {
  PLAN_INTENSITY_BUCKET_LABEL,
  PLAN_INTENSITY_BUCKETS,
  sessionsIntensityBreakdown,
  totalBreakdownMinutes,
  type PlanIntensityBucket,
  type PlanIntensityBreakdown,
} from '@/lib/training-plan-intensity-breakdown'
import { resolveTrainingPlanSessionMetricsForAthlete } from '@/lib/training-plan-session-metrics'
import { cn, formatDuration } from '@/lib/utils'
import { usePlanCanvasSportMetricPrefs } from '@/hooks/use-plan-canvas-sport-metric-prefs'
import { defaultSportMetricMode } from '@/lib/plan-canvas-stats-metric'

type PlanCanvasWeekStatsProps = {
  planId: string
  weekIndex: number
  sessions: TrainingPlanSessionDetail[]
  /** Phase covering this week, if any. */
  phase?: TrainingPlanPhaseDetail | null
  /** Plan sport focus — drives the primary mileage summary. */
  sportFocus?: WorkoutType | null
  estimationPreferences?: AthletePreferences | null
  /** Collapsed stats column — week/phase + mileage + volume icon. */
  compact?: boolean
  className?: string
  style?: CSSProperties
}

/** Easy / Tempo / Threshold / VO₂ — matches mock green → yellow → orange → red. */
const INTENSITY_SEGMENT_CLASS: Record<PlanIntensityBucket, string> = {
  easy: 'bg-emerald-500',
  tempo: 'bg-amber-400',
  threshold: 'bg-orange-500',
  vo2max: 'bg-[var(--tt-red,#da2f36)]',
}

const SPORT_ICON_WRAP: Partial<Record<WT, string>> = {
  [WorkoutType.RUN]: 'bg-[var(--color-sport-run-bg)] text-[var(--color-sport-run)]',
  [WorkoutType.BIKE]: 'bg-[var(--color-sport-bike-bg)] text-[var(--color-sport-bike)]',
  [WorkoutType.SWIM]: 'bg-[var(--color-sport-swim-bg)] text-[var(--color-sport-swim)]',
  [WorkoutType.STRENGTH]:
    'bg-[var(--color-sport-strength-bg)] text-[var(--color-sport-strength)]',
  [WorkoutType.HYROX]: 'bg-[var(--color-sport-hyrox-bg)] text-[var(--color-sport-hyrox)]',
  [WorkoutType.TRIATHLON]: 'bg-[var(--color-sport-tri-bg)] text-[var(--color-sport-tri)]',
  [WorkoutType.RECOVERY]:
    'bg-[var(--color-sport-recovery-bg)] text-[var(--color-sport-recovery)]',
}

function showsIntensityBreakdown(sport: WT): boolean {
  return sport === WorkoutType.RUN || sport === WorkoutType.BIKE
}

function usesDistanceKm(sport: WT): boolean {
  return (
    sport === WorkoutType.RUN ||
    sport === WorkoutType.BIKE ||
    sport === WorkoutType.HYROX ||
    sport === WorkoutType.TRIATHLON
  )
}

function sessionMetrics(
  s: TrainingPlanSessionDetail,
  preferences?: AthletePreferences | null,
) {
  return resolveTrainingPlanSessionMetricsForAthlete(
    {
      type: s.type,
      sessionType: s.sessionType,
      plannedDistance: s.plannedDistance,
      plannedDuration: s.plannedDuration,
      plannedDistanceMeters: s.plannedDistanceMeters,
      plannedDistanceSource:
        (s.plannedDistanceSource as PlannedMetricSource | null | undefined) ??
        null,
      plannedDurationSource:
        (s.plannedDurationSource as PlannedMetricSource | null | undefined) ??
        null,
      plannedDistanceMetersSource:
        (s.plannedDistanceMetersSource as
          | PlannedMetricSource
          | null
          | undefined) ?? null,
      structure: s.structure,
    },
    preferences,
  )
}

function formatKm(km: number): string {
  if (km <= 0) return ''
  const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10
  return `${rounded} km`
}

function formatMeters(meters: number): string {
  if (meters <= 0) return ''
  return `${Math.round(meters).toLocaleString('en-US')} m`
}

type SportWeekTotals = {
  duration: number
  distanceKm: number
  distanceMeters: number
  count: number
  sessions: TrainingPlanSessionDetail[]
}

/** Primary week metric for a sport — distance or duration by mode. */
function sportMetricText(
  sport: WT,
  totals: SportWeekTotals,
  mode: 'distance' | 'duration',
): string {
  if (mode === 'duration') {
    return totals.duration > 0 ? formatDuration(totals.duration) : '—'
  }
  if (sport === WorkoutType.SWIM) {
    const meters =
      totals.distanceMeters > 0
        ? totals.distanceMeters
        : totals.distanceKm * 1000
    return meters > 0 ? formatMeters(meters) : '—'
  }
  if (usesDistanceKm(sport)) {
    return totals.distanceKm > 0 ? formatKm(totals.distanceKm) : '—'
  }
  return totals.duration > 0 ? formatDuration(totals.duration) : '—'
}

function SportMetricLine({
  sport,
  duration,
  distanceKm,
  distanceMeters,
  count,
}: {
  sport: WT
  duration: number
  distanceKm: number
  distanceMeters: number
  count: number
}) {
  const parts: { text: string; emphasis: 'primary' | 'muted' }[] = []

  if (usesDistanceKm(sport)) {
    if (distanceKm > 0) {
      parts.push({ text: formatKm(distanceKm), emphasis: 'primary' })
    }
    if (duration > 0) {
      parts.push({ text: formatDuration(duration), emphasis: 'primary' })
    }
  } else if (sport === WorkoutType.SWIM) {
    const dist =
      distanceMeters > 0
        ? formatMeters(distanceMeters)
        : distanceKm > 0
          ? formatMeters(distanceKm * 1000)
          : ''
    if (dist) parts.push({ text: dist, emphasis: 'primary' })
    if (duration > 0) {
      parts.push({ text: formatDuration(duration), emphasis: 'primary' })
    }
  } else if (duration > 0) {
    parts.push({ text: formatDuration(duration), emphasis: 'primary' })
  }

  parts.push({ text: `${count} w/o`, emphasis: 'muted' })

  if (parts.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1 text-[10px] tabular-nums">
      {parts.map((part, i) => (
        <span key={`${part.text}-${i}`} className="inline-flex items-baseline gap-x-1">
          {i > 0 ? (
            <span className="font-normal text-muted-foreground/50" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={
              part.emphasis === 'primary'
                ? 'font-semibold text-foreground'
                : 'font-normal text-muted-foreground'
            }
          >
            {part.text}
          </span>
        </span>
      ))}
    </span>
  )
}

function sportSolidBarClass(sport: WT): string {
  switch (sport) {
    case WorkoutType.SWIM:
      return 'bg-[var(--color-sport-swim)]'
    case WorkoutType.STRENGTH:
      return 'bg-[var(--color-sport-strength)]'
    case WorkoutType.HYROX:
      return 'bg-[var(--color-sport-hyrox)]'
    case WorkoutType.TRIATHLON:
      return 'bg-[var(--color-sport-tri)]'
    case WorkoutType.RECOVERY:
      return 'bg-[var(--color-sport-recovery)]'
    case WorkoutType.BIKE:
      return 'bg-[var(--color-sport-bike)]'
    case WorkoutType.RUN:
    default:
      return 'bg-[var(--color-sport-run)]'
  }
}

function IntensityBarAndLegend({
  breakdown,
}: {
  breakdown: PlanIntensityBreakdown
}) {
  const total = totalBreakdownMinutes(breakdown)
  if (total <= 0) {
    return (
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8" />
        <p className="text-[9px] text-muted-foreground">—</p>
      </div>
    )
  }

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-foreground/8">
        {PLAN_INTENSITY_BUCKETS.map((bucket) => {
          const mins = breakdown[bucket]
          if (mins <= 0) return null
          return (
            <div
              key={bucket}
              className={cn('h-full', INTENSITY_SEGMENT_CLASS[bucket])}
              style={{ width: `${(mins / total) * 100}%` }}
              title={`${PLAN_INTENSITY_BUCKET_LABEL[bucket]} ${Math.round((mins / total) * 100)}%`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {PLAN_INTENSITY_BUCKETS.map((bucket) => {
          const mins = breakdown[bucket]
          if (mins <= 0) return null
          const pct = Math.round((mins / total) * 100)
          return (
            <span
              key={bucket}
              className="inline-flex items-center gap-1 text-[9px] tabular-nums text-muted-foreground"
              title={PLAN_INTENSITY_BUCKET_LABEL[bucket]}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  INTENSITY_SEGMENT_CLASS[bucket],
                )}
                aria-hidden
              />
              {pct}%
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SolidSportBar({ sport }: { sport: WT }) {
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
        <div className={cn('h-full w-full rounded-full', sportSolidBarClass(sport))} />
      </div>
      <div className="flex items-center gap-2 text-[9px] tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" aria-hidden />
          —
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', sportSolidBarClass(sport))}
            aria-hidden
          />
          100%
        </span>
      </div>
    </div>
  )
}

export function PlanCanvasWeekStats({
  planId,
  weekIndex,
  sessions,
  phase = null,
  sportFocus = null,
  estimationPreferences = null,
  compact = false,
  className,
  style,
}: PlanCanvasWeekStatsProps) {
  const { modeFor, toggleSport } = usePlanCanvasSportMetricPrefs(planId)
  const bySport = new Map<
    WT,
    {
      duration: number
      distanceKm: number
      distanceMeters: number
      count: number
      sessions: TrainingPlanSessionDetail[]
    }
  >()

  let totalDuration = 0
  for (const s of sessions) {
    const metrics = sessionMetrics(s, estimationPreferences)
    const dur =
      metrics.durationMin != null && metrics.durationMin > 0
        ? metrics.durationMin
        : 0
    const distKm =
      metrics.distanceKm != null && metrics.distanceKm > 0
        ? metrics.distanceKm
        : metrics.distanceMeters != null && metrics.distanceMeters > 0
          ? metrics.distanceMeters / 1000
          : 0
    const meters =
      s.type === WorkoutType.SWIM
        ? metrics.distanceMeters != null && metrics.distanceMeters > 0
          ? metrics.distanceMeters
          : distKm > 0
            ? distKm * 1000
            : 0
        : 0
    totalDuration += dur
    const cur = bySport.get(s.type) ?? {
      duration: 0,
      distanceKm: 0,
      distanceMeters: 0,
      count: 0,
      sessions: [],
    }
    cur.duration += dur
    cur.distanceKm += distKm
    cur.distanceMeters += meters
    cur.count += 1
    cur.sessions.push(s)
    bySport.set(s.type, cur)
  }

  const sports = [...bySport.keys()]
    .filter((s) => s !== WorkoutType.REST)
    .sort((a, b) => {
      if (sportFocus) {
        if (a === sportFocus) return -1
        if (b === sportFocus) return 1
      }
      return a.localeCompare(b)
    })
  const phaseName = phase
    ? displaySeasonPhaseName(phase.phase, phase.label)
    : null

  const mainSport: WT | null =
    sportFocus &&
    sportFocus !== WorkoutType.REST &&
    sportFocus !== WorkoutType.RECOVERY
      ? sportFocus
      : (sports[0] ?? null)

  const mainTotals: SportWeekTotals | null = mainSport
    ? (bySport.get(mainSport) ?? {
        duration: 0,
        distanceKm: 0,
        distanceMeters: 0,
        count: 0,
        sessions: [],
      })
    : null

  const mileageLabel =
    mainSport && mainTotals
      ? sportMetricText(
          mainSport,
          mainTotals,
          defaultSportMetricMode(mainSport),
        )
      : '—'
  const MainSportIcon = mainSport ? WORKOUT_TYPE_ICONS[mainSport] : null
  const volumeLabel =
    totalDuration > 0 ? formatDuration(totalDuration) : '—'

  return (
    <div
      className={cn(
        'flex min-h-[7.5rem] flex-col overflow-hidden bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] transition-[padding,gap] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
        compact ? 'justify-center gap-1 px-1.5 py-2' : 'gap-3 p-2.5',
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          'min-w-0 transition-[gap] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
          compact ? 'space-y-1.5' : 'space-y-3',
        )}
      >
        <span
          className={cn(
            'block font-bold uppercase tracking-wide text-foreground transition-[font-size,text-align] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
            compact ? 'text-center text-[10px]' : 'text-[12px]',
          )}
        >
          {compact ? `W${weekIndex + 1}` : `WEEK ${weekIndex + 1}`}
          {phaseName ? (
            <span
              className={cn(
                'font-semibold text-muted-foreground transition-[font-size] duration-[var(--tt-motion-normal,280ms)]',
                compact
                  ? 'mt-0.5 block truncate text-center text-[9px] leading-tight'
                  : 'text-[10px]',
              )}
              title={phaseName}
            >
              {compact ? phaseName : ` - ${phaseName}`}
            </span>
          ) : null}
        </span>

        {compact ? (
          <div
            className="mx-auto h-px w-[70%] bg-foreground/12"
            aria-hidden
          />
        ) : null}
        {/* Expanded: volume + main-sport mileage */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,margin] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
            compact
              ? 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] bg-foreground/8">
              <div className="flex items-center gap-1.5 bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] px-1.5 py-1.5">
                <Clock
                  className="h-3 w-3 shrink-0 text-muted-foreground"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tabular-nums leading-tight text-foreground">
                    {volumeLabel}
                  </p>
                  <p className="text-[8px] leading-tight text-muted-foreground">
                    Volume
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] px-1.5 py-1.5">
                {MainSportIcon ? (
                  <MainSportIcon
                    className={cn(
                      'h-3 w-3 shrink-0',
                      mainSport
                        ? (WEEK_STATS_SPORT_ICON_COLOR[mainSport] ??
                          'text-muted-foreground')
                        : 'text-muted-foreground',
                    )}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : (
                  <Clock
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tabular-nums leading-tight text-foreground">
                    {mileageLabel}
                  </p>
                  <p className="truncate text-[8px] leading-tight text-muted-foreground">
                    {mainSport ? WORKOUT_TYPE_LABELS[mainSport] : 'Mileage'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact: primary metric per sport in the week */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
            compact
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            {sports.length === 0 ? (
              <p className="text-center text-[10px] text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                {sports.map((sport) => {
                  const totals = bySport.get(sport)!
                  const Icon = WORKOUT_TYPE_ICONS[sport]
                  const mode = modeFor(sport)
                  const metric = sportMetricText(sport, totals, mode)
                  const nextMode =
                    mode === 'distance' ? 'duration' : 'distance'
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className="flex w-full flex-col items-center gap-0.5 rounded-[4px] tabular-nums outline-none transition hover:bg-foreground/[0.04] focus-visible:ring-1 focus-visible:ring-foreground/25"
                      title={`Show ${nextMode} for ${WORKOUT_TYPE_LABELS[sport]} (all weeks)`}
                      aria-label={`${WORKOUT_TYPE_LABELS[sport]} ${metric}. Click to show ${nextMode}`}
                    >
                      <Icon
                        className={cn(
                          'h-3 w-3 shrink-0',
                          WEEK_STATS_SPORT_ICON_COLOR[sport] ??
                            'text-muted-foreground',
                        )}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <span className="w-full px-0.5 text-center text-[10px] font-semibold leading-tight text-foreground">
                        {metric}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 transition-[grid-template-rows,opacity] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
          compact
            ? 'grid-rows-[0fr] opacity-0'
            : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto">
            {sports.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No sessions</p>
            ) : (
              sports.map((sport) => {
                const totals = bySport.get(sport)!
                const Icon = WORKOUT_TYPE_ICONS[sport]
                const breakdown = showsIntensityBreakdown(sport)
                  ? sessionsIntensityBreakdown(totals.sessions)
                  : null

                return (
                  <div
                    key={sport}
                    className="min-w-0 border-t border-foreground/8 pt-2 first:border-t-0 first:pt-0"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]',
                          SPORT_ICON_WRAP[sport] ??
                            'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5',
                            WEEK_STATS_SPORT_ICON_COLOR[sport],
                          )}
                          strokeWidth={2.25}
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline justify-between gap-2">
                          <span className="truncate text-[11px] font-semibold text-foreground">
                            {WORKOUT_TYPE_LABELS[sport]}
                          </span>
                          <SportMetricLine
                            sport={sport}
                            duration={totals.duration}
                            distanceKm={totals.distanceKm}
                            distanceMeters={totals.distanceMeters}
                            count={totals.count}
                          />
                        </div>
                        {breakdown ? (
                          <IntensityBarAndLegend breakdown={breakdown} />
                        ) : (
                          <SolidSportBar sport={sport} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

