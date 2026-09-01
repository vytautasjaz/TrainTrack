'use client'

import { useState } from 'react'
import { Bike, ChevronLeft, ChevronRight, Footprints, Waves } from 'lucide-react'

type SportStat = {
  label: string
  unit: string
  planned: number
  completed: number
  Icon: typeof Footprints
  color: string
}

type WeekData = {
  label: string
  range: string
  sports: SportStat[]
  overall: { plannedH: number; completedH: number }
}

function formatHours(n: number) {
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return m ? `${h}h${m}` : `${h}h`
}

function fmtKm(n: number) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}

function pctOf(completed: number, planned: number) {
  if (planned <= 0) return 0
  return Math.min(100, Math.round((completed / planned) * 100))
}

const WEEKS: WeekData[] = [
  {
    label: 'This week',
    range: '18–24 Aug',
    sports: [
      {
        label: 'Run',
        unit: 'km',
        planned: 32,
        completed: 24.2,
        Icon: Footprints,
        color: 'var(--tt-sport-run)',
      },
      {
        label: 'Bike',
        unit: 'km',
        planned: 160,
        completed: 140,
        Icon: Bike,
        color: 'var(--tt-sport-bike)',
      },
      {
        label: 'Swim',
        unit: 'km',
        planned: 3,
        completed: 2,
        Icon: Waves,
        color: 'var(--tt-sport-swim)',
      },
    ],
    overall: { plannedH: 7.5, completedH: 5.7 },
  },
  {
    label: 'Last week',
    range: '11–17 Aug',
    sports: [
      {
        label: 'Run',
        unit: 'km',
        planned: 36,
        completed: 28,
        Icon: Footprints,
        color: 'var(--tt-sport-run)',
      },
      {
        label: 'Bike',
        unit: 'km',
        planned: 160,
        completed: 160,
        Icon: Bike,
        color: 'var(--tt-sport-bike)',
      },
      {
        label: 'Swim',
        unit: 'km',
        planned: 2.4,
        completed: 2.4,
        Icon: Waves,
        color: 'var(--tt-sport-swim)',
      },
    ],
    overall: { plannedH: 8.2, completedH: 7.1 },
  },
  {
    label: 'Next week',
    range: '25–31 Aug',
    sports: [
      {
        label: 'Run',
        unit: 'km',
        planned: 42,
        completed: 0,
        Icon: Footprints,
        color: 'var(--tt-sport-run)',
      },
      {
        label: 'Bike',
        unit: 'km',
        planned: 90,
        completed: 0,
        Icon: Bike,
        color: 'var(--tt-sport-bike)',
      },
      {
        label: 'Swim',
        unit: 'km',
        planned: 3.2,
        completed: 0,
        Icon: Waves,
        color: 'var(--tt-sport-swim)',
      },
    ],
    overall: { plannedH: 9.0, completedH: 0 },
  },
]

export function WeekStatsMock({ compact = false }: { compact?: boolean }) {
  const [offset, setOffset] = useState(0)
  const index = offset === 0 ? 0 : offset < 0 ? 1 : 2
  const week = WEEKS[index]

  const overallPct = pctOf(week.overall.completedH, week.overall.plannedH)

  return (
    <div className={`tt-mock-card ${compact ? 'p-3.5' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="tt-mock-overline !text-[10px]">{week.label}</p>
          <p className="text-[10px] text-[var(--tt-ink-faint)]">{week.range}</p>
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

      {week.sports.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
          {week.sports.map((stat) => {
            const pct = pctOf(stat.completed, stat.planned)
            return (
              <div key={stat.label} className="min-w-0">
                <div className="flex items-center gap-1">
                  <stat.Icon
                    className="h-3 w-3 shrink-0"
                    style={{ color: stat.color }}
                    strokeWidth={1.75}
                  />
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                    {stat.label}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--tt-ink)]">
                  <span className="font-semibold">{fmtKm(stat.completed)}</span>
                  <span className="text-[var(--tt-ink-faint)]">
                    /{fmtKm(stat.planned)} {stat.unit}
                  </span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: stat.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-3 text-center text-[11px] text-[var(--tt-ink-faint)]">
          No sports planned
        </p>
      )}

      <div className="mt-3 border-t border-[var(--tt-line)] pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Overall
          </p>
          <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
            <span className="font-semibold text-[var(--tt-ink)]">
              {formatHours(week.overall.completedH)}
            </span>
            <span>
              /{formatHours(week.overall.plannedH)} · {overallPct}%
            </span>
          </p>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--tt-line)]">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${overallPct}%`,
              background: 'var(--tt-ink-soft)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
