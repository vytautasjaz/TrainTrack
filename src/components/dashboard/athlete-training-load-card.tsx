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

type AthleteTrainingLoadCardProps = {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  className?: string
}

function weekDateKeys(weekStartKey: string): string[] {
  const start = parseDateOnly(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDateOnlyDays(start, i)))
}

/** Daily volume proxy (minutes) until real TSS exists — matches mock chart chrome. */
function dayLoadMinutes(
  workouts: PlanWorkoutDetail[],
  dateKey: string,
  todayKey: string,
  weekIsFullyFuture: boolean,
): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status === 'SKIPPED') continue

    const usePlanned =
      weekIsFullyFuture || dateKey > todayKey || dateKey === todayKey
    if (usePlanned && w.status !== 'COMPLETED') {
      sum += w.plannedDuration ?? 0
      continue
    }
    if (w.status === 'COMPLETED') {
      sum += w.result?.actualDuration ?? w.plannedDuration ?? 0
    }
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

function formatDelta(current: number, previous: number): {
  label: string
  positive: boolean
} {
  if (previous <= 0 && current <= 0) {
    return { label: 'No volume yet', positive: true }
  }
  if (previous <= 0) {
    return { label: 'New week load', positive: true }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { label: 'Same as prior week', positive: true }
  const sign = pct > 0 ? '+' : '−'
  return {
    label: `${sign}${Math.abs(pct)}% vs prior week`,
    positive: pct >= 0,
  }
}

function LoadChart({
  daily,
  yMax,
  planned,
  morphFrom,
}: {
  daily: number[]
  yMax: number
  planned: boolean
  morphFrom: number[] | null
}) {
  const displayDaily = useMorphArray(daily, morphFrom)
  const path = smoothPath(displayDaily, yMax)
  const points = toPoints(displayDaily, yMax)

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
        <path
          d={path}
          fill="none"
          stroke={
            planned ? 'var(--tt-ink-faint, #9a9a9a)' : 'var(--tt-good, #1a9f5c)'
          }
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={planned ? '6 4' : undefined}
        />
        {points.map((p, pi) => (
          <circle
            key={pi}
            cx={p.x}
            cy={p.y}
            r="2.25"
            fill={
              planned ? 'var(--tt-ink-faint, #9a9a9a)' : 'var(--tt-good, #1a9f5c)'
            }
          />
        ))}
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
    </div>
  )
}

/**
 * Athlete Home rail — Training load chart (mock `/design-mockups` TrainingLoadMock).
 * Uses duration minutes as volume stand-in until TSS exists.
 */
export function AthleteTrainingLoadCard({
  workouts,
  anchorWeekStartKey,
  className,
}: AthleteTrainingLoadCardProps) {
  /** Logical week being shown (header + morph target). */
  const [active, setActive] = useState(CENTER_INDEX)
  /** Carousel track position — only moves on swipe (arrows morph in place). */
  const [paneActive, setPaneActive] = useState(CENTER_INDEX)
  const [dailyMorphFrom, setDailyMorphFrom] = useState<number[] | null>(null)
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
      const planned = keys.every((k) => k > todayKey)
      const daily = keys.map((k) =>
        dayLoadMinutes(workouts, k, todayKey, planned),
      )
      const total = daily.reduce((a, b) => a + b, 0)
      const range =
        format(start, 'd') === format(end, 'd')
          ? format(start, 'd MMM')
          : format(start, 'MMM') === format(end, 'MMM')
            ? `${format(start, 'd')}–${format(end, 'd MMM')}`
            : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
      const label =
        off === 0 ? 'This week' : off === -1 ? 'Last week' : 'Next week'
      return { off, startKey, keys, daily, total, range, label, planned }
    })
  }, [anchorWeekStartKey, workouts, todayKey])

  const yMax = useMemo(
    () => Math.max(...weeks.flatMap((w) => w.daily), 1),
    [weeks],
  )

  const week = weeks[active]!
  const prior = weeks.find((w) => w.off === week.off - 1)
  const delta = week.planned
    ? { label: 'Planned week', positive: true }
    : formatDelta(week.total, prior?.total ?? 0)

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
      setDailyMorphFrom([...weeks[active]!.daily])
      setMorphGen((g) => g + 1)
      setActive(next)
      // Keep paneActive put — morph in place. Align track after morph (no slide).
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
          // While arrow-morphing, the visible pane slide shows the logical week.
          const data = i === paneActive ? weeks[active]! : slide
          const isVisible = i === paneActive
          const slideDelta = isVisible
            ? delta
            : data.planned
              ? { label: 'Planned week', positive: true }
              : formatDelta(
                  data.total,
                  weeks.find((w) => w.off === data.off - 1)?.total ?? 0,
                )

          return (
            <WeekSwipeSlide key={slide.startKey} active={isVisible}>
              <p
                className="text-[1.875rem] uppercase leading-none tracking-[-0.01em] text-[var(--tt-ink,#111)] tabular-nums"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {data.total}{' '}
                <span className="text-base font-normal normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
                  min{data.planned ? ' plan' : ''}
                </span>
              </p>
              <p
                className={cn(
                  'mt-1 text-[12px] font-semibold',
                  slideDelta.positive
                    ? 'text-[var(--tt-good,#1a9f5c)]'
                    : 'text-[var(--tt-ink-soft,#6b6b6b)]',
                )}
              >
                {slideDelta.label}
              </p>

              <LoadChart
                key={`${slide.startKey}-${isVisible ? morphGen : 'idle'}`}
                daily={data.daily}
                yMax={yMax}
                planned={data.planned}
                morphFrom={isVisible ? dailyMorphFrom : null}
              />
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
