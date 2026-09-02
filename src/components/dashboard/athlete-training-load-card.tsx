'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { cn } from '@/lib/utils'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const CHART_W = 320
const CHART_H = 72
const PAD_X = 12
const PAD_Y = 12

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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
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

/**
 * Athlete Home rail — Training load chart (mock `/design-mockups` TrainingLoadMock).
 * Uses duration minutes as volume stand-in until TSS exists.
 */
export function AthleteTrainingLoadCard({
  workouts,
  anchorWeekStartKey,
  className,
}: AthleteTrainingLoadCardProps) {
  const [offset, setOffset] = useState(0) // -1 last, 0 this, +1 next
  const todayKey = todayDateKey()

  const weeks = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return ([-1, 0, 1] as const).map((off) => {
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

  const week = weeks.find((w) => w.off === offset) ?? weeks[1]!
  const prior = weeks.find((w) => w.off === offset - 1)
  const delta = week.planned
    ? { label: 'Planned week', positive: true }
    : formatDelta(week.total, prior?.total ?? 0)

  const yMax = useMemo(
    () => Math.max(...weeks.flatMap((w) => w.daily), 1),
    [weeks],
  )

  const displayRef = useRef<number[]>([...week.daily])
  const [displayDaily, setDisplayDaily] = useState<number[]>([...week.daily])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = [...displayRef.current]
    const to = week.daily
    const start = performance.now()
    const dur = 480
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = easeOutCubic(t)
      const next = from.map((v, i) => v + (to[i]! - v) * e)
      displayRef.current = next
      setDisplayDaily(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = null
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate on week change only
  }, [week.startKey])

  const path = smoothPath(displayDaily, yMax)
  const points = toPoints(displayDaily, yMax)

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
              onClick={() => setOffset((o) => Math.max(-1, o - 1))}
              disabled={offset <= -1}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
              aria-label="Next week"
              onClick={() => setOffset((o) => Math.min(1, o + 1))}
              disabled={offset >= 1}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </>
        }
      />

      <p
          className="mt-2 text-[1.875rem] uppercase leading-none tracking-[-0.01em] text-[var(--tt-ink,#111)] tabular-nums"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {week.total}{' '}
          <span className="text-base font-normal normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
            min{week.planned ? ' plan' : ''}
          </span>
        </p>
        <p
          className={cn(
            'mt-1 text-[12px] font-semibold',
            delta.positive
              ? 'text-[var(--tt-good,#1a9f5c)]'
              : 'text-[var(--tt-ink-soft,#6b6b6b)]',
          )}
        >
          {delta.label}
        </p>

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
                week.planned
                  ? 'var(--tt-ink-faint, #9a9a9a)'
                  : 'var(--tt-good, #1a9f5c)'
              }
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={week.planned ? '6 4' : undefined}
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2.25"
                fill={
                  week.planned
                    ? 'var(--tt-ink-faint, #9a9a9a)'
                    : 'var(--tt-good, #1a9f5c)'
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
            {DAYS.map((d, i) => (
              <span key={`${d}-${i}`} className="w-3 text-center">
                {d}
              </span>
            ))}
          </div>
        </div>
    </section>
  )
}
