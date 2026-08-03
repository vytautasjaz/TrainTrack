import type {
  RaceCourseType,
  RaceIntent,
  RaceOutcome,
  RacePriority,
  RaceType,
  TriathlonDistance,
} from '@prisma/client'
import { RACE_OUTCOME_LABELS, RACE_TYPE_DISTANCE_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import { TRIATHLON_DISTANCE_LABELS } from '@/lib/race-form'
import { daysUntil } from '@/lib/utils'
import type { RaceLegView } from '@/lib/race-legs'

export type SeasonRace = {
  id: string
  name: string
  date: Date
  location: string | null
  type: RaceType
  sport?: import('@prisma/client').WorkoutType
  courseType?: RaceCourseType | null
  triathlonDistance?: TriathlonDistance | null
  customDistanceKm?: number | null
  priority: RacePriority
  intent: RaceIntent
  goal: string | null
  url: string | null
  preparationWeeks?: number | null
  outcome?: RaceOutcome | null
  resultTime?: string | null
  resultNotes?: string | null
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
  legs?: RaceLegView[]
}

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** How many months are visible in the season overview viewport at widest zoom. */
export const SEASON_VIEWPORT_MONTHS = 12
/**
 * Viewport month counts per zoom step.
 * Index 0 = widest (months), higher = tighter (weeks).
 */
export const SEASON_ZOOM_VIEWPORTS = [12, 6, 3] as const
export const SEASON_ZOOM_MAX = SEASON_ZOOM_VIEWPORTS.length - 1
/** Default opens at week-level precision (6 months + week ticks). */
export const DEFAULT_SEASON_ZOOM = 1

export function seasonViewportMonths(zoom: number): number {
  const index = Math.min(SEASON_ZOOM_MAX, Math.max(0, zoom))
  return SEASON_ZOOM_VIEWPORTS[index]
}

/** Show week ticks at the default week zoom and tighter. */
export function seasonShowsWeekTicks(zoom: number): boolean {
  return zoom >= DEFAULT_SEASON_ZOOM
}

/** Show weeks-until on race markers at week zoom and tighter. */
export function seasonShowsWeekLabels(zoom: number): boolean {
  return zoom >= DEFAULT_SEASON_ZOOM
}

/** Default left edge of the viewport: this many weeks before today. */
export const SEASON_LOOKBACK_WEEKS = 4
/** How far ahead the scrollable range extends beyond today (months). */
export const SEASON_LOOKAHEAD_MONTHS = 10
/** Extra months available to scroll past the default window. */
export const SEASON_SCROLL_PAD_MONTHS = 18
/** @deprecated Prefer SEASON_LOOKBACK_WEEKS for the default viewport. */
export const SEASON_LOOKBACK_MONTHS = 2

export type SeasonMonth = {
  key: string
  label: string
  year: number
  /** Month start (UTC). */
  start: Date
}

export type SeasonWeekTick = {
  key: string
  start: Date
  label: string
}

/** Monday-aligned week starts across the range (UTC). */
export function buildSeasonWeekTicks(rangeStart: Date, rangeEnd: Date): SeasonWeekTick[] {
  const ticks: SeasonWeekTick[] = []
  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()
  // Align to Monday UTC
  const first = new Date(rangeStart)
  const day = first.getUTCDay() // 0 Sun … 6 Sat
  const toMonday = day === 0 ? -6 : 1 - day
  first.setUTCDate(first.getUTCDate() + toMonday)
  first.setUTCHours(0, 0, 0, 0)

  for (let t = first.getTime(); t < endMs; t += 7 * 24 * 60 * 60 * 1000) {
    if (t < startMs - 7 * 24 * 60 * 60 * 1000) continue
    const start = new Date(t)
    ticks.push({
      key: start.toISOString().slice(0, 10),
      start,
      label: String(start.getUTCDate()),
    })
  }
  return ticks
}

export function raceOutcomeSummary(race: SeasonRace): string {
  if (!race.outcome || race.outcome === 'DISMISSED') return '—'
  if (race.outcome === 'FINISHED') {
    return race.resultTime || RACE_OUTCOME_LABELS.FINISHED
  }
  return RACE_OUTCOME_LABELS[race.outcome]
}

export function raceDistanceLabel(
  type: RaceType,
  extras?: {
    triathlonDistance?: TriathlonDistance | null
    customDistanceKm?: number | null
    legs?: Array<{
      kind: string
      plannedDistanceKm?: number | null
    }> | null
  },
): string {
  if (type === 'TRIATHLON' && extras?.triathlonDistance) {
    if (extras.triathlonDistance === 'CUSTOM' && extras.legs?.length) {
      const swim = extras.legs.find((l) => l.kind === 'SWIM')?.plannedDistanceKm
      const bike = extras.legs.find((l) => l.kind === 'BIKE')?.plannedDistanceKm
      const run = extras.legs.find((l) => l.kind === 'RUN')?.plannedDistanceKm
      const parts = [
        swim != null && swim > 0 ? `${formatBriefKm(swim)}S` : null,
        bike != null && bike > 0 ? `${formatBriefKm(bike)}B` : null,
        run != null && run > 0 ? `${formatBriefKm(run)}R` : null,
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(' / ')
    }
    return TRIATHLON_DISTANCE_LABELS[extras.triathlonDistance]
  }
  if (
    (type === 'OTHER' || type === 'CYCLING') &&
    extras?.customDistanceKm != null &&
    extras.customDistanceKm > 0
  ) {
    return `${extras.customDistanceKm} km`
  }
  return RACE_TYPE_DISTANCE_LABELS[type]
}

function formatBriefKm(km: number): string {
  return km % 1 === 0 ? String(km) : km.toFixed(1).replace(/\.0$/, '')
}

export function raceTypeLabel(type: RaceType): string {
  return RACE_TYPE_LABELS[type]
}

/** UTC midnight for local calendar y/m/d (avoids TZ drift for date-only math). */
export function utcDate(year: number, monthIndex: number, day = 1): Date {
  return new Date(Date.UTC(year, monthIndex, day))
}

export function startOfUtcMonth(date: Date): Date {
  return utcDate(date.getFullYear(), date.getMonth(), 1)
}

export function addUtcMonths(date: Date, months: number): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
}

export function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  )
}

