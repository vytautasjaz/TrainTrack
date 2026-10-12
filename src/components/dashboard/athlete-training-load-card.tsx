'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, getISOWeek } from 'date-fns'
import {
  addDateOnlyDays,
  parseDateOnly,
  toDateKey,
  todayDateKey,
} from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  daySessionLoadActual,
  daySessionLoadPlanned,
  weekSessionLoadActual,
  weekSessionLoadPlanned,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import { V2WidgetHeader } from '@/components/ui/v2'
import { v2 } from '@/lib/design-tokens'
import {
  WeekCarouselNav,
  WeekCarouselThisWeekButton,
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import { useMorphArray } from '@/components/dashboard/week-nav-morph'
import { cn } from '@/lib/utils'
import {
  DASHBOARD_WEEK_NAV_CENTER,
  DASHBOARD_WEEK_NAV_COUNT,
} from '@/lib/dashboard-week-nav'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const CHART_W = 320
const CHART_H = 72
const CHART_H_COMPACT = 44
const PAD_X = 12
const PAD_Y = 12
const PAD_Y_COMPACT = 8
const WEEK_COUNT = DASHBOARD_WEEK_NAV_COUNT
const CENTER_INDEX = DASHBOARD_WEEK_NAV_CENTER
const OFFSETS = Array.from(
  { length: WEEK_COUNT },
  (_, i) => i - CENTER_INDEX,
) as readonly number[]

const SHELL =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)] md:rounded-[10px] md:p-4'

type LoadMetric = 'tss' | 'time'

type AthleteTrainingLoadCardProps = {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  thresholds?: SessionLoadThresholds
  /** Section title — defaults to “Training load”. */
  title?: string
  /** `v2` = light panel + eyebrow header for athlete home v2. */
  tone?: 'default' | 'v2'
  className?: string
}

type MorphPair = { planned: number[]; actual: number[] }

function weekDateKeys(weekStartKey: string): string[] {
  const start = parseDateOnly(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDateOnlyDays(start, i)))
}

function dayMinutesPlanned(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status === 'SKIPPED') continue
    sum += w.plannedDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

function dayMinutesActual(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status !== 'COMPLETED') continue
    sum += w.result?.actualDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

function toPoints(
  daily: number[],
  yMax: number,
  chartH: number,
  padY: number,
) {
  const innerW = CHART_W - PAD_X * 2
  const innerH = chartH - padY * 2
  const max = Math.max(yMax, 1)
  return daily.map((v, i) => ({
    x: PAD_X + (i / Math.max(1, daily.length - 1)) * innerW,
    y: padY + innerH - (v / max) * innerH,
  }))
}

