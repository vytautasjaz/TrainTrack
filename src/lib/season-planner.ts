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

/** Race card surfaces — A red, B blue, C mint. */
export const PLANNER_PRIORITY_CARD: Record<RacePriority, string> = {
  A: 'border-red-300/80 bg-red-50 text-red-950',
  B: 'border-blue-300/80 bg-blue-50 text-blue-950',
  C: 'border-emerald-300/80 bg-emerald-50 text-emerald-950',
}

export const PLANNER_PRIORITY_DOT: Record<RacePriority, string> = {
  A: 'bg-red-500',
  B: 'bg-blue-500',
  C: 'bg-emerald-500',
}

/** Prep-week fills — slightly deeper than race-card surfaces, muted countdown. */
export const PLANNER_PRIORITY_SHADOW: Record<RacePriority, string> = {
  A: 'bg-red-100/80 text-red-900/30',
  B: 'bg-blue-100/80 text-blue-900/30',
  C: 'bg-emerald-100/80 text-emerald-900/30',
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

/** Column width (px) scales so viewport ≈ that many months of weeks. */
export function plannerWeekColumnWidth(zoom: number): number {
  const months = plannerViewportMonths(zoom)
  // ~4.35 weeks/month; target ~900px content for viewport
  const weeksVisible = Math.max(8, Math.round(months * 4.35))
  return Math.max(28, Math.round(900 / weeksVisible))
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
  'border-amber-300/80 bg-amber-100/90 text-amber-950'
