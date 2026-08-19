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

/** Zoom: months visible in the viewport. Index 0 = widest. */
export const PLANNER_ZOOM_VIEWPORTS = [12, 6, 3] as const
export const PLANNER_ZOOM_LABELS = ['12 months', '6 months', '3 months'] as const
export const PLANNER_ZOOM_MAX = PLANNER_ZOOM_VIEWPORTS.length - 1
/** Default: 3 months (widest week columns). */
export const DEFAULT_PLANNER_ZOOM = PLANNER_ZOOM_MAX

export function plannerViewportMonths(zoom: number): number {
  const index = Math.min(PLANNER_ZOOM_MAX, Math.max(0, zoom))
  return PLANNER_ZOOM_VIEWPORTS[index]
}

export const PLANNER_LABEL_WIDTH_DESKTOP = 112
export const PLANNER_LABEL_WIDTH_NARROW = 72
/** Matches Tailwind `sm`. */
export const PLANNER_NARROW_MAX_PX = 639
export const PLANNER_MIN_WEEK_COL = 24
export const PLANNER_FALLBACK_GRID_PX = 900

export function plannerLabelWidth(viewportWidth: number): number {
  return viewportWidth <= PLANNER_NARROW_MAX_PX
    ? PLANNER_LABEL_WIDTH_NARROW
    : PLANNER_LABEL_WIDTH_DESKTOP
}

export function plannerVisibleWeekCount(zoom: number): number {
  const months = plannerViewportMonths(zoom)
  return Math.max(8, Math.round(months * 4.35))
}

/** Column width (px) scales so the visible grid ≈ that many months of weeks. */
export function plannerWeekColumnWidth(
  zoom: number,
  visibleGridPx = PLANNER_FALLBACK_GRID_PX,
): number {
  const weeksVisible = plannerVisibleWeekCount(zoom)
  const target = Math.max(160, visibleGridPx)
  return Math.max(PLANNER_MIN_WEEK_COL, Math.round(target / weeksVisible))
}

/**
 * Horizontal scroll so `weekIndex` sits in the grid *after* the sticky label
 * column — never under it. `insetRatio` is how far into the remaining grid
 * the week’s left edge should land.
 */
export function plannerScrollLeftForWeek(
  weekIndex: number,
  colW: number,
  scrollerWidth: number,
  labelW: number,
  insetRatio = 0.22,
): number {
  if (weekIndex < 0 || colW <= 0) return 0
  const visibleGrid = Math.max(0, scrollerWidth - labelW)
  const inset = Math.min(
    Math.max(visibleGrid * insetRatio, 8),
    Math.max(visibleGrid - colW, 0),
  )
  return Math.max(0, weekIndex * colW - inset)
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

export type PlannerMonthGroup = {
  key: string
  label: string
  year: number
  weekCount: number
  startIndex: number
}

function utcMonday(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
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

export function groupPlannerMonths(weeks: PlannerWeekColumn[]): PlannerMonthGroup[] {
  const groups: PlannerMonthGroup[] = []
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i]!
    const last = groups[groups.length - 1]
    if (last && last.key === week.monthKey) {
      last.weekCount += 1
    } else {
      groups.push({
        key: week.monthKey,
        label: week.monthLabel,
        year: week.year,
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

export function weekIndexForDate(weeks: PlannerWeekColumn[], date: Date): number {
  const t = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i]!
    if (t >= w.start.getTime() && t <= w.end.getTime()) return i
  }
  if (t < weeks[0]!.start.getTime()) return 0
  return weeks.length - 1
}

export function todayWeekIndex(weeks: PlannerWeekColumn[], today = new Date()): number {
  return weekIndexForDate(weeks, today)
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
}

/** Display label for season events (title only). */
export function formatSeasonEventLabel(event: { title: string }): string {
  return event.title.trim() || 'Event'
}

/** Soft amber blocks — distinct from A/B/C race cards. */
export const SEASON_EVENT_CARD =
  'border-[rgb(245_190_50/0.35)] bg-[rgb(245_190_50/0.10)] text-[#111111]'