function smoothPath(
  daily: number[],
  yMax: number,
  chartH: number,
  padY: number,
): string {
  const pts = toPoints(daily, yMax, chartH, padY)
  if (pts.length < 2) return ''

  let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

/** Compact load sparkline — shared by home combined widget. */
export function TrainingLoadChart({
  plannedDaily,
  actualDaily,
  yMax,
  showActual,
  morphFrom,
  compact = false,
}: {
  plannedDaily: number[]
  actualDaily: number[]
  yMax: number
  showActual: boolean
  morphFrom: MorphPair | null
  compact?: boolean
}) {
  const chartH = compact ? CHART_H_COMPACT : CHART_H
  const padY = compact ? PAD_Y_COMPACT : PAD_Y
  const displayPlanned = useMorphArray(plannedDaily, morphFrom?.planned ?? null)
  const displayActual = useMorphArray(actualDaily, morphFrom?.actual ?? null)
  const plannedPath = smoothPath(displayPlanned, yMax, chartH, padY)
  const actualPath = smoothPath(displayActual, yMax, chartH, padY)
  const plannedPoints = toPoints(displayPlanned, yMax, chartH, padY)
  const actualPoints = toPoints(displayActual, yMax, chartH, padY)
  const actualStroke = compact ? 1.15 : 2.1
  const plannedStroke = compact ? 1 : 1.35
  const plannedDot = compact ? 2 : 3
  const actualDot = compact ? 2.5 : 4

  return (
    <div className={cn('w-full', compact ? 'mt-2' : 'mt-4')}>
      <svg
        viewBox={`0 0 ${CHART_W} ${chartH}`}
        className="block h-auto w-full"
        style={{ aspectRatio: `${CHART_W} / ${chartH}` }}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line
          x1={PAD_X}
          x2={CHART_W - PAD_X}
          y1={chartH - padY}
          y2={chartH - padY}
          stroke="var(--tt-line, #ebebeb)"
          strokeWidth="1"
        />
        {/* Planned — muted baseline underneath */}
        <path
          d={plannedPath}
          fill="none"
          stroke="var(--tt-ink-faint, #9a9a9a)"
          strokeWidth={plannedStroke}
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeDasharray="4 4"
          opacity="0.55"
        />
        {plannedPoints.map((p, pi) => (
          <rect
            key={`p-${pi}`}
            x={p.x - plannedDot / 2}
            y={p.y - plannedDot / 2}
            width={plannedDot}
            height={plannedDot}
            fill="var(--tt-ink-faint, #9a9a9a)"
            opacity="0.45"
          />
        ))}
        {/* Actual load — uses --tt-good (orange on v2 home panels) */}
        {showActual ? (
          <>
            <path
              d={actualPath}
              fill="none"
              stroke="var(--tt-good, var(--tt-v2-accent, #f0440a))"
              strokeWidth={actualStroke}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            {actualPoints.map((p, pi) => (
              <rect
                key={`a-${pi}`}
                x={p.x - actualDot / 2}
                y={p.y - actualDot / 2}
                width={actualDot}
                height={actualDot}
                fill="var(--tt-good, var(--tt-v2-accent, #f0440a))"
              />
            ))}
          </>
        ) : null}
      </svg>
      <div
        className="mt-1 flex justify-between text-[10px] text-[var(--tt-ink-faint,#9a9a9a)]"
        style={{
          paddingLeft: `${(PAD_X / CHART_W) * 100}%`,
          paddingRight: `${(PAD_X / CHART_W) * 100}%`,
        }}
      >
        {DAYS.map((d, di) => (
          <span key={`${d}-${di}`} className="w-3 text-center">
            {d}
          </span>
        ))}
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium tracking-[0.02em] text-[var(--tt-ink-faint,#9a9a9a)]',
          compact ? 'mt-1.5' : 'mt-2',
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-px w-3 border-t border-dashed border-[var(--tt-ink-faint,#9a9a9a)] opacity-70"
            aria-hidden
          />
          Planned
        </span>
        {showActual ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--tt-good,var(--tt-v2-accent,#f0440a))]">
            <span
              className="inline-block h-px w-3 bg-[var(--tt-good,var(--tt-v2-accent,#f0440a))]"
              aria-hidden
            />
            Actual
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Athlete Home rail — Training load chart.
 * Planned (muted) + real (green) series; toggle TSS / time.
 */
export function AthleteTrainingLoadCard({
  workouts,
  anchorWeekStartKey,
  thresholds = {},
  title = 'Training load',
  tone = 'default',
  className,
}: AthleteTrainingLoadCardProps) {
  const isV2 = tone === 'v2'
  /** Logical week being shown (header + morph target). */
  const [active, setActive] = useState(CENTER_INDEX)
  /** Carousel track position — only moves on swipe (arrows morph in place). */
  const [paneActive, setPaneActive] = useState(CENTER_INDEX)
  const [metric, setMetric] = useState<LoadMetric>('tss')
  const [dailyMorphFrom, setDailyMorphFrom] = useState<MorphPair | null>(null)
  const [morphGen, setMorphGen] = useState(0)
  const todayKey = todayDateKey()
  const syncTimerRef = useRef<number | null>(null)

  const weeks = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return OFFSETS.map((off) => {
      const startKey = toDateKey(addDateOnlyDays(anchor, off * 7))
      const keys = weekDateKeys(startKey)
      const keySet = new Set(keys)
      const weekWorkouts = workouts.filter((w) => keySet.has(w.dateKey))
      const end = parseDateOnly(keys[6]!)
      const start = parseDateOnly(keys[0]!)
      const plannedWeek = keys.every((k) => k > todayKey)
      const dailyPlannedTss = keys.map((k) =>
        daySessionLoadPlanned(workouts, k, thresholds),
      )
      const dailyActualTss = keys.map((k) =>
        daySessionLoadActual(workouts, k, thresholds),
      )
      const dailyPlannedTime = keys.map((k) => dayMinutesPlanned(workouts, k))
      const dailyActualTime = keys.map((k) => dayMinutesActual(workouts, k))
      const dailyPlanned = metric === 'tss' ? dailyPlannedTss : dailyPlannedTime
      const dailyActual = metric === 'tss' ? dailyActualTss : dailyActualTime
      // Week totals: sum raw then round once (same as hero metrics).
      // Daily bars still use per-day rounded values for the chart.
      const plannedTotal =
        metric === 'tss'
          ? weekSessionLoadPlanned(weekWorkouts, thresholds)
          : dailyPlannedTime.reduce((a, b) => a + b, 0)
      const actualTotal =
        metric === 'tss'
          ? weekSessionLoadActual(weekWorkouts, thresholds)
          : dailyActualTime.reduce((a, b) => a + b, 0)
      const range =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth()
          ? `${format(start, 'd')} – ${format(end, 'd MMMM yyyy')}`
          : start.getFullYear() === end.getFullYear()
            ? `${format(start, 'd MMMM')} – ${format(end, 'd MMMM yyyy')}`
            : `${format(start, 'd MMMM yyyy')} – ${format(end, 'd MMMM yyyy')}`
      const rangeCompact =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth()
          ? `${format(start, 'd')} – ${format(end, 'd MMM')}`
          : start.getFullYear() === end.getFullYear()
            ? `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
            : `${format(start, 'd MMM yy')} – ${format(end, 'd MMM yy')}`
      const label =
        off === 0
          ? 'This week'
          : off === -1
            ? 'Last week'
            : off === 1
              ? 'Next week'
              : `Week ${getISOWeek(start)}`
      return {
        off,
        startKey,
        keys,
        dailyPlanned,
        dailyActual,
        plannedTotal,
        actualTotal,
        range,
        rangeCompact,
        label,
        plannedWeek,
      }
    })
  }, [anchorWeekStartKey, workouts, todayKey, thresholds, metric])

  const week = weeks[active]!
  const unitLabel = metric === 'tss' ? 'TSS' : 'min'

  const switchMetric = useCallback(
    (next: LoadMetric) => {
      if (next === metric) return
      const current = weeks[active]!
      setDailyMorphFrom({
        planned: [...current.dailyPlanned],
        actual: [...current.dailyActual],
      })
      setMorphGen((g) => g + 1)
      setMetric(next)
      window.setTimeout(() => setDailyMorphFrom(null), 500)
    },
    [active, metric, weeks],
  )

  const syncPaneToActive = useCallback(() => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (paneActive === active) return
    setPaneActive(active)
    setDailyMorphFrom(null)
  }, [active, paneActive])

  const onActiveChange = useCallback((index: number) => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    setDailyMorphFrom(null)
    setActive(index)
    setPaneActive(index)
  }, [])

  const goByArrow = useCallback(
    (next: number) => {
      if (next === active) return
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
      const current = weeks[active]!
      setDailyMorphFrom({
        planned: [...current.dailyPlanned],
        actual: [...current.dailyActual],
      })
      setMorphGen((g) => g + 1)
      setActive(next)
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        setDailyMorphFrom(null)
        setPaneActive(next)
      }, 500)
    },
    [active, weeks],
  )

  useEffect(() => {
    return () => {
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current)
    }
  }, [])

  const awayFromThisWeek = active !== CENTER_INDEX
  const nav = (
    <>
      {awayFromThisWeek ? (
        <WeekCarouselThisWeekButton
          className="mr-1.5"
          onClick={() => goByArrow(CENTER_INDEX)}
        />
      ) : null}
      <WeekCarouselNav
        canPrev={active > 0}
        canNext={active < weeks.length - 1}
        isToday={!awayFromThisWeek}
        rangeLabel={week.range}
        rangeLabelCompact={week.rangeCompact}
        onPrev={() => goByArrow(Math.max(0, active - 1))}
        onNext={() => goByArrow(Math.min(weeks.length - 1, active + 1))}
      />
    </>
  )

  return (
    <section
      className={cn(
        isV2 ? cn(v2.surfaces.widgetLight, 'tt-v2-home-widget') : SHELL,
        className,
      )}
    >
      {isV2 ? (
        <V2WidgetHeader title={title} trailing={nav} />
      ) : (
        <HomeMobileSectionHeader
          title={title}
          collapsible={false}
          trailing={nav}
        />
      )}

      <WeekSwipePane
        className="tt-space-after-title"
        active={paneActive}
        count={weeks.length}
        onActiveChange={onActiveChange}
        onGestureStart={syncPaneToActive}
      >
        {weeks.map((slide, i) => {
          const data = i === paneActive ? weeks[active]! : slide
          const isVisible = i === paneActive
          const showActual = !data.plannedWeek
          const headlineTotal = showActual ? data.actualTotal : data.plannedTotal

          return (
            <WeekSwipeSlide key={slide.startKey} active={isVisible}>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={cn(
                      'tabular-nums leading-none tracking-tight text-[var(--tt-ink,#111)]',
                      isV2
                        ? 'text-[1.35rem] font-semibold'
                        : 'text-[1.875rem] uppercase tracking-[-0.01em]',
                    )}
                    style={isV2 ? undefined : { fontFamily: 'var(--font-display)' }}
                  >
                    {headlineTotal}{' '}
                    <span
                      className={cn(
                        'font-normal normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]',
                        isV2 ? 'text-[12px] font-medium' : 'text-base',
                      )}
                    >
                      {unitLabel}
                      {data.plannedWeek ? ' plan' : ''}
                    </span>
                  </p>
                  {showActual && data.plannedTotal > 0 ? (
                    <p className="mt-1 text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                      Planned {data.plannedTotal} {unitLabel}
                    </p>
                  ) : null}
                </div>
                {isVisible ? (
                  <div
                    className="mb-0.5 flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-[0.02em]"
                    role="group"
                    aria-label="Load metric"
                  >
                    {(
                      [
                        { id: 'tss' as const, label: 'TSS' },
                        { id: 'time' as const, label: 'Time' },
                      ] as const
                    ).map((option, index) => (
                      <span key={option.id} className="inline-flex items-center gap-1">
                        {index > 0 ? (
                          <span className="text-[var(--tt-ink-faint,#9a9a9a)]" aria-hidden>
                            ·
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-pressed={metric === option.id}
                          onClick={() => switchMetric(option.id)}
                          className={cn(
                            'transition',
                            metric === option.id
                              ? isV2
                                ? 'text-[var(--tt-v2-accent)]'
                                : 'text-[var(--tt-ink,#111)]'
                              : 'text-[var(--tt-ink-faint,#9a9a9a)] hover:text-[var(--tt-ink-soft,#6b6b6b)]',
                          )}
                        >
                          {option.label}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <TrainingLoadChart
                key={`${slide.startKey}-${metric}-${isVisible ? morphGen : 'idle'}`}
                plannedDaily={data.dailyPlanned}
                actualDaily={data.dailyActual}
                yMax={Math.max(...data.dailyPlanned, ...data.dailyActual, 1)}
                showActual={showActual}
                morphFrom={isVisible ? dailyMorphFrom : null}
                compact={isV2}
              />
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
