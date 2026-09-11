import type { RacePriority, RaceType, SeasonPhase, WorkoutType } from '@prisma/client'
import { WorkoutType as WT } from '@prisma/client'

/** Sports shown as season-planner lanes. */
export const PLANNER_SPORTS = [
  WT.RUN,
  WT.BIKE,
  WT.SWIM,
  WT.TRIATHLON,
  WT.HYROX,
] as const satisfies readonly WorkoutType[]

export type PlannerSport = (typeof PLANNER_SPORTS)[number]

export const PLANNER_SPORT_LABELS: Record<PlannerSport, string> = {
  RUN: 'Running',
  BIKE: 'Cycling',
  SWIM: 'Swimming',
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
}

export const SEASON_PHASE_LABELS: Record<SeasonPhase, string> = {
  BASE: 'Base',
  BUILD: 'Build',
  PEAK: 'Peak',
  RACE: 'Race',
  RECOVERY: 'Recovery',
  TRANSITION: 'Transition',
  MAINTENANCE: 'Maintenance',
}

export const PLANNER_PRIORITY_LANES: {
  priority: RacePriority
  label: string
  shortLabel: string
}[] = [
    { priority: 'A', label: 'A Goal', shortLabel: 'Goal' },
    { priority: 'B', label: 'B Important', shortLabel: 'Important' },
    { priority: 'C', label: 'C Training', shortLabel: 'Training' },
  ]

/** Race card surfaces — A strongest (goal), B important, C quiet training. */
export const PLANNER_PRIORITY_CARD: Record<RacePriority, string> = {
  A: 'border-[rgb(244_81_30/0.55)] bg-[rgb(244_81_30/0.12)] text-[#111111] shadow-[0_0_0_1px_rgb(244_81_30/0.08)]',
  B: 'border-[rgb(49_130_206/0.32)] bg-[rgb(49_130_206/0.05)] text-[#111111]',
  C: 'border-[rgb(16_185_129/0.22)] bg-[rgb(16_185_129/0.04)] text-[#111111]',
}

export const PLANNER_PRIORITY_DOT: Record<RacePriority, string> = {
  A: 'bg-[var(--color-accent)]',
  B: 'bg-[#3182CE]',
  C: 'bg-emerald-500',
}

/** Prep-week fills — slightly deeper than race-card surfaces, muted countdown. */
export const PLANNER_PRIORITY_SHADOW: Record<RacePriority, string> = {
  A: 'bg-[rgb(244_81_30/0.12)] text-[rgb(244_81_30/0.35)]',
  B: 'bg-[rgb(49_130_206/0.12)] text-[rgb(49_130_206/0.35)]',
  C: 'bg-emerald-100/70 text-emerald-900/30',
}

export const PLANNER_SPORT_TINT: Record<PlannerSport, string> = {
  RUN: 'border-[var(--color-sport-run-border)] bg-[var(--color-sport-run-bg)] text-[var(--color-sport-run)]',
  BIKE: 'border-[var(--color-sport-bike-border)] bg-[var(--color-sport-bike-bg)] text-[var(--color-sport-bike)]',
  SWIM: 'border-[var(--color-sport-swim-border)] bg-[var(--color-sport-swim-bg)] text-[var(--color-sport-swim)]',
  TRIATHLON: 'border-[var(--color-sport-tri-border)] bg-[var(--color-sport-tri-bg)] text-[var(--color-sport-tri)]',
  HYROX: 'border-[var(--color-sport-hyrox-border)] bg-[var(--color-sport-hyrox-bg)] text-[var(--color-sport-hyrox)]',
}

/** Suggested preparation length (weeks) by race type — used only as form hints. */
export const DEFAULT_PREPARATION_WEEKS: Record<RaceType, number> = {
  MARATHON: 16,
  HALF_MARATHON: 12,
  FIVE_K: 6,
  TEN_K: 8,
  TRIATHLON: 18,
  HYROX: 8,
  CYCLING: 12,
  OTHER: 8,
}

export function defaultPreparationWeeks(type: RaceType): number {
  return DEFAULT_PREPARATION_WEEKS[type] ?? 8
}

/** Explicit prep weeks only — null when the athlete has not set a period. */
export function resolvePreparationWeeks(
  preparationWeeks: number | null | undefined,
): number | null {
  if (typeof preparationWeeks === 'number' && preparationWeeks > 0) {
    return Math.min(52, Math.max(1, Math.round(preparationWeeks)))
  }
  return null
}

