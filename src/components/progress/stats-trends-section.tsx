'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { WorkoutType } from '@prisma/client'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import {
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { DateField } from '@/components/ui/date-field'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import type {
  ProgressMonthBucket,
  ProgressMonthRow,
  ProgressSportBucket,
  ProgressStats,
  ProgressWeekBucket,
} from '@/lib/progress-stats'
import { sportColors } from '@/lib/design-tokens'
import {
  formatDateKeyLong,
  parseDateOnly,
  toDateKey,
  todayDateKey,
} from '@/lib/dates'
import { useUnitSystem } from '@/components/units/units-context'
import type { UnitSystem } from '@/lib/units'
import { cn, formatDistance, formatDuration } from '@/lib/utils'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'

type ViewId = 'weeks' | 'months' | 'years'

/** Aim for a full chart band — never drop to a handful of skinny columns. */
const MIN_CHART_CATEGORIES = 12

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

function fmtDist(km: number): string {
  if (km <= 0) return '0'
  return km % 1 === 0 ? `${km}` : km.toFixed(1)
}

/** Compact value above a bar — always visible (no hover required). */
function fmtBarValue(volume: number, asHours: boolean): string {
  if (volume <= 0) return '—'
  if (asHours) {
    const h = volume
    return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`
  }
  if (volume >= 100) return `${Math.round(volume)}`
  return fmtDist(volume)
}

function volumeUsesHours(
  distanceKm: number,
  durationMin: number,
  sport: WorkoutType | 'ALL',
): boolean {
  if (distanceKm > 0) return false
  if (durationMin <= 0) return false
  return sport === 'ALL' || !sportUsesPlannedDistance(sport)
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

function defaultPeriod(years: number[]): { from: string; to: string } {
  const latest = years.length > 0 ? Math.max(...years) : new Date().getUTCFullYear()
  const today = todayDateKey()
  const from = `${latest}-01-01`
  const to = latest === Number(today.slice(0, 4)) ? today : `${latest}-12-31`
  return { from, to }
}

function dataPeriodBounds(years: number[]): { min: string; max: string } {
  const minY = years.length > 0 ? Math.min(...years) : new Date().getUTCFullYear()
  return { min: `${minY}-01-01`, max: todayDateKey() }
}

function shiftPeriodByYears(
  from: string,
  to: string,
  delta: number,
  bounds: { min: string; max: string },
): { from: string; to: string } {
  const f = parseDateOnly(from)
  const t = parseDateOnly(to)
  const sameCalendarYear = f.getUTCFullYear() === t.getUTCFullYear()

  // Single-season windows (default): jump to that season ±1 year (YTD if current).
  if (sameCalendarYear) {
    const y = f.getUTCFullYear() + delta
    let nextFrom = `${y}-01-01`
    let nextTo = `${y}-12-31`
    if (nextFrom < bounds.min) nextFrom = bounds.min
    if (nextTo > bounds.max) nextTo = bounds.max
    if (nextFrom > nextTo) return { from, to }
    return { from: nextFrom, to: nextTo }
  }

  // Custom multi-year span: shift both ends, keep duration, never collapse.
  const spanMs = Math.max(0, t.getTime() - f.getTime())
  f.setUTCFullYear(f.getUTCFullYear() + delta)
  t.setUTCFullYear(t.getUTCFullYear() + delta)
  let nextFrom = toDateKey(f)
  let nextTo = toDateKey(t)

  if (nextTo > bounds.max) {
    nextTo = bounds.max
    nextFrom = toDateKey(new Date(parseDateOnly(bounds.max).getTime() - spanMs))
  }
  if (nextFrom < bounds.min) {
    nextFrom = bounds.min
    nextTo = toDateKey(new Date(parseDateOnly(bounds.min).getTime() + spanMs))
  }
  if (nextTo > bounds.max) nextTo = bounds.max
  if (nextFrom < bounds.min) nextFrom = bounds.min
  if (nextFrom > nextTo) return { from, to }
  return { from: nextFrom, to: nextTo }
}

/** Weeks whose start falls inside the selected period. */
function weeksForPeriod(
  weeks: ProgressWeekBucket[],
  from: string,
  to: string,
): ProgressWeekBucket[] {
  return weeks.filter((w) => {
    const key = toDateKey(w.start)
    return key >= from && key <= to
  })
}

function monthSlotVolume(bucket: ProgressMonthBucket): {
  planned: number
  completed: number
} {
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
  return { planned, completed: completedVolume }
}

/** Consecutive calendar months covering [from, to] — never a sparse handful. */
function monthsForPeriod(
  months: ProgressMonthRow[],
  from: string,
  to: string,
): MonthVolume[] {
  const start = parseDateOnly(from)
  const end = parseDateOnly(to)
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const rows: MonthVolume[] = []
  while (cursor <= last) {
    const y = cursor.getUTCFullYear()
    const mi = cursor.getUTCMonth()
    const row = months[mi]
    const bucket = row?.byYear[y] ?? emptyBucket()
    const { planned, completed } = monthSlotVolume(bucket)
    const base = row?.label ?? cursor.toLocaleString('en', { month: 'short' })
    rows.push({
      label: sameYear ? base : `${base} ${String(y).slice(2)}`,
      planned,
      completed,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return rows
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

type SeriesVisibility = {
  planned: boolean
  completed: boolean
}

/**
 * Density that keeps charts readable at any category count:
 * few → thicker bars, fixed column width, centered (no sparse stretch);
 * many → fill width with thinner bars.
 * Practice: fixed bar thickness + center the group; never stretch 4 bars across full width.
 */
function chartDensity(categoryCount: number, dualSeries: boolean) {
  const sparse = categoryCount <= 6
  const cozy = categoryCount <= 12
  const dense = categoryCount >= 20

  const distribute = sparse
    ? 'justify-center gap-4 sm:gap-5'
    : cozy
      ? 'justify-center gap-2 sm:gap-2.5'
      : dense
        ? 'justify-between gap-px sm:gap-0.5'
        : 'gap-1 sm:gap-1.5'

  const columnWidth = sparse
    ? 'w-[4.75rem] shrink-0 sm:w-[5.5rem]'
    : cozy
      ? 'w-[3.25rem] shrink-0 sm:w-[3.75rem]'
      : dense
        ? 'min-w-0 flex-1'
        : 'min-w-[1.75rem] flex-1'

  /** Rotate values when columns are too narrow for horizontal digits. */
  const rotateValues = categoryCount > 12

  return {
    rotateValues,
    /** Outer shell: plot row + continuous baseline + label row. */
    frameClass: 'mt-5 flex min-h-[13rem] flex-1 flex-col',
    /** Bars row — continuous border-b is the baseline above labels. */
    trackClass: cn('flex min-h-0 flex-1 items-end border-b border-[var(--tt-line)]', distribute),
    labelTrackClass: cn('mt-1.5 flex shrink-0', distribute),
    columnClass: cn(
      'group relative flex h-full min-h-0 flex-col items-center outline-none',
      columnWidth,
    ),
    labelColumnClass: cn('flex justify-center text-center', columnWidth),
    /** Value sits flush above the bars; bars fill the rest. */
    plotClass: 'relative flex min-h-0 w-full flex-1 flex-col',
    barsRowClass: cn(
      'relative flex min-h-0 w-full flex-1 items-end justify-center',
    ),
    barClass: cn(
      'rounded-t-[3px] transition-[height,opacity] duration-[320ms] ease-out',
      dualSeries
        ? sparse
          ? 'w-[1.35rem] sm:w-[1.55rem]'
          : cozy
            ? 'w-[0.85rem] sm:w-[1rem]'
            : dense
              ? 'w-full max-w-[0.55rem]'
              : 'w-[0.65rem] sm:w-[0.75rem]'
        : sparse
          ? 'w-[2.5rem] sm:w-[2.85rem]'
          : cozy
            ? 'w-[1.5rem] sm:w-[1.75rem]'
            : dense
              ? 'w-full max-w-[0.85rem]'
              : 'w-[1.1rem] sm:w-[1.25rem]',
    ),
    valueSlotClass: cn(
      'flex shrink-0 items-end justify-center',
      rotateValues ? 'h-10 pb-0.5' : 'h-4 pb-0.5',
    ),
    /** Flush above column; vertical when horizontal space is tight. */
    valueClass: cn(
      'font-semibold tabular-nums leading-none text-[var(--tt-ink)]',
      rotateValues
        ? 'text-[8px] [writing-mode:vertical-rl] rotate-180'
        : 'text-[9px]',
    ),
    labelClass: cn(
      'font-medium text-[var(--tt-ink)]',
      dense ? 'text-[8px] tabular-nums' : 'text-[9px] tabular-nums',
    ),
    barGapClass: dualSeries ? 'gap-0.5 sm:gap-1' : 'gap-0',
  }
}

function ChartColumnValue({
  density,
  children,
}: {
  density: ReturnType<typeof chartDensity>
  children: React.ReactNode
}) {
  return (
    <div className={density.valueSlotClass}>
      <span className={density.valueClass}>{children}</span>
    </div>
  )
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

/** Period shown on the chart — step by year, or set exact from/to dates. */
function PeriodControl({
  from,
  to,
  min,
  max,
  onChange,
}: {
  from: string
  to: string
  min: string
  max: string
  onChange: (from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const rootRef = useRef<HTMLDivElement>(null)
  const bounds = { min, max }

  useEffect(() => {
    if (open) {
      setDraftFrom(from)
      setDraftTo(to)
    }
  }, [open, from, to])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      // DateField calendar is portaled outside the period popover.
      if (target instanceof Element && target.closest('.tt-date-picker')) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const prev = shiftPeriodByYears(from, to, -1, bounds)
  const next = shiftPeriodByYears(from, to, 1, bounds)
  const canPrev = prev.from !== from || prev.to !== to
  const canNext = next.from !== from || next.to !== to

  const label =
    from === to
      ? formatDateKeyLong(from)
      : `${formatDateKeyLong(from)} – ${formatDateKeyLong(to)}`

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
        Period
      </p>
      <div className="flex items-center gap-0.5" role="group" aria-label="Stats period">
        <button
          type="button"
          disabled={!canPrev}
          aria-label="Previous period"
          onClick={() => onChange(prev.from, prev.to)}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft)] transition',
            !canPrev
              ? 'opacity-30'
              : 'hover:bg-[var(--color-surface-subtle)] hover:text-[var(--tt-ink)]',
          )}
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Set exact dates"
          className="rounded-[6px] px-1.5 py-1 text-right text-[12px] font-semibold leading-none text-[var(--tt-ink)] transition hover:bg-[var(--color-surface-subtle)]"
        >
          <span className="whitespace-nowrap tabular-nums">{label}</span>
        </button>
        <button
          type="button"
          disabled={!canNext}
          aria-label="Next period"
          onClick={() => onChange(next.from, next.to)}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft)] transition',
            !canNext
              ? 'opacity-30'
              : 'hover:bg-[var(--color-surface-subtle)] hover:text-[var(--tt-ink)]',
          )}
        >
          <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose period dates"
          className="absolute right-0 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-[var(--tt-line)] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="space-y-2.5">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                From
              </p>
              <DateField
                value={draftFrom}
                min={min}
                max={draftTo < max ? draftTo : max}
                onChange={setDraftFrom}
                variant="compact"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                To
              </p>
              <DateField
                value={draftTo}
                min={draftFrom > min ? draftFrom : min}
                max={max}
                onChange={setDraftTo}
                variant="compact"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[6px] bg-[var(--tt-ink)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                onClick={() => {
                  const nextFrom = draftFrom <= draftTo ? draftFrom : draftTo
                  const nextTo = draftFrom <= draftTo ? draftTo : draftFrom
                  onChange(nextFrom, nextTo)
                  setOpen(false)
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SeriesLegend({
  color,
  series,
  onChange,
}: {
  color: string
  series: SeriesVisibility
  onChange: (next: SeriesVisibility) => void
}) {
  const toggle = (key: keyof SeriesVisibility) => {
    const next = { ...series, [key]: !series[key] }
    // Keep at least one series visible.
    if (!next.planned && !next.completed) return
    onChange(next)
  }

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 text-[11px]">
      <button
        type="button"
        onClick={() => toggle('planned')}
        aria-pressed={series.planned}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 font-medium transition',
          series.planned
            ? 'border-[var(--tt-line)] bg-[var(--color-surface-subtle)] text-[var(--tt-ink)]'
            : 'border-transparent text-[var(--tt-ink-faint)] line-through opacity-60 hover:text-[var(--tt-ink-soft)]',
        )}
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-[2px]',
            series.planned ? 'bg-[var(--tt-ink-faint)]/45' : 'bg-[var(--tt-ink-faint)]/20',
          )}
          aria-hidden
        />
        Planned
      </button>
      <button
        type="button"
        onClick={() => toggle('completed')}
        aria-pressed={series.completed}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 font-medium transition',
          series.completed
            ? 'border-[var(--tt-line)] bg-[var(--color-surface-subtle)] text-[var(--tt-ink)]'
            : 'border-transparent text-[var(--tt-ink-faint)] line-through opacity-60 hover:text-[var(--tt-ink-soft)]',
        )}
      >
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: color, opacity: series.completed ? 0.85 : 0.25 }}
          aria-hidden
        />
        Completed
      </button>
    </div>
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
        'opacity-0 transition-opacity duration-150',
        // Hover only where the device supports it — avoids sticky tips on touch.
        'group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100',
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
  series,
  onSeriesChange,
  periodControl,
}: {
  weeks: ProgressWeekBucket[]
  sport: WorkoutType | 'ALL'
  series: SeriesVisibility
  onSeriesChange: (next: SeriesVisibility) => void
  periodControl: ReactNode
}) {
  const unitSystem = useUnitSystem()
  const distanceUnit = unitSystem === 'IMPERIAL' ? 'mi' : 'km'
  if (weeks.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
              Weekly volume
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
              No weeks in this period. Adjust the dates or log workouts.
            </p>
          </div>
          {periodControl}
        </div>
      </div>
    )
  }

  const max = Math.max(
    ...weeks.flatMap((w) => [
      series.planned
        ? chartVolume(w.plannedDistance, w.plannedDuration, sport)
        : 0,
      series.completed
        ? chartVolume(w.completedDistance, w.completedDuration, sport)
        : 0,
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
  const dual = series.planned && series.completed
  const density = chartDensity(weeks.length, dual)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
            Weekly volume
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
            {sportLabel} · planned vs completed ({distanceUnit})
          </p>
          <p className="mt-1.5 text-[14px] font-bold tabular-nums text-[var(--tt-ink)]">
            {formatDistance(totalCompleted, unitSystem)} total
            <span
              className={cn(
                'ml-2 text-[12px] font-medium',
                deltaPct > 0
                  ? 'text-[var(--tt-good)]'
                  : deltaPct < 0
                    ? 'text-[var(--tt-ink-soft)]'
                    : 'text-[var(--tt-ink-faint)]',
              )}
            >
              {deltaPct > 0 ? '↑' : deltaPct < 0 ? '↓' : '→'} {Math.abs(deltaPct)}% vs prior
            </span>
          </p>
        </div>
        {periodControl}
      </div>

      <SeriesLegend color={color} series={series} onChange={onSeriesChange} />

      <div className={density.frameClass}>
        <div className={density.trackClass} role="img" aria-label="Weekly volume chart">
          {weeks.map((w) => {
            const plannedVal = chartVolume(w.plannedDistance, w.plannedDuration, sport)
            const completedVal = chartVolume(w.completedDistance, w.completedDuration, sport)
            const plannedH = series.planned ? (plannedVal / max) * 100 : 0
            const completedH = series.completed ? (completedVal / max) * 100 : 0
            const primaryVal = series.completed ? completedVal : plannedVal
            const asHours = series.completed
              ? volumeUsesHours(
                  w.completedDistance,
                  w.completedDuration,
                  sport,
                )
              : volumeUsesHours(w.plannedDistance, w.plannedDuration, sport)
            return (
              <div
                key={`${w.label}-${w.range}`}
                className={density.columnClass}
                tabIndex={0}
              >
                <div className={density.plotClass}>
                  <ChartColumnValue density={density}>
                    {fmtBarValue(primaryVal, asHours)}
                  </ChartColumnValue>
                  <div className={cn(density.barsRowClass, density.barGapClass)}>
                    <ChartColumnTooltip
                      title={`${w.label} · ${w.range}`}
                      rows={[
                        ...(series.planned
                          ? [
                              {
                                label: 'Planned',
                                value: formatDistance(w.plannedDistance, unitSystem),
                              },
                            ]
                          : []),
                        ...(series.completed
                          ? [
                              {
                                label: 'Completed',
                                value: formatDistance(w.completedDistance, unitSystem),
                              },
                            ]
                          : []),
                        { label: 'Sessions', value: `${w.completed}/${w.planned}` },
                        { label: 'Duration', value: formatDuration(w.completedDuration) },
                      ]}
                    />
                    {series.planned ? (
                      <ChartBar
                        heightPct={plannedH}
                        className={cn(density.barClass, 'bg-[var(--tt-ink-faint)]/45')}
                      />
                    ) : null}
                    {series.completed ? (
                      <ChartBar
                        heightPct={completedH}
                        className={density.barClass}
                        style={{ background: color, opacity: 0.9 }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className={density.labelTrackClass} aria-hidden>
          {weeks.map((w) => (
            <div key={`${w.label}-${w.range}-lbl`} className={density.labelColumnClass}>
              <span className={density.labelClass}>{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthVolumeChart({
  months,
  sport,
  series,
  onSeriesChange,
  periodControl,
}: {
  months: MonthVolume[]
  sport: WorkoutType | 'ALL'
  series: SeriesVisibility
  onSeriesChange: (next: SeriesVisibility) => void
  periodControl: ReactNode
}) {
  const unitSystem = useUnitSystem()
  const distanceUnit = unitSystem === 'IMPERIAL' ? 'mi' : 'km'
  if (months.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
              Monthly volume
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
              No months in this period. Adjust the dates or log workouts.
            </p>
          </div>
          {periodControl}
        </div>
      </div>
    )
  }

  const max = Math.max(
    ...months.flatMap((m) => [
      series.planned ? m.planned : 0,
      series.completed ? m.completed : 0,
    ]),
    1,
  )
  const color = sportColor(sport)
  const totalCompleted = months.reduce((s, m) => s + m.completed, 0)
  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const momPct =
    last && prev && prev.completed > 0
      ? Math.round(((last.completed - prev.completed) / prev.completed) * 100)
      : 0
  const sportLabel = sport === 'ALL' ? 'All sports' : WORKOUT_TYPE_LABELS[sport]
  const dual = series.planned && series.completed
  const density = chartDensity(months.length, dual)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
            Monthly volume
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
            {sportLabel} · planned vs completed ({distanceUnit})
          </p>
          <p className="mt-1.5 text-[14px] font-bold tabular-nums text-[var(--tt-ink)]">
            {formatDistance(totalCompleted, unitSystem)} total
            {last && prev ? (
              <span
                className={cn(
                  'ml-2 text-[12px] font-medium',
                  momPct > 0
                    ? 'text-[var(--tt-good)]'
                    : momPct < 0
                      ? 'text-[var(--tt-ink-soft)]'
                      : 'text-[var(--tt-ink-faint)]',
                )}
              >
                {momPct > 0 ? '↑' : momPct < 0 ? '↓' : '→'} {Math.abs(momPct)}%{' '}
                {last.label} vs {prev.label}
              </span>
            ) : null}
          </p>
        </div>
        {periodControl}
      </div>

      <SeriesLegend color={color} series={series} onChange={onSeriesChange} />

      <div className={density.frameClass}>
        <div className={density.trackClass} role="img" aria-label="Monthly volume chart">
          {months.map((m) => {
            const plannedH = series.planned ? (m.planned / max) * 100 : 0
            const completedH = series.completed ? (m.completed / max) * 100 : 0
            const pct = m.planned > 0 ? Math.round((m.completed / m.planned) * 100) : 0
            return (
              <div key={m.label} className={density.columnClass} tabIndex={0}>
                <div className={density.plotClass}>
                  <ChartColumnValue density={density}>
                    {fmtBarValue(
                      series.completed ? m.completed : m.planned,
                      sport !== 'ALL' && !sportUsesPlannedDistance(sport),
                    )}
                  </ChartColumnValue>
                  <div className={cn(density.barsRowClass, density.barGapClass)}>
                    <ChartColumnTooltip
                      title={m.label}
                      rows={[
                        ...(series.planned
                          ? [
                              {
                                label: 'Planned',
                                value: formatDistance(m.planned, unitSystem),
                              },
                            ]
                          : []),
                        ...(series.completed
                          ? [
                              {
                                label: 'Completed',
                                value: formatDistance(m.completed, unitSystem),
                              },
                            ]
                          : []),
                        { label: 'Completion', value: `${pct}%` },
                      ]}
                    />
                    {series.planned ? (
                      <ChartBar
                        heightPct={plannedH}
                        className={cn(density.barClass, 'bg-[var(--tt-ink-faint)]/45')}
                      />
                    ) : null}
                    {series.completed ? (
                      <ChartBar
                        heightPct={completedH}
                        className={density.barClass}
                        style={{ background: color, opacity: 0.9 }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className={density.labelTrackClass} aria-hidden>
          {months.map((m) => (
            <div key={`${m.label}-lbl`} className={density.labelColumnClass}>
              <span className={density.labelClass}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function monthSeriesVolume(
  bucket: ProgressMonthBucket | undefined,
  kind: 'planned' | 'completed',
  sport: WorkoutType | 'ALL',
): number {
  if (!bucket) return 0
  if (kind === 'planned') {
    return chartVolume(bucket.plannedDistance, bucket.plannedDuration, sport)
  }
  return chartVolume(bucket.completedDistance, bucket.completedDuration, sport)
}

function YearCompareChart({
  months,
  sport,
  years,
  series,
  onSeriesChange,
}: {
  months: ProgressMonthRow[]
  sport: WorkoutType | 'ALL'
  years: number[]
  series: SeriesVisibility
  onSeriesChange: (next: SeriesVisibility) => void
}) {
  const unitSystem = useUnitSystem()
  const distanceUnit = unitSystem === 'IMPERIAL' ? 'mi' : 'km'
  // One column per year — total volume across the full year (not months).
  const yearTotals = [...years]
    .sort((a, b) => a - b)
    .map((y) => {
      let planned = 0
      let completed = 0
      let plannedKm = 0
      let completedKm = 0
      for (const m of months) {
        const b = m.byYear[y]
        planned += monthSeriesVolume(b, 'planned', sport)
        completed += monthSeriesVolume(b, 'completed', sport)
        plannedKm += b?.plannedDistance ?? 0
        completedKm += b?.completedDistance ?? 0
      }
      return {
        year: y,
        planned,
        completed,
        plannedKm,
        completedKm,
      }
    })

  const max = Math.max(
    ...yearTotals.flatMap((y) => [
      series.planned ? y.planned : 0,
      series.completed ? y.completed : 0,
    ]),
    1,
  )
  const latest = yearTotals[yearTotals.length - 1]
  const prior = yearTotals[yearTotals.length - 2]
  const yoyPct =
    latest && prior && prior.completed > 0
      ? Math.round(((latest.completed - prior.completed) / prior.completed) * 100)
      : 0
  const sportLabel = sport === 'ALL' ? 'All sports' : WORKOUT_TYPE_LABELS[sport]
  const dual = series.planned && series.completed
  const density = chartDensity(yearTotals.length, dual)
  const hasAnyVolume = yearTotals.some((y) => y.planned > 0 || y.completed > 0)
  const color = sportColor(sport)
  const asHours =
    sport !== 'ALL' && !sportUsesPlannedDistance(sport)

  if (!hasAnyVolume) {
    return (
      <div className="flex h-full items-center justify-center rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white px-4 py-8 text-center text-[13px] text-[var(--tt-ink-soft)]">
        Not enough history for year-over-year comparison yet.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
            Year totals
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
            {sportLabel} · full-year volume ({distanceUnit})
          </p>
        </div>
        <div className="text-right">
          {latest ? (
            <p className="text-[14px] font-bold tabular-nums text-[var(--tt-ink)]">
              {latest.year}{' '}
              {formatDistance(latest.completedKm, unitSystem)}
            </p>
          ) : null}
          {latest && prior ? (
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
              {yoyPct > 0 ? '↑' : yoyPct < 0 ? '↓' : '→'} {Math.abs(yoyPct)}% vs{' '}
              {prior.year}
            </p>
          ) : null}
        </div>
      </div>

      <SeriesLegend color={color} series={series} onChange={onSeriesChange} />

      <div className={density.frameClass}>
        <div className={density.trackClass} role="img" aria-label="Year totals chart">
          {yearTotals.map((y) => {
            const primaryVal = series.completed ? y.completed : y.planned
            return (
              <div key={y.year} className={density.columnClass} tabIndex={0}>
                <div className={density.plotClass}>
                  <ChartColumnValue density={density}>
                    {fmtBarValue(primaryVal, asHours)}
                  </ChartColumnValue>
                  <div className={cn(density.barsRowClass, density.barGapClass)}>
                    <ChartColumnTooltip
                      title={String(y.year)}
                      rows={[
                        ...(series.planned
                          ? [
                              {
                                label: 'Planned',
                                value: formatDistance(y.plannedKm, unitSystem),
                              },
                            ]
                          : []),
                        ...(series.completed
                          ? [
                              {
                                label: 'Completed',
                                value: formatDistance(y.completedKm, unitSystem),
                              },
                            ]
                          : []),
                      ]}
                    />
                    {series.planned ? (
                      <ChartBar
                        heightPct={(y.planned / max) * 100}
                        className={cn(density.barClass, 'bg-[var(--tt-ink-faint)]/45')}
                      />
                    ) : null}
                    {series.completed ? (
                      <ChartBar
                        heightPct={(y.completed / max) * 100}
                        className={density.barClass}
                        style={{ background: color, opacity: 0.9 }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className={density.labelTrackClass} aria-hidden>
          {yearTotals.map((y) => (
            <div key={`${y.year}-lbl`} className={density.labelColumnClass}>
              <span className={density.labelClass}>{y.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildWeekMetrics(weeks: ProgressWeekBucket[], unitSystem: UnitSystem) {
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
      value: formatDistance(last.completedDistance, unitSystem),
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

function buildYearMetrics(months: ProgressMonthRow[], years: number[], unitSystem: UnitSystem) {
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
      value: formatDistance(totals[current], unitSystem),
      delta: prior ? `${yoy > 0 ? '+' : ''}${yoy}% vs ${prior} YTD` : 'current year',
      up: yoy === 0 ? null : yoy > 0,
    },
    ...(prior
      ? [
          {
            label: `${prior} total`,
            value: formatDistance(totals[prior], unitSystem),
            delta: 'full year in view',
            up: null,
          },
        ]
      : []),
    {
      label: 'This month',
      value: formatDistance(
        months[new Date().getUTCMonth()]?.byYear[current]?.completedDistance ?? 0,
        unitSystem,
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
        return formatDistance(peak.value, unitSystem)
      })(),
      up: null,
    },
  ] as const
}

export function StatsTrendsSection({ stats, className }: StatsTrendsSectionProps) {
  const unitSystem = useUnitSystem()
  const [view, setView] = useState<ViewId>('weeks')
  const [sport, setSport] = useState<WorkoutType | 'ALL'>('ALL')
  const periodBounds = useMemo(() => dataPeriodBounds(stats.years), [stats.years])
  const [period, setPeriod] = useState(() => defaultPeriod(stats.years))
  const [series, setSeries] = useState<SeriesVisibility>({
    planned: false,
    completed: true,
  })

  const bucket = useMemo(() => pickBucket(stats, sport), [stats, sport])
  const monthRows = useMemo(
    () => monthsForPeriod(bucket.monthly, period.from, period.to),
    [bucket.monthly, period.from, period.to],
  )

  const weeks = useMemo(() => {
    if (view !== 'weeks') return []
    return weeksForPeriod(bucket.weekly, period.from, period.to)
  }, [bucket.weekly, period.from, period.to, view])

  const metrics = useMemo(() => {
    if (view === 'years') return buildYearMetrics(bucket.monthly, stats.years, unitSystem)
    if (view === 'months' && monthRows.length > 0) {
      const last = monthRows[monthRows.length - 1]
      return [
        {
          label: `${last.label} volume`,
          value: formatDistance(last.completed, unitSystem),
          delta: 'latest month in view',
          up: null,
        },
        {
          label: 'Period total',
          value: formatDistance(
            monthRows.reduce((s, m) => s + m.completed, 0),
            unitSystem,
          ),
          delta: `${monthRows.length} months`,
          up: null,
        },
      ]
    }
    return buildWeekMetrics(weeks, unitSystem)
  }, [view, bucket.monthly, stats.years, monthRows, weeks, unitSystem])

  const sportOptions: { id: WorkoutType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All' },
    ...stats.sports.map((s) => ({ id: s, label: WORKOUT_TYPE_LABELS[s] })),
  ]

  const periodControl = (
    <PeriodControl
      from={period.from}
      to={period.to}
      min={periodBounds.min}
      max={periodBounds.max}
      onChange={(from, to) => setPeriod({ from, to })}
    />
  )

  const subtitle =
    view === 'years'
      ? 'Total volume for each year — compare full seasons side by side'
      : view === 'months'
        ? 'Monthly volume in the selected period — planned vs completed'
        : 'Weekly volume in the selected period — planned vs completed'

  return (
    <section
      id="trends"
      className={cn('scroll-mt-24 space-y-[var(--tt-space-section)]', className)}
    >
      {/* Top strip: context + filters (Fitness-style single wrapper) */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
              Volume trends
            </p>
            <p className="mt-2 text-[12px] leading-snug text-[var(--tt-ink)]">
              {subtitle}
            </p>
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

            <ToolbarDivider className="mx-0.5 mb-1.5" />
            <ToolbarFilterGroup label="Sport" hint="Filter chart by sport">
              {sportOptions.map((option) => {
                const Icon =
                  option.id === 'ALL' ? Layers : WORKOUT_TYPE_ICONS[option.id]
                return (
                  <ToolbarTextToggle
                    key={option.id}
                    pressed={sport === option.id}
                    onClick={() => setSport(option.id)}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {option.label}
                  </ToolbarTextToggle>
                )
              })}
            </ToolbarFilterGroup>
          </div>
        </div>
      </div>

      {/* Snapshot (left) + chart (right) — equal height */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white">
          <header className="shrink-0 border-b border-[var(--tt-line)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
              Snapshot
            </p>
          </header>
          <div className="flex flex-1 flex-col justify-between">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex flex-1 flex-col justify-center border-t border-[var(--tt-line)] px-4 py-3.5 first:border-t-0"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
                  {m.label}
                </p>
                <p className="mt-1.5 text-[1.35rem] font-bold tabular-nums leading-none text-[var(--tt-ink)]">
                  {m.value}
                </p>
                <p
                  className={cn(
                    'mt-1.5 text-[11px] leading-snug',
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
        </div>

        <div className="min-h-0 min-w-0 lg:h-full">
          {view === 'years' ? (
            <YearCompareChart
              months={bucket.monthly}
              sport={sport}
              years={stats.years}
              series={series}
              onSeriesChange={setSeries}
            />
          ) : view === 'months' ? (
            <MonthVolumeChart
              months={monthRows}
              sport={sport}
              series={series}
              onSeriesChange={setSeries}
              periodControl={periodControl}
            />
          ) : (
            <VolumeChart
              weeks={weeks}
              sport={sport}
              series={series}
              onSeriesChange={setSeries}
              periodControl={periodControl}
            />
          )}
        </div>
      </div>
    </section>
  )
}