/** Position of a date within [rangeStart, rangeEnd) as 0–1. */
export function rangeProgress(date: Date, rangeStart: Date, rangeEnd: Date): number {
  const start = rangeStart.getTime()
  const end = rangeEnd.getTime()
  if (end <= start) return 0
  return Math.min(1, Math.max(0, (date.getTime() - start) / (end - start)))
}

/** @deprecated Prefer rangeProgress for the scrolling season scale. */
export function yearProgress(date: Date): number {
  const year = date.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  const t = date.getTime()
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function buildSeasonMonthRange(now = new Date()): {
  months: SeasonMonth[]
  rangeStart: Date
  rangeEnd: Date
  /** Left edge of the default viewport (today − lookback weeks). */
  defaultViewportStart: Date
} {
  const today = utcDate(now.getFullYear(), now.getMonth(), now.getDate())
  const todayMonth = startOfUtcMonth(now)
  const defaultViewportStart = addUtcDays(today, -SEASON_LOOKBACK_WEEKS * 7)
  const rangeStart = addUtcMonths(todayMonth, -(SEASON_LOOKBACK_MONTHS + SEASON_SCROLL_PAD_MONTHS))
  const rangeEnd = addUtcMonths(
    todayMonth,
    SEASON_LOOKAHEAD_MONTHS + SEASON_SCROLL_PAD_MONTHS + 1,
  )
  const count = monthsBetween(rangeStart, rangeEnd)
  const months: SeasonMonth[] = []
  for (let i = 0; i < count; i++) {
    const start = addUtcMonths(rangeStart, i)
    const year = start.getUTCFullYear()
    months.push({
      key: `${year}-${start.getUTCMonth()}`,
      label: MONTH_LABELS[start.getUTCMonth()],
      year,
      start,
    })
  }
  return {
    months,
    rangeStart,
    rangeEnd,
    defaultViewportStart,
  }
}

export function filterRacesInRange(
  races: SeasonRace[],
  rangeStart: Date,
  rangeEnd: Date,
): SeasonRace[] {
  return races
    .filter((r) => {
      const t = r.date.getTime()
      return t >= rangeStart.getTime() && t < rangeEnd.getTime()
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function filterRacesByYear(races: SeasonRace[], year: number): SeasonRace[] {
  return races.filter((r) => r.date.getUTCFullYear() === year)
}

export function splitUpcomingPast(races: SeasonRace[]) {
  const upcoming = races
    .filter((r) => daysUntil(r.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const past = races
    .filter((r) => daysUntil(r.date) < 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
  return { upcoming, past }
}

export function splitPlannedWatching(races: SeasonRace[]) {
  const planned = races.filter((r) => r.intent === 'PLANNED')
  const watching = races.filter((r) => r.intent === 'WATCHING')
  return { planned, watching }
}

export function pickNextGoalRace(upcoming: SeasonRace[]): SeasonRace | null {
  const plannedUpcoming = upcoming.filter((r) => r.intent === 'PLANNED')
  const aRace = plannedUpcoming.find((r) => r.priority === 'A')
  return aRace ?? plannedUpcoming[0] ?? null
}

/** Whole weeks remaining (floor). */
export function weeksUntil(date: Date): number {
  return Math.floor(daysUntil(date) / 7)
}

export function availableSeasonYears(races: SeasonRace[], now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()])
  for (const race of races) years.add(race.date.getUTCFullYear())
  return [...years].sort((a, b) => a - b)
}

export function defaultSeasonYear(races: SeasonRace[], now = new Date()): number {
  const next = races
    .filter((r) => daysUntil(r.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  if (next) return next.date.getUTCFullYear()
  return now.getFullYear()
}