export type PlannerZoomUnit = 'week' | 'day'

export type PlannerZoomLevel = {
  label: string
  shortLabel: string
  unit: PlannerZoomUnit
  /** Approximate days visible in the viewport. */
  viewportDays: number
}

/** Index 0 = widest (year). Default stays at 4 months.
 * Desktop: 12 mo → 6 mo → 4 mo → 2 wk (4 steps).
 * Mobile: same + 1 wk as the tightest step.
 */
export const PLANNER_ZOOM_LEVELS = [
  { label: '12 months', shortLabel: '12 mo', unit: 'week', viewportDays: 365 },
  { label: '6 months', shortLabel: '6 mo', unit: 'week', viewportDays: 183 },
  { label: '4 months', shortLabel: '4 mo', unit: 'week', viewportDays: 122 },
  { label: '2 weeks', shortLabel: '2 wk', unit: 'day', viewportDays: 14 },
  { label: '1 week', shortLabel: '1 wk', unit: 'day', viewportDays: 7 },
] as const satisfies readonly PlannerZoomLevel[]

/** Tightest zoom on desktop (2 weeks). */
export const PLANNER_ZOOM_DESKTOP_MAX = 3
/** Tightest zoom on mobile (1 week). */
export const PLANNER_ZOOM_MOBILE_MAX = PLANNER_ZOOM_LEVELS.length - 1
export const PLANNER_ZOOM_MAX = PLANNER_ZOOM_MOBILE_MAX
/** Default: 4 months (week columns). */
export const DEFAULT_PLANNER_ZOOM = 2

/** @deprecated Prefer PLANNER_ZOOM_LEVELS — kept for short-label lookups. */
export const PLANNER_ZOOM_LABELS = PLANNER_ZOOM_LEVELS.map((level) => level.label)

export function plannerZoomLevel(zoom: number): PlannerZoomLevel {
  const index = Math.min(PLANNER_ZOOM_MAX, Math.max(0, Math.round(zoom)))
  return PLANNER_ZOOM_LEVELS[index]!
}

export function plannerZoomUnit(zoom: number): PlannerZoomUnit {
  return plannerZoomLevel(zoom).unit
}

/** Approximate months in viewport (week zooms only; day zooms return a fraction). */
export function plannerViewportMonths(zoom: number): number {
  return plannerZoomLevel(zoom).viewportDays / 30.4
}

export const PLANNER_LABEL_WIDTH_DESKTOP = 112
export const PLANNER_LABEL_WIDTH_NARROW = 72
/** Matches Tailwind `sm`. */
export const PLANNER_NARROW_MAX_PX = 639
export const PLANNER_MIN_WEEK_COL = 24
export const PLANNER_MIN_DAY_COL = 28
export const PLANNER_FALLBACK_GRID_PX = 900

export function plannerZoomMaxForWidth(viewportWidth: number): number {
  return viewportWidth <= PLANNER_NARROW_MAX_PX
    ? PLANNER_ZOOM_MOBILE_MAX
    : PLANNER_ZOOM_DESKTOP_MAX
}

export function plannerLabelWidth(viewportWidth: number): number {
  return viewportWidth <= PLANNER_NARROW_MAX_PX
    ? PLANNER_LABEL_WIDTH_NARROW
    : PLANNER_LABEL_WIDTH_DESKTOP
}

export function plannerVisibleColumnCount(zoom: number): number {
  const level = plannerZoomLevel(zoom)
  if (level.unit === 'day') {
    return Math.max(7, level.viewportDays)
  }
  return Math.max(8, Math.round(level.viewportDays / 7))
}

/** @deprecated Prefer plannerVisibleColumnCount. */
export function plannerVisibleWeekCount(zoom: number): number {
  return plannerVisibleColumnCount(zoom)
}

/** Column width (px) so the visible grid ≈ the zoom viewport. */
export function plannerColumnWidth(
  zoom: number,
  visibleGridPx = PLANNER_FALLBACK_GRID_PX,
): number {
  const columnsVisible = plannerVisibleColumnCount(zoom)
  const target = Math.max(160, visibleGridPx)
  const minCol =
    plannerZoomUnit(zoom) === 'day' ? PLANNER_MIN_DAY_COL : PLANNER_MIN_WEEK_COL
  return Math.max(minCol, Math.round(target / columnsVisible))
}

/** @deprecated Prefer plannerColumnWidth. */
export function plannerWeekColumnWidth(
  zoom: number,
  visibleGridPx = PLANNER_FALLBACK_GRID_PX,
): number {
  return plannerColumnWidth(zoom, visibleGridPx)
}

