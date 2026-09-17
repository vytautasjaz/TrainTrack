'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
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
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import {
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import { useMorphArray } from '@/components/dashboard/week-nav-morph'
import { cn } from '@/lib/utils'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const CHART_W = 320
const CHART_H = 72
const PAD_X = 12
const PAD_Y = 12
const OFFSETS = [-1, 0, 1] as const
const CENTER_INDEX = 1

const SHELL =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)] md:rounded-[10px] md:p-4'

type LoadMetric = 'tss' | 'time'

type AthleteTrainingLoadCardProps = {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  thresholds?: SessionLoadThresholds
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

function toPoints(daily: number[], yMax: number) {
  const innerW = CHART_W - PAD_X * 2
  const innerH = CHART_H - PAD_Y * 2
  const max = Math.max(yMax, 1)
  return daily.map((v, i) => ({
    x: PAD_X + (i / Math.max(1, daily.length - 1)) * innerW,
    y: PAD_Y + innerH - (v / max) * innerH,
  }))
}

function smoothPath(daily: number[], yMax: number): string {
  const pts = toPoints(daily, yMax)
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

function LoadChart({
  plannedDaily,
  actualDaily,
  yMax,
  showActual,
  morphFrom,
}: {
  plannedDaily: number[]
  actualDaily: number[]
  yMax: number
  showActual: boolean
  morphFrom: MorphPair | null
}) {
  const displayPlanned = useMorphArray(plannedDaily, morphFrom?.planned ?? null)
  const displayActual = useMorphArray(actualDaily, morphFrom?.actual ?? null)
  const plannedPath = smoothPath(displayPlanned, yMax)
  const actualPath = smoothPath(displayActual, yMax)
  const plannedPoints = toPoints(displayPlanned, yMax)
  const actualPoints = toPoints(displayActual, yMax)

  return (
    <div className="mt-4 w-full">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="block h-auto w-full"
        style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line
          x1={PAD_X}
          x2={CHART_W - PAD_X}
          y1={CHART_H - PAD_Y}
          y2={CHART_H - PAD_Y}
          stroke="var(--tt-line, #ebebeb)"
          strokeWidth="1"
        />
        {/* Planned — muted baseline underneath */}
        <path
          d={plannedPath}
          fill="none"
          stroke="var(--tt-ink-faint, #9a9a9a)"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 4"
          opacity="0.55"
        />
        {plannedPoints.map((p, pi) => (
          <circle
            key={`p-${pi}`}
            cx={p.x}
            cy={p.y}
            r="1.75"
            fill="var(--tt-ink-faint, #9a9a9a)"
            opacity="0.45"
          />
        ))}
        {/* Real load — primary green on top */}
        {showActual ? (
          <>
            <path
              d={actualPath}
              fill="none"
              stroke="var(--tt-good, #1a9f5c)"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {actualPoints.map((p, pi) => (
              <circle
                key={`a-${pi}`}
                cx={p.x}
                cy={p.y}
                r="2.4"
                fill="var(--tt-good, #1a9f5c)"
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
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium tracking-[0.02em] text-[var(--tt-ink-faint,#9a9a9a)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-px w-3 border-t border-dashed border-[var(--tt-ink-faint,#9a9a9a)] opacity-70"
            aria-hidden
          />
          Planned
        </span>
        {showActual ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--tt-good,#1a9f5c)]">
            <span
              className="inline-block h-0.5 w-3 rounded-full bg-[var(--tt-good,#1a9f5c)]"
              aria-hidden
            />
            Real
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
  className,
}: AthleteTrainingLoadCardProps) {
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
      const plannedTotal = dailyPlanned.reduce((a, b) => a + b, 0)
      const actualTotal = dailyActual.reduce((a, b) => a + b, 0)
      const range =
        format(start, 'd') === format(end, 'd')
          ? format(start, 'd MMM')
          : format(start, 'MMM') === format(end, 'MMM')
            ? `${format(start, 'd')}–${format(end, 'd MMM')}`
            : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
      const label =
        off === 0 ? 'This week' : off === -1 ? 'Last week' : 'Next week'
      return {
        off,
        startKey,
        keys,
        dailyPlanned,
        dailyActual,
        plannedTotal,
        actualTotal,
        range,
        label,
        plannedWeek,
      }
    })
  }, [anchorWeekStartKey, workouts, todayKey, thresholds, metric])

  const yMax = useMemo(
    () =>
      Math.max(
        ...weeks.flatMap((w) => [...w.dailyPlanned, ...w.dailyActual]),
        1,
      ),
    [weeks],
  )

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

  return (
    <section className={cn(SHELL, className)}>
      <HomeMobileSectionHeader
        title="Training load"
        collapsible={false}
        subtitle={`${week.label} · ${week.range}`}
        trailing={
          <>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
              aria-label="Previous week"
              onClick={() => goByArrow(Math.max(0, active - 1))}
              disabled={active <= 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
              aria-label="Next week"
              onClick={() => goByArrow(Math.min(weeks.length - 1, active + 1))}
              disabled={active >= weeks.length - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </>
        }
      />

      <WeekSwipePane
        className="mt-2"
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
                    className="text-[1.875rem] uppercase leading-none tracking-[-0.01em] text-[var(--tt-ink,#111)] tabular-nums"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {headlineTotal}{' '}
                    <span className="text-base font-normal normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
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
                              ? 'text-[var(--tt-ink,#111)]'
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

              <LoadChart
                key={`${slide.startKey}-${metric}-${isVisible ? morphGen : 'idle'}`}
                plannedDaily={data.dailyPlanned}
                actualDaily={data.dailyActual}
                yMax={yMax}
                showActual={showActual}
                morphFrom={isVisible ? dailyMorphFrom : null}
              />
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
