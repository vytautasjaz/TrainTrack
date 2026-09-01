'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Phase2Card } from './mock-ui'

type LoadWeek = {
  label: string
  range: string
  deltaLabel: string
  deltaPositive: boolean
  daily: number[]
  planned?: boolean
}

const WEEKS: LoadWeek[] = [
  {
    label: 'This week',
    range: '18–24 Aug',
    deltaLabel: '+12% vs last week',
    deltaPositive: true,
    daily: [72, 88, 64, 110, 95, 140, 113],
  },
  {
    label: 'Last week',
    range: '11–17 Aug',
    deltaLabel: '−4% vs prior week',
    deltaPositive: false,
    daily: [80, 70, 95, 85, 60, 120, 98],
  },
  {
    label: 'Next week',
    range: '25–31 Aug',
    deltaLabel: 'Planned week',
    deltaPositive: true,
    planned: true,
    daily: [85, 95, 70, 120, 100, 150, 100],
  },
]

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const CHART_W = 320
const CHART_H = 72
const PAD_X = 12
const PAD_Y = 12
const Y_MAX = Math.max(...WEEKS.flatMap((w) => w.daily), 1)

function toPoints(daily: number[]) {
  const innerW = CHART_W - PAD_X * 2
  const innerH = CHART_H - PAD_Y * 2
  return daily.map((v, i) => ({
    x: PAD_X + (i / (daily.length - 1)) * innerW,
    y: PAD_Y + innerH - (v / Y_MAX) * innerH,
  }))
}

function smoothPath(daily: number[]): string {
  const pts = toPoints(daily)
  if (pts.length < 2) return ''

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
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

export function TrainingLoadMock({ compact = false }: { compact?: boolean }) {
  const [offset, setOffset] = useState(0)
  const index = offset === 0 ? 0 : offset < 0 ? 1 : 2
  const week = WEEKS[index]
  const tss = week.daily.reduce((a, b) => a + b, 0)

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
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // Only re-run when the week identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.range])

  const path = smoothPath(displayDaily)
  const points = toPoints(displayDaily)

  return (
    <Phase2Card note="v1 uses week volume instead of TSS" className={compact ? '!p-3' : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="tt-mock-overline">Training load</p>
          <p className="text-[10px] text-[var(--tt-ink-faint)]">
            {week.label} · {week.range}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded p-0.5 text-[var(--tt-ink-faint)] enabled:hover:text-[var(--tt-ink)] disabled:opacity-30"
            aria-label="Previous week"
            onClick={() => setOffset((o) => Math.max(-1, o - 1))}
            disabled={offset <= -1}
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 text-[var(--tt-ink-faint)] enabled:hover:text-[var(--tt-ink)] disabled:opacity-30"
            aria-label="Next week"
            onClick={() => setOffset((o) => Math.min(1, o + 1))}
            disabled={offset >= 1}
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <p className={`tt-mock-stat mt-2 ${compact ? 'text-2xl' : 'text-3xl'}`}>
        {tss}{' '}
        <span className="tt-mock-body !inline text-base">
          TSS{week.planned ? ' plan' : ''}
        </span>
      </p>
      <p
        className="tt-mock-caption mt-1 font-semibold"
        style={{ color: week.deltaPositive ? 'var(--tt-good)' : 'var(--tt-ink-soft)' }}
      >
        {week.deltaLabel}
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
            stroke="var(--tt-line)"
            strokeWidth="1"
          />
          <path
            d={path}
            fill="none"
            stroke={week.planned ? 'var(--tt-ink-faint)' : 'var(--tt-good)'}
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
              fill={week.planned ? 'var(--tt-ink-faint)' : 'var(--tt-good)'}
            />
          ))}
        </svg>
        <div
          className="mt-1 flex justify-between text-[10px] text-[var(--tt-ink-faint)]"
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
    </Phase2Card>
  )
}