/**
 * Horizontal scroll so `columnIndex` sits in the grid *after* the sticky label
 * column — never under it. `insetRatio` is how far into the remaining grid
 * the column’s left edge should land.
 */
export function plannerScrollLeftForColumn(
  columnIndex: number,
  colW: number,
  scrollerWidth: number,
  labelW: number,
  insetRatio = 0.22,
): number {
  if (columnIndex < 0 || colW <= 0) return 0
  const visibleGrid = Math.max(0, scrollerWidth - labelW)
  const inset = Math.min(
    Math.max(visibleGrid * insetRatio, 8),
    Math.max(visibleGrid - colW, 0),
  )
  return Math.max(0, columnIndex * colW - inset)
}

/** Keep a column centered in the visible grid (used when zooming). */
export function plannerScrollLeftToCenterColumn(
  columnIndex: number,
  colW: number,
  scrollerWidth: number,
  labelW: number,
): number {
  if (columnIndex < 0 || colW <= 0) return 0
  const visibleGrid = Math.max(0, scrollerWidth - labelW)
  return Math.max(0, columnIndex * colW + colW / 2 - visibleGrid / 2)
}

/** @deprecated Prefer plannerScrollLeftForColumn. */
export function plannerScrollLeftForWeek(
  weekIndex: number,
  colW: number,
  scrollerWidth: number,
  labelW: number,
  insetRatio = 0.22,
): number {
  return plannerScrollLeftForColumn(weekIndex, colW, scrollerWidth, labelW, insetRatio)
}

export const PLANNER_LOOKBACK_WEEKS = 8
export const PLANNER_LOOKAHEAD_MONTHS = 14
export const PLANNER_SCROLL_PAD_MONTHS = 12

export type PlannerWeekColumn = {
  key: string
  /** Monday UTC of the ISO week. */
  start: Date
  /** Sunday UTC. */
  end: Date
  isoWeek: number
  year: number
  monthKey: string
  monthLabel: string
}

export type PlannerDayColumn = {
  key: string
  /** UTC midnight of the day. */
  start: Date
  /** UTC end of the day (same calendar day). */
  end: Date
  dayOfMonth: number
  /** 0 Sun … 6 Sat (UTC). */
  weekday: number
  year: number
  monthKey: string
  monthLabel: string
}

export type PlannerMonthGroup = {
  key: string
  label: string
  year: number
  /** Number of columns (weeks or days) in this month group. */
  weekCount: number
  startIndex: number
}

type PlannerMonthSource = {
  monthKey: string
  monthLabel: string
  year: number
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function utcMonday(d: Date): Date {
  const date = utcDay(d)
  const day = date.getUTCDay()
  const toMonday = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + toMonday)
  return date
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** ISO week number (UTC Monday weeks). */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function buildPlannerWeekColumns(rangeStart: Date, rangeEnd: Date): PlannerWeekColumn[] {
  const columns: PlannerWeekColumn[] = []
  let cursor = utcMonday(rangeStart)
  const endMs = rangeEnd.getTime()
  while (cursor.getTime() <= endMs) {
    const end = addUtcDays(cursor, 6)
    const year = cursor.getUTCFullYear()
    const month = cursor.getUTCMonth()
    columns.push({
      key: cursor.toISOString().slice(0, 10),
      start: new Date(cursor),
      end,
      isoWeek: isoWeekNumber(cursor),
      year,
      monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
      monthLabel: MONTH_FULL[month],
    })
    cursor = addUtcDays(cursor, 7)
  }
  return columns
}

export function buildPlannerDayColumns(rangeStart: Date, rangeEnd: Date): PlannerDayColumn[] {
  const columns: PlannerDayColumn[] = []
  let cursor = utcDay(rangeStart)
  const endMs = utcDay(rangeEnd).getTime()
  while (cursor.getTime() <= endMs) {
    const year = cursor.getUTCFullYear()
    const month = cursor.getUTCMonth()
    columns.push({
      key: cursor.toISOString().slice(0, 10),
      start: new Date(cursor),
      end: new Date(cursor),
      dayOfMonth: cursor.getUTCDate(),
      weekday: cursor.getUTCDay(),
      year,
      monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
      monthLabel: MONTH_FULL[month],
    })
    cursor = addUtcDays(cursor, 1)
  }
  return columns
}

export function groupPlannerMonths(
  columns: readonly PlannerMonthSource[],
): PlannerMonthGroup[] {
  const groups: PlannerMonthGroup[] = []
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i]!
    const last = groups[groups.length - 1]
    if (last && last.key === column.monthKey) {
      last.weekCount += 1
    } else {
      groups.push({
        key: column.monthKey,
        label: column.monthLabel,
        year: column.year,
        weekCount: 1,
        startIndex: i,
      })
    }
  }
  return groups
}

