'use client'

import { useMemo, useState } from 'react'
import {
  ToolbarDivider,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { cn } from '@/lib/utils'
import {
  PersonalBestsMockSection,
  RaceResultsMockSection,
} from './results-mock-content'

type RangeId = '4w' | '12w' | 'ytd'
type SportId = 'all' | 'Run' | 'Bike' | 'Swim'
type YearId = '2026' | '2025' | '2024'
/** Weeks = weekly bars · Months = compare months in a year · Years = YoY */
type ViewId = 'weeks' | 'months' | 'years'

type WeekPoint = {
  label: string
  range: string
  planned: number
  completed: number
  sessionsDone: number
  sessionsPlanned: number
  hours: number
}

type MonthPoint = {
  label: string
  /** Completed volume per year key */
  byYear: Record<'2024' | '2025' | '2026', number>
}

type MonthVolume = {
  label: string
  planned: number
  completed: number
}

/** Scale factors so each year reads differently in the weekly mock. */
const YEAR_SCALE: Record<'2024' | '2025' | '2026', number> = {
  '2024': 0.58,
  '2025': 0.78,
  '2026': 1,
}

const YEAR_COLORS: Record<'2024' | '2025' | '2026', string> = {
  '2024': 'var(--tt-ink-faint)',
  '2025': 'var(--tt-ink-soft)',
  '2026': 'var(--tt-sport-run)',
}

/** Mock weekly volume — labels are ISO week-of-year (not a 1…n window index). */
const RUN_WEEKS: WeekPoint[] = [
  { label: 'W23', range: '1–7 Jun', planned: 36, completed: 32, sessionsDone: 5, sessionsPlanned: 5, hours: 3.8 },
  { label: 'W24', range: '8–14 Jun', planned: 42, completed: 41, sessionsDone: 6, sessionsPlanned: 6, hours: 4.6 },
  { label: 'W25', range: '15–21 Jun', planned: 40, completed: 38, sessionsDone: 5, sessionsPlanned: 6, hours: 4.2 },
  { label: 'W26', range: '22–28 Jun', planned: 48, completed: 52, sessionsDone: 6, sessionsPlanned: 6, hours: 5.4 },
  { label: 'W27', range: '29 Jun–5 Jul', planned: 50, completed: 47, sessionsDone: 6, sessionsPlanned: 6, hours: 5.1 },
  { label: 'W28', range: '6–12 Jul', planned: 46, completed: 44, sessionsDone: 5, sessionsPlanned: 5, hours: 4.8 },
  { label: 'W29', range: '13–19 Jul', planned: 55, completed: 58, sessionsDone: 7, sessionsPlanned: 7, hours: 6.2 },
  { label: 'W30', range: '20–26 Jul', planned: 52, completed: 51, sessionsDone: 6, sessionsPlanned: 6, hours: 5.5 },
  { label: 'W31', range: '27 Jul–2 Aug', planned: 48, completed: 49, sessionsDone: 6, sessionsPlanned: 6, hours: 5.3 },
  { label: 'W32', range: '3–9 Aug', planned: 60, completed: 62, sessionsDone: 7, sessionsPlanned: 7, hours: 6.8 },
  { label: 'W33', range: '10–16 Aug', planned: 54, completed: 55, sessionsDone: 6, sessionsPlanned: 6, hours: 5.9 },
  { label: 'W34', range: '17–23 Aug', planned: 52, completed: 48, sessionsDone: 5, sessionsPlanned: 6, hours: 5.2 },
]

const BIKE_WEEKS: WeekPoint[] = [
  { label: 'W23', range: '1–7 Jun', planned: 120, completed: 98, sessionsDone: 2, sessionsPlanned: 3, hours: 3.2 },
  { label: 'W24', range: '8–14 Jun', planned: 140, completed: 142, sessionsDone: 3, sessionsPlanned: 3, hours: 4.5 },
  { label: 'W25', range: '15–21 Jun', planned: 130, completed: 110, sessionsDone: 2, sessionsPlanned: 3, hours: 3.6 },
  { label: 'W26', range: '22–28 Jun', planned: 160, completed: 168, sessionsDone: 3, sessionsPlanned: 3, hours: 5.1 },
  { label: 'W27', range: '29 Jun–5 Jul', planned: 150, completed: 145, sessionsDone: 3, sessionsPlanned: 3, hours: 4.8 },
  { label: 'W28', range: '6–12 Jul', planned: 140, completed: 140, sessionsDone: 3, sessionsPlanned: 3, hours: 4.4 },
  { label: 'W29', range: '13–19 Jul', planned: 180, completed: 172, sessionsDone: 3, sessionsPlanned: 4, hours: 5.6 },
  { label: 'W30', range: '20–26 Jul', planned: 160, completed: 155, sessionsDone: 3, sessionsPlanned: 3, hours: 5.0 },
  { label: 'W31', range: '27 Jul–2 Aug', planned: 150, completed: 148, sessionsDone: 3, sessionsPlanned: 3, hours: 4.7 },
  { label: 'W32', range: '3–9 Aug', planned: 170, completed: 180, sessionsDone: 3, sessionsPlanned: 3, hours: 5.8 },
  { label: 'W33', range: '10–16 Aug', planned: 160, completed: 140, sessionsDone: 2, sessionsPlanned: 3, hours: 4.5 },
  { label: 'W34', range: '17–23 Aug', planned: 160, completed: 152, sessionsDone: 3, sessionsPlanned: 3, hours: 4.9 },
]

const SWIM_WEEKS: WeekPoint[] = [
  { label: 'W23', range: '1–7 Jun', planned: 4.0, completed: 3.2, sessionsDone: 2, sessionsPlanned: 2, hours: 1.4 },
  { label: 'W24', range: '8–14 Jun', planned: 4.5, completed: 4.5, sessionsDone: 2, sessionsPlanned: 2, hours: 1.8 },
  { label: 'W25', range: '15–21 Jun', planned: 4.0, completed: 3.8, sessionsDone: 2, sessionsPlanned: 2, hours: 1.5 },
  { label: 'W26', range: '22–28 Jun', planned: 5.0, completed: 5.2, sessionsDone: 3, sessionsPlanned: 3, hours: 2.1 },
  { label: 'W27', range: '29 Jun–5 Jul', planned: 4.5, completed: 4.0, sessionsDone: 2, sessionsPlanned: 2, hours: 1.6 },
  { label: 'W28', range: '6–12 Jul', planned: 4.0, completed: 4.0, sessionsDone: 2, sessionsPlanned: 2, hours: 1.5 },
  { label: 'W29', range: '13–19 Jul', planned: 5.5, completed: 5.0, sessionsDone: 2, sessionsPlanned: 3, hours: 2.0 },
  { label: 'W30', range: '20–26 Jul', planned: 5.0, completed: 5.1, sessionsDone: 3, sessionsPlanned: 3, hours: 2.0 },
  { label: 'W31', range: '27 Jul–2 Aug', planned: 4.5, completed: 4.6, sessionsDone: 2, sessionsPlanned: 2, hours: 1.8 },
  { label: 'W32', range: '3–9 Aug', planned: 5.5, completed: 5.8, sessionsDone: 3, sessionsPlanned: 3, hours: 2.3 },
  { label: 'W33', range: '10–16 Aug', planned: 5.0, completed: 4.2, sessionsDone: 2, sessionsPlanned: 2, hours: 1.7 },
  { label: 'W34', range: '17–23 Aug', planned: 4.5, completed: 4.0, sessionsDone: 2, sessionsPlanned: 2, hours: 1.6 },
]

function mergeAllSports(a: WeekPoint[], b: WeekPoint[], c: WeekPoint[]): WeekPoint[] {
  return a.map((w, i) => ({
    label: w.label,
    range: w.range,
    planned: w.planned + b[i].planned + c[i].planned,
    completed: w.completed + b[i].completed + c[i].completed,
    sessionsDone: w.sessionsDone + b[i].sessionsDone + c[i].sessionsDone,
    sessionsPlanned: w.sessionsPlanned + b[i].sessionsPlanned + c[i].sessionsPlanned,
    hours: +(w.hours + b[i].hours + c[i].hours).toFixed(1),
  }))
}

const ALL_WEEKS = mergeAllSports(RUN_WEEKS, BIKE_WEEKS, SWIM_WEEKS)

/** Monthly completed km — year-over-year mock (clearer gaps between years). */
const RUN_MONTHS: MonthPoint[] = [
  { label: 'Jan', byYear: { '2024': 62, '2025': 95, '2026': 128 } },
  { label: 'Feb', byYear: { '2024': 70, '2025': 102, '2026': 138 } },
  { label: 'Mar', byYear: { '2024': 88, '2025': 118, '2026': 162 } },
  { label: 'Apr', byYear: { '2024': 95, '2025': 135, '2026': 178 } },
  { label: 'May', byYear: { '2024': 108, '2025': 148, '2026': 195 } },
  { label: 'Jun', byYear: { '2024': 115, '2025': 155, '2026': 210 } },
  { label: 'Jul', byYear: { '2024': 122, '2025': 168, '2026': 235 } },
  { label: 'Aug', byYear: { '2024': 100, '2025': 142, '2026': 198 } },
  { label: 'Sep', byYear: { '2024': 98, '2025': 138, '2026': 0 } },
  { label: 'Oct', byYear: { '2024': 85, '2025': 125, '2026': 0 } },
  { label: 'Nov', byYear: { '2024': 68, '2025': 105, '2026': 0 } },
  { label: 'Dec', byYear: { '2024': 55, '2025': 88, '2026': 0 } },
]

const BIKE_MONTHS: MonthPoint[] = [
  { label: 'Jan', byYear: { '2024': 140, '2025': 220, '2026': 310 } },
  { label: 'Feb', byYear: { '2024': 155, '2025': 245, '2026': 340 } },
  { label: 'Mar', byYear: { '2024': 210, '2025': 310, '2026': 430 } },
  { label: 'Apr', byYear: { '2024': 250, '2025': 360, '2026': 500 } },
  { label: 'May', byYear: { '2024': 290, '2025': 420, '2026': 580 } },
  { label: 'Jun', byYear: { '2024': 340, '2025': 480, '2026': 680 } },
  { label: 'Jul', byYear: { '2024': 380, '2025': 540, '2026': 760 } },
  { label: 'Aug', byYear: { '2024': 350, '2025': 500, '2026': 700 } },
  { label: 'Sep', byYear: { '2024': 300, '2025': 450, '2026': 0 } },
  { label: 'Oct', byYear: { '2024': 220, '2025': 340, '2026': 0 } },
  { label: 'Nov', byYear: { '2024': 160, '2025': 260, '2026': 0 } },
  { label: 'Dec', byYear: { '2024': 120, '2025': 190, '2026': 0 } },
]

const SWIM_MONTHS: MonthPoint[] = [
  { label: 'Jan', byYear: { '2024': 4, '2025': 8, '2026': 14 } },
  { label: 'Feb', byYear: { '2024': 5, '2025': 9, '2026': 15 } },
  { label: 'Mar', byYear: { '2024': 7, '2025': 11, '2026': 18 } },
  { label: 'Apr', byYear: { '2024': 8, '2025': 13, '2026': 20 } },
  { label: 'May', byYear: { '2024': 9, '2025': 15, '2026': 23 } },
  { label: 'Jun', byYear: { '2024': 10, '2025': 17, '2026': 26 } },
  { label: 'Jul', byYear: { '2024': 12, '2025': 19, '2026': 28 } },
  { label: 'Aug', byYear: { '2024': 10, '2025': 16, '2026': 25 } },
  { label: 'Sep', byYear: { '2024': 8, '2025': 14, '2026': 0 } },
  { label: 'Oct', byYear: { '2024': 6, '2025': 11, '2026': 0 } },
  { label: 'Nov', byYear: { '2024': 5, '2025': 9, '2026': 0 } },
  { label: 'Dec', byYear: { '2024': 4, '2025': 7, '2026': 0 } },
]

function mergeMonthSports(a: MonthPoint[], b: MonthPoint[], c: MonthPoint[]): MonthPoint[] {
  return a.map((m, i) => ({
    label: m.label,
    byYear: {
      '2024': +(m.byYear['2024'] + b[i].byYear['2024'] + c[i].byYear['2024']).toFixed(1),
      '2025': +(m.byYear['2025'] + b[i].byYear['2025'] + c[i].byYear['2025']).toFixed(1),
      '2026': +(m.byYear['2026'] + b[i].byYear['2026'] + c[i].byYear['2026']).toFixed(1),
    },
  }))
}

const ALL_MONTHS = mergeMonthSports(RUN_MONTHS, BIKE_MONTHS, SWIM_MONTHS)

function weeksForSport(sport: SportId): WeekPoint[] {
  if (sport === 'Run') return RUN_WEEKS
  if (sport === 'Bike') return BIKE_WEEKS
  if (sport === 'Swim') return SWIM_WEEKS
  return ALL_WEEKS
}

function monthsForSport(sport: SportId): MonthPoint[] {
  if (sport === 'Run') return RUN_MONTHS
  if (sport === 'Bike') return BIKE_MONTHS
  if (sport === 'Swim') return SWIM_MONTHS
  return ALL_MONTHS
}

function scaleWeeks(weeks: WeekPoint[], year: '2024' | '2025' | '2026'): WeekPoint[] {
  const s = YEAR_SCALE[year]
  return weeks.map((w) => ({
    ...w,
    planned: +(w.planned * s).toFixed(1),
    completed: +(w.completed * s).toFixed(1),
    hours: +(w.hours * s).toFixed(1),
    sessionsDone: Math.max(1, Math.round(w.sessionsDone * s)),
    sessionsPlanned: w.sessionsPlanned,
  }))
}

function sliceForRange(weeks: WeekPoint[], range: RangeId): WeekPoint[] {
  if (range === '4w') return weeks.slice(-4)
  if (range === '12w') return weeks.slice(-12)
  return weeks // ytd mock = full 12w set
}

/** Month rows for a single year — planned vs completed (compare months). */
function monthVolumeForYear(
  months: MonthPoint[],
  year: YearId,
): MonthVolume[] {
  return months
    .filter((m) => year !== '2026' || m.byYear[year] > 0)
    .map((m, i) => {
      const completed = m.byYear[year]
      const factor = 1.05 + (i % 4) * 0.025
      const planned = completed > 0 ? +(completed * factor).toFixed(1) : 0
      return { label: m.label, planned, completed }
    })
}

function unitForSport(sport: SportId): string {
  return 'km'
}

function fmtDist(n: number, sport: SportId): string {
  if (sport === 'Swim') {
    return Number.isInteger(n) ? `${n}` : n.toFixed(1)
  }
  return Number.isInteger(n) ? `${n}` : Math.round(n).toString()
}

function formatHours(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`
}

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-0.5"
      title={hint}
      role="group"
      aria-label={label}
    >
      <span className="px-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/55">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

function sportColor(sport: SportId): string {
  if (sport === 'Bike') return 'var(--tt-sport-bike)'
  if (sport === 'Swim') return 'var(--tt-sport-swim)'
  if (sport === 'Run') return 'var(--tt-sport-run)'
  return 'var(--tt-ink)'
}

function yearBarColor(year: '2024' | '2025' | '2026', sport: SportId): string {
  if (year === '2026') return sportColor(sport)
  return YEAR_COLORS[year]
}

/** Bar that eases from current height to the next filter value. */
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
      style={{
        ...style,
        height: `${Math.max(0, heightPct)}%`,
      }}
    />
  )
}

/** Hover detail for a chart column. */
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
  weeks: WeekPoint[]
  sport: SportId
  year: '2024' | '2025' | '2026'
}) {
  const max = Math.max(...weeks.flatMap((w) => [w.planned, w.completed]), 1)
  const unit = unitForSport(sport)
  const color = sportColor(sport)
  const totalCompleted = weeks.reduce((s, w) => s + w.completed, 0)
  const prior = weeks.slice(0, Math.max(0, weeks.length - 4))
  const recent = weeks.slice(-4)
  const priorAvg =
    prior.length > 0 ? prior.reduce((s, w) => s + w.completed, 0) / prior.length : 0
  const recentAvg =
    recent.length > 0 ? recent.reduce((s, w) => s + w.completed, 0) / recent.length : 0
  const deltaPct =
    priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0

  const sportLabel =
    sport === 'all' ? 'All sports' : sport === 'Run' ? 'Run' : sport === 'Bike' ? 'Bike' : 'Swim'

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Weekly volume · {year}
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · week of year · planned vs completed ({unit})
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            {fmtDist(totalCompleted, sport)} {unit} total
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
          <span
            className="h-2.5 w-2.5 rounded-[2px] bg-[var(--tt-ink-faint)]/45"
            aria-hidden
          />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
          Completed
        </span>
      </div>

      <div
        className="mt-5 flex h-52 items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label={`Bar chart of planned versus completed weekly training distance for ${year}`}
      >
        {weeks.map((w) => {
          const plannedH = (w.planned / max) * 100
          const completedH = (w.completed / max) * 100
          return (
            <div
              key={w.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="mb-0.5 text-[9px] font-medium tabular-nums text-[var(--tt-ink-soft)] opacity-0 transition group-hover:opacity-100 sm:opacity-100">
                {fmtDist(w.completed, sport)}
              </span>
              <div className="relative flex h-40 w-full items-end justify-center gap-0.5">
                <ChartColumnTooltip
                  title={`${w.label} · ${w.range}`}
                  rows={[
                    { label: 'Planned', value: `${fmtDist(w.planned, sport)} ${unit}` },
                    { label: 'Completed', value: `${fmtDist(w.completed, sport)} ${unit}` },
                    {
                      label: 'Sessions',
                      value: `${w.sessionsDone}/${w.sessionsPlanned}`,
                    },
                    { label: 'Duration', value: formatHours(w.hours) },
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
              <span className="text-[9px] font-medium tabular-nums text-[var(--tt-ink)]">
                {w.label}
              </span>
              <span className="hidden text-[8px] tabular-nums text-[var(--tt-ink-faint)] sm:block">
                {w.range.split('–')[0]?.trim() ?? w.range}
              </span>
            </div>
          )
        })}
      </div>

      {weeks.length > 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
          Latest week ({weeks[weeks.length - 1].range}): planned{' '}
          {fmtDist(weeks[weeks.length - 1].planned, sport)} {unit}, completed{' '}
          {fmtDist(weeks[weeks.length - 1].completed, sport)} {unit}
          {' · '}
          {weeks[weeks.length - 1].sessionsDone}/{weeks[weeks.length - 1].sessionsPlanned} sessions.
        </p>
      ) : null}
    </div>
  )
}

function MonthVolumeChart({
  months,
  sport,
  year,
}: {
  months: MonthVolume[]
  sport: SportId
  year: YearId
}) {
  const max = Math.max(...months.flatMap((m) => [m.planned, m.completed]), 1)
  const unit = unitForSport(sport)
  const color = sportColor(sport)
  const totalCompleted = months.reduce((s, m) => s + m.completed, 0)
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const momPct =
    last && prev && prev.completed > 0
      ? Math.round(((last.completed - prev.completed) / prev.completed) * 100)
      : 0

  const sportLabel =
    sport === 'all' ? 'All sports' : sport === 'Run' ? 'Run' : sport === 'Bike' ? 'Bike' : 'Swim'

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Monthly volume · {year}
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · compare months · planned vs completed ({unit})
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            {fmtDist(totalCompleted, sport)} {unit} total
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

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--tt-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-[2px] bg-[var(--tt-ink-faint)]/45"
            aria-hidden
          />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
          Completed
        </span>
      </div>

      <div
        className="mt-5 flex h-52 items-end gap-1 sm:gap-1.5"
        role="img"
        aria-label={`Bar chart of monthly training volume for ${year}`}
      >
        {months.map((m) => {
          const plannedH = (m.planned / max) * 100
          const completedH = (m.completed / max) * 100
          const pct =
            m.planned > 0 ? Math.round((m.completed / m.planned) * 100) : 0
          return (
            <div
              key={m.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="mb-0.5 text-[9px] font-medium tabular-nums text-[var(--tt-ink-soft)] opacity-0 transition group-hover:opacity-100 sm:opacity-100">
                {fmtDist(m.completed, sport)}
              </span>
              <div className="relative flex h-40 w-full items-end justify-center gap-0.5">
                <ChartColumnTooltip
                  title={`${m.label} ${year}`}
                  rows={[
                    { label: 'Planned', value: `${fmtDist(m.planned, sport)} ${unit}` },
                    { label: 'Completed', value: `${fmtDist(m.completed, sport)} ${unit}` },
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

      {last ? (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
          Peak month in view:{' '}
          {
            months.reduce((a, b) => (b.completed > a.completed ? b : a), months[0]).label
          }{' '}
          ({fmtDist(months.reduce((a, b) => (b.completed > a.completed ? b : a), months[0]).completed, sport)}{' '}
          {unit}). Switch year to compare another season’s month pattern.
        </p>
      ) : null}
    </div>
  )
}

function YearCompareChart({ months, sport }: { months: MonthPoint[]; sport: SportId }) {
  const years = ['2024', '2025', '2026'] as const
  const unit = unitForSport(sport)
  const sportLabel =
    sport === 'all' ? 'All sports' : sport === 'Run' ? 'Run' : sport === 'Bike' ? 'Bike' : 'Swim'

  const visible = months.filter((m) => years.some((y) => m.byYear[y] > 0))
  const max = Math.max(...visible.flatMap((m) => years.map((y) => m.byYear[y])), 1)

  const totals = Object.fromEntries(
    years.map((y) => [y, months.reduce((s, m) => s + m.byYear[y], 0)]),
  ) as Record<(typeof years)[number], number>

  const yoyPct =
    totals['2025'] > 0
      ? Math.round(((totals['2026'] - totals['2025']) / totals['2025']) * 100)
      : 0

  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            Year over year
          </p>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {sportLabel} · monthly completed volume ({unit})
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
            2026 YTD {fmtDist(totals['2026'], sport)} {unit}
          </p>
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
            {yoyPct > 0 ? '↑' : yoyPct < 0 ? '↓' : '→'} {Math.abs(yoyPct)}% vs 2025 same period
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--tt-ink-soft)]">
        {years.map((y) => (
          <span key={y} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: yearBarColor(y, sport), opacity: y === '2026' ? 0.85 : 0.55 }}
              aria-hidden
            />
            {y}
            <span className="tabular-nums text-[var(--tt-ink-faint)]">
              {fmtDist(totals[y], sport)} {unit}
            </span>
          </span>
        ))}
      </div>

      <div
        className="mt-5 flex h-52 items-end gap-1 sm:gap-1.5"
        role="img"
        aria-label="Bar chart comparing monthly training volume across years"
      >
        {visible.map((m) => (
          <div
            key={m.label}
            className="group relative flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div className="relative flex h-40 w-full items-end justify-center gap-px sm:gap-0.5">
              <ChartColumnTooltip
                title={m.label}
                rows={years.map((y) => ({
                  label: y,
                  value:
                    m.byYear[y] > 0
                      ? `${fmtDist(m.byYear[y], sport)} ${unit}`
                      : '—',
                }))}
              />
              {years.map((y) => {
                const v = m.byYear[y]
                const h = v > 0 ? (v / max) * 100 : 0
                return (
                  <ChartBar
                    key={y}
                    heightPct={h}
                    className="w-[28%] max-w-[0.85rem] rounded-t-[2px]"
                    style={{
                      background: yearBarColor(y, sport),
                      opacity: y === '2026' ? 0.9 : y === '2025' ? 0.55 : 0.35,
                    }}
                  />
                )
              })}
            </div>
            <span className="text-[9px] font-medium text-[var(--tt-ink)]">{m.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
        Compare the same month across years — e.g. Aug 2024{' '}
        {fmtDist(visible.find((m) => m.label === 'Aug')?.byYear['2024'] ?? 0, sport)} {unit} → 2025{' '}
        {fmtDist(visible.find((m) => m.label === 'Aug')?.byYear['2025'] ?? 0, sport)} {unit} → 2026{' '}
        {fmtDist(visible.find((m) => m.label === 'Aug')?.byYear['2026'] ?? 0, sport)} {unit}. Empty
        2026 months are still ahead.
      </p>
    </div>
  )
}

function buildMetrics(weeks: WeekPoint[], sport: SportId) {
  const last = weeks[weeks.length - 1]
  const prev = weeks[weeks.length - 2]
  if (!last) {
    return []
  }
  const volumeDelta = prev
    ? Math.round(((last.completed - prev.completed) / Math.max(prev.completed, 1)) * 100)
    : 0
  const hoursDeltaMin = prev ? Math.round((last.hours - prev.hours) * 60) : 0
  const completion = Math.round((last.sessionsDone / Math.max(last.sessionsPlanned, 1)) * 100)
  const prevCompletion = prev
    ? Math.round((prev.sessionsDone / Math.max(prev.sessionsPlanned, 1)) * 100)
    : completion
  const completionDelta = completion - prevCompletion

  return [
    {
      label: 'Volume',
      value: `${fmtDist(last.completed, sport)} ${unitForSport(sport)}`,
      delta:
        volumeDelta === 0
          ? 'same as last week'
          : `${volumeDelta > 0 ? '+' : ''}${volumeDelta}% vs last week`,
      up: volumeDelta === 0 ? null : volumeDelta > 0,
    },
    {
      label: 'Duration',
      value: formatHours(last.hours),
      delta:
        hoursDeltaMin === 0
          ? 'same as last week'
          : `${hoursDeltaMin > 0 ? '+' : ''}${hoursDeltaMin} min`,
      up: hoursDeltaMin === 0 ? null : hoursDeltaMin > 0,
    },
    {
      label: 'Completion',
      value: `${completion}%`,
      delta:
        completionDelta === 0
          ? 'same as last week'
          : `${completionDelta > 0 ? '+' : ''}${completionDelta}% vs last week`,
      up: completionDelta === 0 ? null : completionDelta > 0,
    },
    {
      label: 'Sessions',
      value: `${last.sessionsDone}`,
      delta: prev
        ? last.sessionsDone === prev.sessionsDone
          ? 'same as last week'
          : `${last.sessionsDone > prev.sessionsDone ? '+' : ''}${last.sessionsDone - prev.sessionsDone} vs last week`
        : 'this week',
      up: prev
        ? last.sessionsDone === prev.sessionsDone
          ? null
          : last.sessionsDone > prev.sessionsDone
        : null,
    },
  ] as const
}

function buildYearMetrics(months: MonthPoint[], sport: SportId) {
  const unit = unitForSport(sport)
  const t24 = months.reduce((s, m) => s + m.byYear['2024'], 0)
  const t25 = months.reduce((s, m) => s + m.byYear['2025'], 0)
  const t26 = months.reduce((s, m) => s + m.byYear['2026'], 0)
  const ytdMonths = months.filter((m) => m.byYear['2026'] > 0)
  const ytd25 = ytdMonths.reduce((s, m) => s + m.byYear['2025'], 0)
  const ytd24 = ytdMonths.reduce((s, m) => s + m.byYear['2024'], 0)
  const yoy = ytd25 > 0 ? Math.round(((t26 - ytd25) / ytd25) * 100) : 0
  const vs24 = ytd24 > 0 ? Math.round(((t26 - ytd24) / ytd24) * 100) : 0

  return [
    {
      label: '2026 YTD',
      value: `${fmtDist(t26, sport)} ${unit}`,
      delta: `${yoy > 0 ? '+' : ''}${yoy}% vs 2025 YTD`,
      up: yoy === 0 ? null : yoy > 0,
    },
    {
      label: '2025 total',
      value: `${fmtDist(t25, sport)} ${unit}`,
      delta: 'full year',
      up: null,
    },
    {
      label: '2024 total',
      value: `${fmtDist(t24, sport)} ${unit}`,
      delta: 'full year',
      up: null,
    },
    {
      label: 'vs 2024',
      value: `${vs24 > 0 ? '+' : ''}${vs24}%`,
      delta: '2026 YTD vs same months',
      up: vs24 === 0 ? null : vs24 > 0,
    },
  ] as const
}

function buildMonthMetrics(months: MonthVolume[], sport: SportId) {
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  if (!last) return []

  const total = months.reduce((s, m) => s + m.completed, 0)
  const peak = months.reduce((a, b) => (b.completed > a.completed ? b : a), months[0])
  const momPct =
    prev && prev.completed > 0
      ? Math.round(((last.completed - prev.completed) / prev.completed) * 100)
      : 0
  const completion = last.planned > 0 ? Math.round((last.completed / last.planned) * 100) : 0
  const prevCompletion =
    prev && prev.planned > 0 ? Math.round((prev.completed / prev.planned) * 100) : completion
  const completionDelta = completion - prevCompletion

  return [
    {
      label: `${last.label} volume`,
      value: `${fmtDist(last.completed, sport)} ${unitForSport(sport)}`,
      delta:
        momPct === 0
          ? 'same as prior month'
          : `${momPct > 0 ? '+' : ''}${momPct}% vs ${prev?.label ?? 'prior'}`,
      up: momPct === 0 ? null : momPct > 0,
    },
    {
      label: 'Year total',
      value: `${fmtDist(total, sport)} ${unitForSport(sport)}`,
      delta: `${months.length} months in view`,
      up: null,
    },
    {
      label: 'Peak month',
      value: peak.label,
      delta: `${fmtDist(peak.completed, sport)} ${unitForSport(sport)}`,
      up: null,
    },
    {
      label: 'Completion',
      value: `${completion}%`,
      delta:
        completionDelta === 0
          ? 'same as prior month'
          : `${completionDelta > 0 ? '+' : ''}${completionDelta}% vs prior`,
      up: completionDelta === 0 ? null : completionDelta > 0,
    },
  ] as const
}

/**
 * Unified Stats page mock — Trends (2/3) + Personal bests (1/3), then Race results.
 */
export function StatsMockContent() {
  const [view, setView] = useState<ViewId>('years')
  const [range, setRange] = useState<RangeId>('12w')
  const [sport, setSport] = useState<SportId>('Run')
  const [year, setYear] = useState<YearId>('2026')

  const months = useMemo(() => monthsForSport(sport), [sport])
  const monthRows = useMemo(() => monthVolumeForYear(months, year), [months, year])

  const weeks = useMemo(() => {
    if (view !== 'weeks') return []
    return sliceForRange(scaleWeeks(weeksForSport(sport), year), range)
  }, [sport, range, year, view])

  const metrics = useMemo(() => {
    if (view === 'years') return buildYearMetrics(months, sport)
    if (view === 'months') return buildMonthMetrics(monthRows, sport)
    return buildMetrics(weeks, sport)
  }, [view, months, monthRows, weeks, sport])

  const subtitle =
    view === 'years'
      ? 'How volume changes year to year'
      : view === 'months'
        ? 'Compare months within a year'
        : 'Planned vs completed volume by week'

  return (
    <div className="space-y-10">
      <header className="space-y-2 pt-1">
        <h1 className="tt-mock-h1 !text-5xl">Stats.</h1>
        <p className="max-w-lg text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
          Training trends, personal bests, and race results — one place to review progress.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-6 xl:gap-8">
        <section id="trends" className="scroll-mt-24 space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="tt-mock-section-title">Trends</h2>
              <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">{subtitle}</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <FilterGroup label="View" hint="Weeks, months in a year, or year over year">
                {(
                  [
                    ['weeks', 'Weeks'],
                    ['months', 'Months'],
                    ['years', 'Years'],
                  ] as const
                ).map(([id, label]) => (
                  <ToolbarTextToggle
                    key={id}
                    pressed={view === id}
                    onClick={() => setView(id)}
                    title={
                      id === 'years'
                        ? 'Compare years'
                        : id === 'months'
                          ? 'Compare months'
                          : 'Weekly volume'
                    }
                  >
                    {label}
                  </ToolbarTextToggle>
                ))}
              </FilterGroup>

              {view !== 'years' ? (
                <>
                  <ToolbarDivider className="mb-1.5 mx-0.5" />
                  <FilterGroup label="Year" hint="Season year">
                    {(['2026', '2025', '2024'] as const).map((y) => (
                      <ToolbarTextToggle
                        key={y}
                        pressed={year === y}
                        onClick={() => setYear(y)}
                        title={y}
                      >
                        {y}
                      </ToolbarTextToggle>
                    ))}
                  </FilterGroup>
                </>
              ) : null}

              {view === 'weeks' ? (
                <>
                  <ToolbarDivider className="mb-1.5 mx-0.5" />
                  <FilterGroup label="Range" hint="Chart time range">
                    {(
                      [
                        ['4w', '4 weeks'],
                        ['12w', '12 weeks'],
                        ['ytd', 'YTD'],
                      ] as const
                    ).map(([id, label]) => (
                      <ToolbarTextToggle
                        key={id}
                        pressed={range === id}
                        onClick={() => setRange(id)}
                        title={label}
                      >
                        {label}
                      </ToolbarTextToggle>
                    ))}
                  </FilterGroup>
                </>
              ) : null}

              <ToolbarDivider className="mb-1.5 mx-0.5" />
              <FilterGroup label="Sport" hint="Filter chart by sport">
                {(['all', 'Run', 'Bike', 'Swim'] as const).map((s) => (
                  <ToolbarTextToggle
                    key={s}
                    pressed={sport === s}
                    onClick={() => setSport(s)}
                    title={s === 'all' ? 'All sports' : s}
                  >
                    {s === 'all' ? 'All' : s}
                  </ToolbarTextToggle>
                ))}
              </FilterGroup>
            </div>
          </div>

          {view === 'years' ? (
            <YearCompareChart months={months} sport={sport} />
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

        <div className="min-w-0 lg:col-span-1">
          <PersonalBestsMockSection layout="panel" />
        </div>
      </div>

      <RaceResultsMockSection />
    </div>
  )
}
