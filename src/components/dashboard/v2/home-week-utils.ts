import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { format } from 'date-fns'
import {
  addDateOnlyDays,
  parseDateOnly,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'
import type { DayNoteData } from '@/lib/day-notes'
import { buildPlanTableDays, type PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { SeasonEventData } from '@/lib/season-planner'
import {
  daySessionLoadActual,
  daySessionLoadPlanned,
  weekSessionLoadActual,
  weekSessionLoadPlanned,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import type { WeatherDaySummary } from '@/lib/weather/places'

/** Home week grid: browse ±4 weeks around this week (matches weekPlanWorkouts window). */
export const HOME_V2_WEEK_LIMIT = 4
export const HOME_V2_WEEK_CENTER = HOME_V2_WEEK_LIMIT
/** Extra weeks revealed when the hero board is expanded (forward from the focused week). */
export const HOME_V2_EXPAND_EXTRA_WEEKS = 3
/** Focus + extras shown while expanded. */
export const HOME_V2_EXPAND_PACK_SIZE = HOME_V2_EXPAND_EXTRA_WEEKS + 1
/** Weeks fetched per lazy home swipe chunk. */
export const HOME_V2_WEEK_CHUNK = HOME_V2_EXPAND_PACK_SIZE
/** Prefetch when the focused offset is this close to a loaded edge. */
export const HOME_V2_WEEK_PREFETCH_EDGE = 1

/** Pack starts (…, -4, 0, 4, …) that fit inside an inclusive offset window. */
export function homeV2ExpandedPackStartsInRange(
  minOffset: number,
  maxOffset: number,
) {
  const starts: number[] = []
  const first =
    Math.floor(minOffset / HOME_V2_EXPAND_PACK_SIZE) * HOME_V2_EXPAND_PACK_SIZE
  for (
    let i = first;
    i <= maxOffset - HOME_V2_EXPAND_EXTRA_WEEKS;
    i += HOME_V2_EXPAND_PACK_SIZE
  ) {
    if (i >= minOffset) starts.push(i)
  }
  return starts
}

/** @deprecated Prefer homeV2ExpandedPackStartsInRange for infinite swipe. */
export function homeV2ExpandedPackStarts(maxIndex = HOME_V2_WEEK_LIMIT * 2) {
  return homeV2ExpandedPackStartsInRange(0, maxIndex)
}

export function homeV2MaxExpandedFocusIndex(maxIndex = HOME_V2_WEEK_LIMIT * 2) {
  const starts = homeV2ExpandedPackStarts(maxIndex)
  return starts[starts.length - 1] ?? 0
}

/** Snap any week offset down to its expanded pack start (…, -4, 0, 4, …). */
export function homeV2SnapToExpandedPackStart(weekOffset: number) {
  return (
    Math.floor(weekOffset / HOME_V2_EXPAND_PACK_SIZE) * HOME_V2_EXPAND_PACK_SIZE
  )
}

export function workoutsByDateMap(workouts: PlanWorkoutDetail[]) {
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const workout of workouts) {
    const list = byDate.get(workout.dateKey) ?? []
    list.push(workout)
    byDate.set(workout.dateKey, list)
  }
  for (const list of byDate.values()) {
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.title.localeCompare(b.title),
    )
  }
  return byDate
}

export function weekStartForOffset(anchorStartKey: string, offsetFromCenter: number) {
  const anchor = parseDateOnly(anchorStartKey)
  return addDateOnlyDays(anchor, offsetFromCenter * 7)
}

export function buildHomeWeekDays(
  weekStart: Date,
  workouts: PlanWorkoutDetail[],
  notesByDate?: Map<string, DayNoteData>,
  eventsByDate?: Map<string, SeasonEventData[]>,
  weatherByDate?: Map<string, WeatherDaySummary>,
): PlanDay[] {
  const byDate = workoutsByDateMap(workouts)
  const dates = Array.from({ length: 7 }, (_, i) => addDateOnlyDays(weekStart, i))
  return buildPlanTableDays(
    dates,
    byDate,
    notesByDate,
    eventsByDate,
    weatherByDate,
  )
}

function formatDateSpanLabel(
  rangeStart: Date,
  rangeEnd: Date,
  compact = false,
) {
  const sameMonth = rangeStart.getUTCMonth() === rangeEnd.getUTCMonth()
  const sameYear =
    rangeStart.getUTCFullYear() === rangeEnd.getUTCFullYear()
  const localStart = new Date(
    rangeStart.getUTCFullYear(),
    rangeStart.getUTCMonth(),
    rangeStart.getUTCDate(),
  )
  const localEnd = new Date(
    rangeEnd.getUTCFullYear(),
    rangeEnd.getUTCMonth(),
    rangeEnd.getUTCDate(),
  )
  const startLabel = format(localStart, 'd')
  if (compact) {
    if (sameMonth) {
      return `${startLabel} – ${format(localEnd, 'd MMM')}`
    }
    return `${format(localStart, 'd MMM')} – ${format(localEnd, 'd MMM')}`
  }
  const endLabel = format(localEnd, 'd MMMM yyyy')
  if (sameMonth) {
    return `${startLabel} – ${endLabel}`
  }
  if (sameYear) {
    return `${format(localStart, 'd MMMM')} – ${endLabel}`
  }
  return `${format(localStart, 'd MMMM yyyy')} – ${endLabel}`
}

export function formatWeekRangeLabel(weekStart: Date, compact = false) {
  return formatDateSpanLabel(weekStart, addDateOnlyDays(weekStart, 6), compact)
}

/** Label for N consecutive weeks starting at `weekStart` (Mon → Sun of last week). */
export function formatWeeksSpanLabel(
  weekStart: Date,
  weekCount: number,
  compact = false,
) {
  const count = Math.max(1, Math.round(weekCount))
  return formatDateSpanLabel(
    weekStart,
    addDateOnlyDays(weekStart, count * 7 - 1),
    compact,
  )
}

function countsTowardCompliance(w: PlanWorkoutDetail) {
  return (
    w.type !== WorkoutType.REST &&
    w.type !== WorkoutType.RECOVERY &&
    !w.isRescheduleGhost
  )
}

function volumeKm(w: PlanWorkoutDetail, preferActual: boolean) {
  if (w.type === WorkoutType.REST || w.type === WorkoutType.RECOVERY) return 0
  if (w.isRescheduleGhost) return 0
  if (preferActual) {
    const actual = w.result?.actualDistance
    if (actual != null && actual > 0) return actual
  }
  if (w.selfLogged) return w.result?.actualDistance ?? w.plannedDistance ?? 0
  return w.plannedDistance ?? 0
}

function actualVolumeKm(w: PlanWorkoutDetail) {
  if (w.type === WorkoutType.REST || w.type === WorkoutType.RECOVERY) return 0
  if (w.isRescheduleGhost) return 0
  if (w.status !== WorkoutStatus.COMPLETED) return 0
  return w.result?.actualDistance ?? 0
}

export type HomeWeekMetricsModel = {
  /** How many weeks the totals cover (1 = single week, 4 = expanded pack). */
  weekCount: number
  /** Display headline (legacy hybrid); prefer done + planned for UI. */
  distanceKm: number
  /** Completed distance this week (km). */
  doneDistanceKm: number
  plannedDistanceKm: number
  tssActual: number
  tssPlanned: number
  completed: number
  planned: number
  prevDistanceKm: number
  prevTssActual: number
  /**
   * Mini-bar series: Mon→Sun distance when weekCount === 1;
   * one value per week when weekCount > 1.
   */
  dailyDistanceKm: number[]
  /** Matching TSS series for hero mini bars. */
  dailyTss: number[]
}

export function computeHomeWeekMetrics(
  weekStart: Date,
  weekWorkouts: PlanWorkoutDetail[],
  prevWeekWorkouts: PlanWorkoutDetail[],
  thresholds: SessionLoadThresholds,
  weekCount = 1,
): HomeWeekMetricsModel {
  const count = Math.max(1, Math.round(weekCount))
  const planned = weekWorkouts.filter(countsTowardCompliance).length
  const completed = weekWorkouts.filter(
    (w) =>
      countsTowardCompliance(w) && w.status === WorkoutStatus.COMPLETED,
  ).length

  const plannedDistanceKm = weekWorkouts.reduce(
    (sum, w) => sum + volumeKm(w, false),
    0,
  )
  const doneDistanceKm = weekWorkouts.reduce(
    (sum, w) => sum + actualVolumeKm(w),
    0,
  )

  const today = todayDateOnly()
  const rangeEnd = addDateOnlyDays(weekStart, count * 7 - 1)
  const isFutureRange = toDateKey(weekStart) > toDateKey(today)
  const displayDistance = isFutureRange
    ? plannedDistanceKm
    : doneDistanceKm > 0
      ? doneDistanceKm
      : toDateKey(rangeEnd) < toDateKey(today)
        ? doneDistanceKm
        : plannedDistanceKm

  const tssPlanned = weekSessionLoadPlanned(weekWorkouts, thresholds)
  const tssActual = weekSessionLoadActual(weekWorkouts, thresholds)
  const prevDistanceKm = prevWeekWorkouts.reduce((sum, w) => {
    if (!countsTowardCompliance(w)) return sum
    return sum + (actualVolumeKm(w) || volumeKm(w, false))
  }, 0)
  const prevTssActual = weekSessionLoadActual(prevWeekWorkouts, thresholds)

  const dailyDistanceKm: number[] = []
  const dailyTss: number[] = []

  if (count === 1) {
    for (let i = 0; i < 7; i++) {
      const key = toDateKey(addDateOnlyDays(weekStart, i))
      const dayWorkouts = weekWorkouts.filter((w) => w.dateKey === key)
      const dayKm = dayWorkouts.reduce((sum, w) => {
        const actual = actualVolumeKm(w)
        return sum + (actual > 0 ? actual : volumeKm(w, false))
      }, 0)
      dailyDistanceKm.push(Math.round(dayKm * 10) / 10)
      const actualTss = daySessionLoadActual(weekWorkouts, key, thresholds)
      const plannedTss = daySessionLoadPlanned(weekWorkouts, key, thresholds)
      dailyTss.push(actualTss > 0 ? actualTss : plannedTss)
    }
  } else {
    for (let w = 0; w < count; w++) {
      const start = addDateOnlyDays(weekStart, w * 7)
      const startKey = toDateKey(start)
      const endKey = toDateKey(addDateOnlyDays(start, 6))
      const slice = weekWorkouts.filter(
        (x) => x.dateKey >= startKey && x.dateKey <= endKey,
      )
      const weekKm = slice.reduce((sum, x) => {
        const actual = actualVolumeKm(x)
        return sum + (actual > 0 ? actual : volumeKm(x, false))
      }, 0)
      dailyDistanceKm.push(Math.round(weekKm * 10) / 10)
      const actualTss = weekSessionLoadActual(slice, thresholds)
      const plannedTss = weekSessionLoadPlanned(slice, thresholds)
      dailyTss.push(actualTss > 0 ? actualTss : plannedTss)
    }
  }

  return {
    weekCount: count,
    distanceKm: Math.round(displayDistance * 10) / 10,
    doneDistanceKm: Math.round(doneDistanceKm * 10) / 10,
    plannedDistanceKm: Math.round(plannedDistanceKm * 10) / 10,
    tssActual,
    tssPlanned,
    completed,
    planned,
    prevDistanceKm: Math.round(prevDistanceKm * 10) / 10,
    prevTssActual,
    dailyDistanceKm,
    dailyTss,
  }
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function daysUntil(dateKey: string): number {
  const today = todayDateOnly()
  const target = parseDateOnly(dateKey)
  const ms = target.getTime() - today.getTime()
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)))
}

/** True rest days only — recovery / hike / walk are real sessions, not Rest cards. */
export function isRestLike(workout: PlanWorkoutDetail) {
  return workout.type === WorkoutType.REST
}

/** Strava maps Hike → RECOVERY; titles usually contain “Hike”. */
export function isHikeLike(workout: PlanWorkoutDetail) {
  if (workout.type === WorkoutType.REST) return false
  if (/\bhike\b/i.test(workout.title)) return true
  if (workout.type === WorkoutType.RECOVERY && /\bhike\b/i.test(workout.description ?? '')) {
    return true
  }
  return false
}

export function tagToneForWorkout(
  workout: PlanWorkoutDetail,
): 'run' | 'bike' | 'swim' | 'strength' | 'recovery' | 'hike' {
  if (isHikeLike(workout)) return 'hike'
  if (workout.type === WorkoutType.BIKE) return 'bike'
  if (workout.type === WorkoutType.SWIM) return 'swim'
  if (workout.type === WorkoutType.STRENGTH) return 'strength'
  if (workout.type === WorkoutType.HYROX) return 'strength'
  if (workout.type === WorkoutType.RECOVERY || workout.type === WorkoutType.REST) {
    return 'recovery'
  }
  return 'run'
}