export function buildPlannerScrollRange(today = new Date()): { start: Date; end: Date } {
  const start = utcMonday(today)
  start.setUTCDate(start.getUTCDate() - PLANNER_LOOKBACK_WEEKS * 7 - PLANNER_SCROLL_PAD_MONTHS * 30)
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  end.setUTCMonth(end.getUTCMonth() + PLANNER_LOOKAHEAD_MONTHS + PLANNER_SCROLL_PAD_MONTHS)
  return { start: utcMonday(start), end }
}

type DatedColumn = { start: Date; end: Date }

function columnUtcStartMs(column: DatedColumn): number {
  return Date.UTC(
    column.start.getUTCFullYear(),
    column.start.getUTCMonth(),
    column.start.getUTCDate(),
  )
}

/** Visual duration of one planner column in ms (week = 7d, day = 1d). */
function plannerColumnDurationMs(unit: PlannerZoomUnit): number {
  return unit === 'day' ? 86_400_000 : 7 * 86_400_000
}

function columnIndexForDate(columns: readonly DatedColumn[], date: Date): number {
  if (columns.length === 0) return 0
  const t = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i]!
    const start = Date.UTC(
      column.start.getUTCFullYear(),
      column.start.getUTCMonth(),
      column.start.getUTCDate(),
    )
    const end = Date.UTC(
      column.end.getUTCFullYear(),
      column.end.getUTCMonth(),
      column.end.getUTCDate(),
    )
    if (t >= start && t <= end) return i
  }
  if (t < Date.UTC(
    columns[0]!.start.getUTCFullYear(),
    columns[0]!.start.getUTCMonth(),
    columns[0]!.start.getUTCDate(),
  )) {
    return 0
  }
  return columns.length - 1
}

/** Absolute UTC time under a grid X (px from timeline start). */
export function plannerTimeMsAtGridX(
  columns: readonly DatedColumn[],
  colW: number,
  gridX: number,
  unit: PlannerZoomUnit,
): number {
  if (columns.length === 0 || colW <= 0) return Date.now()
  const exact = Math.max(0, Math.min(columns.length - 1e-6, gridX / colW))
  const col = Math.floor(exact)
  const frac = exact - col
  const startMs = columnUtcStartMs(columns[col]!)
  return startMs + frac * plannerColumnDurationMs(unit)
}

/** Grid X (px) for an absolute UTC time — continuous within the column. */
export function plannerGridXForTimeMs(
  columns: readonly DatedColumn[],
  colW: number,
  timeMs: number,
  unit: PlannerZoomUnit,
): number {
  if (columns.length === 0 || colW <= 0) return 0
  const col = columnIndexForDate(columns, new Date(timeMs))
  const startMs = columnUtcStartMs(columns[col]!)
  const duration = plannerColumnDurationMs(unit)
  const frac = Math.min(1, Math.max(0, (timeMs - startMs) / duration))
  return (col + frac) * colW
}

/** Scroll so `timeMs` sits at `ratio` across the visible grid (0.5 = center). */
export function plannerScrollLeftToTimeMs(
  columns: readonly DatedColumn[],
  colW: number,
  scrollerWidth: number,
  labelW: number,
  timeMs: number,
  unit: PlannerZoomUnit,
  ratio = 0.5,
): number {
  const visibleGrid = Math.max(0, scrollerWidth - labelW)
  const x = plannerGridXForTimeMs(columns, colW, timeMs, unit)
  return Math.max(0, x - visibleGrid * ratio)
}

export function weekIndexForDate(weeks: PlannerWeekColumn[], date: Date): number {
  return columnIndexForDate(weeks, date)
}

export function dayIndexForDate(days: PlannerDayColumn[], date: Date): number {
  return columnIndexForDate(days, date)
}

export function todayWeekIndex(weeks: PlannerWeekColumn[], today = new Date()): number {
  return weekIndexForDate(weeks, today)
}

export function todayDayIndex(days: PlannerDayColumn[], today = new Date()): number {
  return dayIndexForDate(days, today)
}

/**
 * Move a race date into `targetWeekStart` (Monday), keeping the same weekday
 * when possible.
 */
