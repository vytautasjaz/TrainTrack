'use client'

import { useMemo, useState } from 'react'
import { WorkoutType } from '@prisma/client'
import {
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { SectionTitle } from '@/components/ui/typography'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type {
  ProgressMonthBucket,
  ProgressMonthRow,
  ProgressSportBucket,
  ProgressStats,
  ProgressWeekBucket,
} from '@/lib/progress-stats'
import { sportColors } from '@/lib/design-tokens'
import { cn, formatDistance, formatDuration } from '@/lib/utils'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'

type RangeId = '4w' | '12w' | 'ytd'
type ViewId = 'weeks' | 'months' | 'years'

type StatsTrendsSectionProps = {
  stats: ProgressStats
  className?: string
}

type MonthVolume = {
  label: string
  planned: number
  completed: number
}

function pickBucket(stats: ProgressStats, sport: WorkoutType | 'ALL'): ProgressSportBucket {
  if (sport === 'ALL') return stats.all
  return stats.bySport[sport] ?? stats.all
}

function sportColor(sport: WorkoutType | 'ALL'): string {
  if (sport === WorkoutType.BIKE) return sportColors.bike
  if (sport === WorkoutType.SWIM) return sportColors.swim
  if (sport === WorkoutType.RUN) return sportColors.run
  if (sport === WorkoutType.STRENGTH) return sportColors.strength
  if (sport === WorkoutType.TRIATHLON) return sportColors.triathlon
  if (sport === WorkoutType.HYROX) return sportColors.hyrox
  return 'var(--tt-ink)'
}

function yearBarColor(year: number, years: number[], sport: WorkoutType | 'ALL'): string {
  const idx = years.indexOf(year)
  if (idx === 0) return sportColor(sport)
  if (idx === 1) return 'var(--tt-ink-soft)'
  return 'var(--tt-ink-faint)'
}

function fmtDist(km: number): string {
  if (km <= 0) return '0'
  return km % 1 === 0 ? `${km}` : km.toFixed(1)
}

/** Chart bar height: prefer km, fall back to duration (hours) for strength / distance-less sports. */
function chartVolume(
  distanceKm: number,
  durationMin: number,
  sport: WorkoutType | 'ALL',
): number {
  if (distanceKm > 0) return distanceKm
  if (durationMin <= 0) return 0
  if (sport === 'ALL' || !sportUsesPlannedDistance(sport)) return durationMin / 60
  return 0
}

function sliceForRange(weeks: ProgressWeekBucket[], range: RangeId): ProgressWeekBucket[] {
  if (range === '4w') return weeks.slice(-4)
  if (range === '12w') return weeks.slice(-12)
  return weeks
}

function weeksForYear(
  weeks: ProgressWeekBucket[],
  year: number,
  range: RangeId,
): ProgressWeekBucket[] {
  const inYear = weeks.filter((w) => w.start.getUTCFullYear() === year)
  if (range === 'ytd') {
    const today = new Date()
    if (year === today.getUTCFullYear()) {
      return inYear.filter((w) => w.start <= today)
    }
    return inYear
  }
  return sliceForRange(inYear, range)
}

function monthVolumeForYear(months: ProgressMonthRow[], year: number): MonthVolume[] {
  return months
    .filter((m) => {
      const bucket = m.byYear[year]
      return (
        bucket &&
        (bucket.completedDistance > 0 ||
          bucket.plannedDistance > 0 ||
          bucket.completedDuration > 0 ||
          bucket.plannedDuration > 0)
      )
    })
    .map((m) => {
      const bucket = m.byYear[year] ?? emptyBucket()
      const completed = bucket.completedDistance
      const planned =
        bucket.plannedDistance > 0
          ? bucket.plannedDistance
          : bucket.plannedDuration > 0
            ? bucket.plannedDuration / 60
            : completed > 0
              ? completed * 1.05
              : 0
      const completedVolume =
        completed > 0 ? completed : bucket.completedDuration > 0 ? bucket.completedDuration / 60 : 0
      return { label: m.label, planned, completed: completedVolume }
    })
}

function emptyBucket(): ProgressMonthBucket {
  return {
    planned: 0,
    completed: 0,
    skipped: 0,
    plannedDistance: 0,
    completedDistance: 0,
    plannedDuration: 0,
    completedDuration: 0,
  }
}

function ChartBar({
  heightPct,
  className,
  style,
}: {
  heightPct: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        'origin-bottom transition-[height,background-color,opacity] duration-[320ms] ease-out',
        className,
      )}
      style={{ ...style, height: `${Math.max(0, heightPct)}%` }}
    />
  )
}