export function snapRaceDateToWeek(originalDate: Date, targetWeekMonday: Date): Date {
  const weekday = originalDate.getUTCDay() // 0 Sun … 6 Sat
  const mondayOffset = weekday === 0 ? 6 : weekday - 1
  return addUtcDays(utcMonday(targetWeekMonday), mondayOffset)
}

export type PrepWindow = {
  raceId: string
  startWeekIndex: number
  endWeekIndex: number
  weeksRemaining: number
  /** True when race week is still upcoming or current. */
  active: boolean
}

export function prepWindowForRace(args: {
  raceId: string
  raceDate: Date
  type: RaceType
  preparationWeeks: number | null | undefined
  weeks: PlannerWeekColumn[]
  today?: Date
}): PrepWindow | null {
  const today = args.today ?? new Date()
  const prepWeeks = resolvePreparationWeeks(args.preparationWeeks)
  if (prepWeeks == null) return null

  const raceIdx = weekIndexForDate(args.weeks, args.raceDate)
  // Prep window includes race week as week 1 (e.g. 4w → race and 3 weeks before).
  const startIdx = Math.max(0, raceIdx - (prepWeeks - 1))
  const todayIdx = todayWeekIndex(args.weeks, today)
  const weeksRemaining = raceIdx - todayIdx
  return {
    raceId: args.raceId,
    startWeekIndex: startIdx,
    /** Race week index — countdown labels race week as 1. */
    endWeekIndex: raceIdx,
    weeksRemaining,
    active: weeksRemaining >= 0,
  }
}

/**
 * Convert a week-indexed prep window into day column indices
 * (Monday of start week → Sunday of end week).
 */
export function prepWindowDaySpan(
  prep: PrepWindow,
  weeks: PlannerWeekColumn[],
  days: PlannerDayColumn[],
): { startDayIndex: number; endDayIndex: number } | null {
  const startWeek = weeks[prep.startWeekIndex]
  const endWeek = weeks[prep.endWeekIndex]
  if (!startWeek || !endWeek) return null
  return {
    startDayIndex: dayIndexForDate(days, startWeek.start),
    endDayIndex: dayIndexForDate(days, endWeek.end),
  }
}

export function weeksUntilRace(raceDate: Date, today = new Date()): number {
  const raceMonday = utcMonday(raceDate)
  const todayMonday = utcMonday(today)
  return Math.round((raceMonday.getTime() - todayMonday.getTime()) / (7 * 86400000))
}

export type SeasonPhaseBlockData = {
  id: string
  sport: WorkoutType
  phase: SeasonPhase
  label: string | null
  startDate: Date
  endDate: Date
}

export type SeasonEventData = {
  id: string
  title: string
  notes: string | null
  startDate: Date
  endDate: Date
  /** True when only the athlete can see the event. */
  isPrivate?: boolean
  allDay?: boolean
  startTime?: string | null
  endTime?: string | null
  location?: string | null
}

/** Display label for season events (title only). */
export function formatSeasonEventLabel(event: { title: string }): string {
  return event.title.trim() || 'Event'
}

function formatClockHm(raw: string | null | undefined): string | null {
  if (!raw) return null
  const match = raw.trim().match(/^(\d{1,2}):([0-5]\d)/)
  if (!match) return null
  return `${match[1]!.padStart(2, '0')}:${match[2]}`
}

/**
 * Chip / card subtitle:
 * `09:00 - Vilnius` · `09:00 - 11:30 - Vilnius` · `All day - Vilnius`
 */
export function formatSeasonEventWhenLine(event: {
  allDay?: boolean | null
  startTime?: string | null
  endTime?: string | null
  location?: string | null
}): string | null {
  const location = event.location?.trim() || ''
  const allDay = event.allDay !== false
  const start = allDay ? null : formatClockHm(event.startTime)
  const end = allDay ? null : formatClockHm(event.endTime)

  if (allDay) {
    return location ? `All day - ${location}` : null
  }
  if (start && end) {
    return location ? `${start} - ${end} - ${location}` : `${start} - ${end}`
  }
  if (start) {
    return location ? `${start} - ${location}` : start
  }
  if (end) {
    return location ? `${end} - ${location}` : end
  }
  return location || null
}

/** Soft amber blocks — distinct from A/B/C race cards. */
export const SEASON_EVENT_CARD =
  'border-[rgb(245_190_50/0.35)] bg-[rgb(245_190_50/0.10)] text-[#111111]'