function ChartColumnTooltip({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: string }[]
}) {
  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max min-w-[8rem] max-w-[13rem] -translate-x-1/2',
        'rounded-[6px] border border-[var(--tt-line)] bg-white px-2.5 py-2',
        'shadow-[0_4px_14px_rgba(0,0,0,0.08)]',
        'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
      )}
    >
      <p className="text-[11px] font-semibold leading-snug text-[var(--tt-ink)]">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-[var(--tt-ink-soft)]">{r.label}</span>
            <span className="font-semibold tabular-nums text-[var(--tt-ink)]">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VolumeChart({
  weeks,
  sport,
  year,
}: {
  weeks: ProgressWeekBucket[]
  sport: WorkoutType | 'ALL'
  year: number
}) {
  if (weeks.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-8 text-center text-[13px] text-[var(--tt-ink-soft)]">
        No weekly data for {year}. Log workouts or switch sport/year.
      </div>
    )
  }

  const max = Math.max(
    ...weeks.flatMap((w) => [
      chartVolume(w.plannedDistance, w.plannedDuration, sport),
      chartVolume(w.completedDistance, w.completedDuration, sport),
    ]),
    1,
  )
  const color = sportColor(sport)
  const totalCompleted = weeks.reduce((s, w) => s + w.completedDistance, 0)
  const prior = weeks.slice(0, Math.max(0, weeks.length - 4))
  const recent = weeks.slice(-4)
  const priorAvg =
    prior.length > 0 ? prior.reduce((s, w) => s + w.completedDistance, 0) / prior.length : 0
  const recentAvg =
    recent.length > 0 ? recent.reduce((s, w) => s + w.completedDistance, 0) / recent.length : 0
  const deltaPct =
    priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0
  const sportLabel = sport === 'ALL' ? 'All sports' : WORKOUT_TYPE_LABELS[sport]

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Weekly volume · {year}
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · week of year · planned vs completed (km)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            {formatDistance(totalCompleted)} total
          </p>
          <p
            className={cn(
              'mt-0.5 text-[12px] font-medium',
              deltaPct > 0
                ? 'text-[var(--tt-good)]'
                : deltaPct < 0
                  ? 'text-[var(--tt-ink-soft)]'
                  : 'text-[var(--tt-ink-faint)]',
            )}
          >
            {deltaPct > 0 ? '↑' : deltaPct < 0 ? '↓' : '→'} {Math.abs(deltaPct)}% vs prior weeks
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--tt-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--tt-ink-faint)]/45" aria-hidden />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
          Completed
        </span>
      </div>

      <div className="mt-5 flex h-52 items-end gap-1.5 sm:gap-2" role="img" aria-label="Weekly volume chart">
        {weeks.map((w) => {
          const plannedVal = chartVolume(w.plannedDistance, w.plannedDuration, sport)
          const completedVal = chartVolume(w.completedDistance, w.completedDuration, sport)
          const plannedH = (plannedVal / max) * 100
          const completedH = (completedVal / max) * 100
          return (
            <div key={`${w.label}-${w.range}`} className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="mb-0.5 text-[9px] font-medium tabular-nums text-[var(--tt-ink-soft)] opacity-0 transition group-hover:opacity-100 sm:opacity-100">
                {fmtDist(completedVal)}
              </span>
              <div className="relative flex h-40 w-full items-end justify-center gap-0.5">
                <ChartColumnTooltip
                  title={`${w.label} · ${w.range}`}
                  rows={[
                    { label: 'Planned', value: formatDistance(w.plannedDistance) },
                    { label: 'Completed', value: formatDistance(w.completedDistance) },
                    { label: 'Sessions', value: `${w.completed}/${w.planned}` },
                    { label: 'Duration', value: formatDuration(w.completedDuration) },
                  ]}
                />
                <ChartBar
                  heightPct={plannedH}
                  className="w-[42%] max-w-[1.1rem] rounded-t-[3px] bg-[var(--tt-ink-faint)]/45"
                />
                <ChartBar
                  heightPct={completedH}
                  className="w-[42%] max-w-[1.1rem] rounded-t-[3px]"
                  style={{ background: color, opacity: 0.85 }}
                />
              </div>
              <span className="text-[9px] font-medium tabular-nums text-[var(--tt-ink)]">{w.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthVolumeChart({
  months,
  sport,
  year,
}: {
  months: MonthVolume[]
  sport: WorkoutType | 'ALL'
  year: number
}) {
  if (months.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-8 text-center text-[13px] text-[var(--tt-ink-soft)]">
        No monthly data for {year}.
      </div>
    )
  }

  const max = Math.max(...months.flatMap((m) => [m.planned, m.completed]), 1)
  const color = sportColor(sport)
  const totalCompleted = months.reduce((s, m) => s + m.completed, 0)
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const momPct =
    last && prev && prev.completed > 0
      ? Math.round(((last.completed - prev.completed) / prev.completed) * 100)
      : 0
  const sportLabel = sport === 'ALL' ? 'All sports' : WORKOUT_TYPE_LABELS[sport]

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Monthly volume · {year}
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · compare months · planned vs completed (km)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            {formatDistance(totalCompleted)} total
          </p>
          {last && prev ? (
            <p
              className={cn(
                'mt-0.5 text-[12px] font-medium',
                momPct > 0
                  ? 'text-[var(--tt-good)]'
                  : momPct < 0
                    ? 'text-[var(--tt-ink-soft)]'
                    : 'text-[var(--tt-ink-faint)]',
              )}
            >
              {momPct > 0 ? '↑' : momPct < 0 ? '↓' : '→'} {Math.abs(momPct)}% {last.label} vs{' '}
              {prev.label}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex h-52 items-end gap-1 sm:gap-1.5" role="img" aria-label="Monthly volume chart">
        {months.map((m) => {
          const plannedH = (m.planned / max) * 100
          const completedH = (m.completed / max) * 100
          const pct = m.planned > 0 ? Math.round((m.completed / m.planned) * 100) : 0
          return (
            <div key={m.label} className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="relative flex h-40 w-full items-end justify-center gap-0.5">
                <ChartColumnTooltip
                  title={`${m.label} ${year}`}
                  rows={[
                    { label: 'Planned', value: formatDistance(m.planned) },
                    { label: 'Completed', value: formatDistance(m.completed) },
                    { label: 'Completion', value: `${pct}%` },
                  ]}
                />
                <ChartBar
                  heightPct={plannedH}
                  className="w-[42%] max-w-[1.1rem] rounded-t-[3px] bg-[var(--tt-ink-faint)]/45"
                />
                <ChartBar
                  heightPct={completedH}
                  className="w-[42%] max-w-[1.1rem] rounded-t-[3px]"
                  style={{ background: color, opacity: 0.85 }}
                />
              </div>
              <span className="text-[9px] font-medium text-[var(--tt-ink)]">{m.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function YearCompareChart({
  months,
  sport,
  years,
}: {
  months: ProgressMonthRow[]
  sport: WorkoutType | 'ALL'
  years: number[]
}) {
  const visible = months.filter((m) => years.some((y) => (m.byYear[y]?.completedDistance ?? 0) > 0))
  const max = Math.max(
    ...visible.flatMap((m) => years.map((y) => m.byYear[y]?.completedDistance ?? 0)),
    1,
  )
  const totals = Object.fromEntries(
    years.map((y) => [
      y,
      months.reduce((s, m) => s + (m.byYear[y]?.completedDistance ?? 0), 0),
    ]),
  ) as Record<number, number>
  const currentYear = years[0]
  const priorYear = years[1]
  const yoyPct =
    priorYear && totals[priorYear] > 0
      ? Math.round(((totals[currentYear] - totals[priorYear]) / totals[priorYear]) * 100)
      : 0
  const sportLabel = sport === 'ALL' ? 'All sports' : WORKOUT_TYPE_LABELS[sport]

  if (visible.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-8 text-center text-[13px] text-[var(--tt-ink-soft)]">
        Not enough history for year-over-year comparison yet.
      </div>
    )
  }

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Year over year
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · monthly completed volume (km)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            {currentYear} YTD {formatDistance(totals[currentYear])}
          </p>
          {priorYear ? (
            <p
              className={cn(
                'mt-0.5 text-[12px] font-medium',
                yoyPct > 0
                  ? 'text-[var(--tt-good)]'
                  : yoyPct < 0
                    ? 'text-[var(--tt-ink-soft)]'
                    : 'text-[var(--tt-ink-faint)]',
              )}
            >
              {yoyPct > 0 ? '↑' : yoyPct < 0 ? '↓' : '→'} {Math.abs(yoyPct)}% vs {priorYear}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex h-52 items-end gap-1 sm:gap-1.5" role="img" aria-label="Year over year chart">
        {visible.map((m) => (
          <div key={m.label} className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="relative flex h-40 w-full items-end justify-center gap-px sm:gap-0.5">
              <ChartColumnTooltip
                title={m.label}
                rows={years.map((y) => ({
                  label: String(y),
                  value:
                    (m.byYear[y]?.completedDistance ?? 0) > 0
                      ? formatDistance(m.byYear[y]!.completedDistance)
                      : '—',
                }))}
              />
              {years.map((y) => {
                const v = m.byYear[y]?.completedDistance ?? 0
                const h = v > 0 ? (v / max) * 100 : 0
                const idx = years.indexOf(y)
                return (
                  <ChartBar
                    key={y}
                    heightPct={h}
                    className="w-[28%] max-w-[0.85rem] rounded-t-[2px]"
                    style={{
                      background: yearBarColor(y, years, sport),
                      opacity: idx === 0 ? 0.9 : idx === 1 ? 0.55 : 0.35,
                    }}
                  />
                )
              })}
            </div>
            <span className="text-[9px] font-medium text-[var(--tt-ink)]">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildWeekMetrics(weeks: ProgressWeekBucket[]) {
  const last = weeks[weeks.length - 1]
  const prev = weeks[weeks.length - 2]
  if (!last) return []

  const volumeDelta = prev
    ? Math.round(((last.completedDistance - prev.completedDistance) / Math.max(prev.completedDistance, 1)) * 100)
    : 0
  const durationDelta = prev ? last.completedDuration - prev.completedDuration : 0
  const completion = Math.round((last.completed / Math.max(last.planned, 1)) * 100)
  const prevCompletion = prev
    ? Math.round((prev.completed / Math.max(prev.planned, 1)) * 100)
    : completion

  return [
    {
      label: 'Volume',
      value: formatDistance(last.completedDistance),
      delta:
        volumeDelta === 0
          ? 'same as last week'
          : `${volumeDelta > 0 ? '+' : ''}${volumeDelta}% vs last week`,
      up: volumeDelta === 0 ? null : volumeDelta > 0,
    },
    {
      label: 'Duration',
      value: formatDuration(last.completedDuration),
      delta:
        durationDelta === 0
          ? 'same as last week'
          : `${durationDelta > 0 ? '+' : ''}${Math.round(durationDelta)} min`,
      up: durationDelta === 0 ? null : durationDelta > 0,
    },
    {
      label: 'Completion',
      value: `${completion}%`,
      delta:
        completion - prevCompletion === 0
          ? 'same as last week'
          : `${completion - prevCompletion > 0 ? '+' : ''}${completion - prevCompletion}% vs last week`,
      up: completion - prevCompletion === 0 ? null : completion - prevCompletion > 0,
    },
    {
      label: 'Sessions',
      value: `${last.completed}`,
      delta: prev
        ? last.completed === prev.completed
          ? 'same as last week'
          : `${last.completed > prev.completed ? '+' : ''}${last.completed - prev.completed} vs last week`
        : 'this week',
      up: prev ? (last.completed === prev.completed ? null : last.completed > prev.completed) : null,
    },
  ] as const
}

function buildYearMetrics(months: ProgressMonthRow[], years: number[]) {
  const totals = Object.fromEntries(
    years.map((y) => [
      y,
      months.reduce((s, m) => s + (m.byYear[y]?.completedDistance ?? 0), 0),
    ]),
  ) as Record<number, number>
  const current = years[0]
  const prior = years[1]
  const yoy =
    prior && totals[prior] > 0
      ? Math.round(((totals[current] - totals[prior]) / totals[prior]) * 100)
      : 0

  return [
    {
      label: `${current} YTD`,
      value: formatDistance(totals[current]),
      delta: prior ? `${yoy > 0 ? '+' : ''}${yoy}% vs ${prior} YTD` : 'current year',
      up: yoy === 0 ? null : yoy > 0,
    },
    ...(prior
      ? [
          {
            label: `${prior} total`,
            value: formatDistance(totals[prior]),
            delta: 'full year in view',
            up: null,
          },
        ]
      : []),
    {
      label: 'This month',
      value: formatDistance(
        months[new Date().getUTCMonth()]?.byYear[current]?.completedDistance ?? 0,
      ),
      delta: 'completed volume',
      up: null,
    },
    {
      label: 'Peak month',
      value: (() => {
        const peak = months.reduce(
          (best, row) => {
            const v = row.byYear[current]?.completedDistance ?? 0
            return v > best.value ? { label: row.label, value: v } : best
          },
          { label: '—', value: 0 },
        )
        return peak.label
      })(),
      delta: (() => {
        const peak = months.reduce(
          (best, row) => {
            const v = row.byYear[current]?.completedDistance ?? 0
            return v > best.value ? { label: row.label, value: v } : best
          },
          { label: '—', value: 0 },
        )
        return formatDistance(peak.value)
      })(),
      up: null,
    },
  ] as const
}

export function StatsTrendsSection({ stats, className }: StatsTrendsSectionProps) {
  const [view, setView] = useState<ViewId>('weeks')
  const [range, setRange] = useState<RangeId>('12w')
  const [sport, setSport] = useState<WorkoutType | 'ALL'>('ALL')
  const [year, setYear] = useState<number>(stats.years[0] ?? new Date().getUTCFullYear())

  const bucket = useMemo(() => pickBucket(stats, sport), [stats, sport])
  const monthRows = useMemo(() => monthVolumeForYear(bucket.monthly, year), [bucket.monthly, year])

  const weeks = useMemo(() => {
    if (view !== 'weeks') return []
    return weeksForYear(bucket.weekly, year, range)
  }, [bucket.weekly, year, range, view])

  const metrics = useMemo(() => {
    if (view === 'years') return buildYearMetrics(bucket.monthly, stats.years)
    if (view === 'months' && monthRows.length > 0) {
      const last = monthRows[monthRows.length - 1]
      return [
        {
          label: `${last.label} volume`,
          value: formatDistance(last.completed),
          delta: 'latest month in view',
          up: null,
        },
        {
          label: 'Year total',
          value: formatDistance(monthRows.reduce((s, m) => s + m.completed, 0)),
          delta: `${monthRows.length} months`,
          up: null,
        },
      ]
    }
    return buildWeekMetrics(weeks)
  }, [view, bucket.monthly, stats.years, monthRows, weeks])

  const sportOptions: { id: WorkoutType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All' },
    ...stats.sports.map((s) => ({ id: s, label: WORKOUT_TYPE_LABELS[s] })),
  ]

  const subtitle =
    view === 'years'
      ? 'How volume changes year to year'
      : view === 'months'
        ? 'Compare months within a year'
        : 'Planned vs completed volume by week'

  return (
    <section id="trends" className={cn('scroll-mt-24 space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle>Trends</SectionTitle>
          <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">{subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <ToolbarFilterGroup label="View" hint="Weeks, months in a year, or year over year">
            {(
              [
                ['weeks', 'Weeks'],
                ['months', 'Months'],
                ['years', 'Years'],
              ] as const
            ).map(([id, label]) => (
              <ToolbarTextToggle key={id} pressed={view === id} onClick={() => setView(id)}>
                {label}
              </ToolbarTextToggle>
            ))}
          </ToolbarFilterGroup>

          {view !== 'years' ? (
            <>
              <ToolbarDivider className="mx-0.5 mb-1.5" />
              <ToolbarFilterGroup label="Year" hint="Season year">
                {stats.years.map((y) => (
                  <ToolbarTextToggle key={y} pressed={year === y} onClick={() => setYear(y)}>
                    {y}
                  </ToolbarTextToggle>
                ))}
              </ToolbarFilterGroup>
            </>
          ) : null}

          {view === 'weeks' ? (
            <>
              <ToolbarDivider className="mx-0.5 mb-1.5" />
              <ToolbarFilterGroup label="Range" hint="Chart time range">
                {(
                  [
                    ['4w', '4 weeks'],
                    ['12w', '12 weeks'],
                    ['ytd', 'YTD'],
                  ] as const
                ).map(([id, label]) => (
                  <ToolbarTextToggle key={id} pressed={range === id} onClick={() => setRange(id)}>
                    {label}
                  </ToolbarTextToggle>
                ))}
              </ToolbarFilterGroup>
            </>
          ) : null}

          <ToolbarDivider className="mx-0.5 mb-1.5" />
          <ToolbarFilterGroup label="Sport" hint="Filter chart by sport">
            {sportOptions.map((option) => (
              <ToolbarTextToggle
                key={option.id}
                pressed={sport === option.id}
                onClick={() => setSport(option.id)}
              >
                {option.label}
              </ToolbarTextToggle>
            ))}
          </ToolbarFilterGroup>
        </div>
      </div>

      {view === 'years' ? (
        <YearCompareChart months={bucket.monthly} sport={sport} years={stats.years} />
      ) : view === 'months' ? (
        <MonthVolumeChart months={monthRows} sport={sport} year={year} />
      ) : (
        <VolumeChart weeks={weeks} sport={sport} year={year} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[8px] border border-[var(--tt-line)] bg-white px-3.5 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
              {m.label}
            </p>
            <p className="mt-1.5 text-[1.35rem] font-semibold tabular-nums leading-none text-[var(--tt-ink)]">
              {m.value}
            </p>
            <p
              className={cn(
                'mt-2 text-[11px]',
                m.up === true
                  ? 'text-[var(--tt-good)]'
                  : m.up === false
                    ? 'text-[var(--tt-ink-soft)]'
                    : 'text-[var(--tt-ink-faint)]',
              )}
            >
              {m.delta}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
