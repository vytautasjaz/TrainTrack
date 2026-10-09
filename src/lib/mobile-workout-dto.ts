import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  addDateOnlyDays,
  endOfWeekDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfWeekDateOnly,
  todayDateKey,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'
import { buildPlanTableDays } from '@/lib/plan-week'
import { sumSportWeekTotals } from '@/lib/plan-week-totals'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
} from '@/lib/week-sport-stats'
import {
  buildAthleteStructureDisplay,
  formatPhaseBlockDetail,
} from '@/lib/workout-builder/athlete-structure-display'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import {
  getWorkoutCardDuration,
  getWorkoutCardEssence,
  getWorkoutCardHero,
  getWorkoutCardTss,
  getWorkoutCompletionPercent,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
  workoutHasLoggedActuals,
} from '@/lib/workout-card'
import { DEFAULT_DURATION_NOTATION } from '@/lib/workout-builder/duration-notation'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import {
  daySessionLoadActual,
  daySessionLoadPlanned,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import { DASHBOARD_WEEK_NAV_LIMIT } from '@/lib/dashboard-week-nav'
import { getISOWeek } from 'date-fns'

export type MobileSportId =
  | 'run'
  | 'bike'
  | 'swim'
  | 'strength'
  | 'recovery'
  | 'hyrox'

export type MobileWorkoutStatus = 'planned' | 'completed' | 'skipped'

export type MobileStructureBlock = {
  label: string
  detail: string
}

/** Shape consumed by Expo Today cards, Upcoming rows, and detail modal. */
export type MobileWorkoutDto = {
  id: string
  sport: MobileSportId
  sportLabel: string
  title: string
  description: string
  dateKey: string
  dateLabel: string
  weekday: string
  dateNum: string
  month: string
  metric: string
  zone: string | null
  sessionType: string | null
  prescription: string
  status: MobileWorkoutStatus
  actualMetric: string | null
  plannedMetric: string | null
  actualSecondary: string | null
  plannedSecondary: string | null
  pace: string | null
  completionPercent: number | null
  coachNotes: string | null
  structure: MobileStructureBlock[]
  tss: string | null
  plannedTss: string | null
}

function sportId(type: WorkoutType): MobileSportId {
  switch (type) {
    case WorkoutType.BIKE:
      return 'bike'
    case WorkoutType.SWIM:
      return 'swim'
    case WorkoutType.STRENGTH:
      return 'strength'
    case WorkoutType.RECOVERY:
    case WorkoutType.REST:
      return 'recovery'
    case WorkoutType.HYROX:
      return 'hyrox'
    default:
      return 'run'
  }
}

function statusId(status: WorkoutStatus): MobileWorkoutStatus {
  if (status === WorkoutStatus.COMPLETED) return 'completed'
  if (status === WorkoutStatus.SKIPPED) return 'skipped'
  return 'planned'
}

function extractZone(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/\b(Z[1-5]|CSS|FTP|Threshold|Tempo|VO2)\b/i)
  return match?.[1] ?? null
}

function formatHeroLabel(
  value: string,
  unit: string | null | undefined,
): string {
  return unit ? `${value} ${unit}` : value
}

function formatResultClock(minutes: number): string {
  const totalSecs = Math.max(0, Math.round(minutes * 60))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function avgPace(workout: PlanWorkoutDetail): string | null {
  const distanceKm = workout.result?.actualDistance
  const durationMin = workout.result?.actualDuration
  if (
    distanceKm == null ||
    distanceKm <= 0 ||
    durationMin == null ||
    durationMin <= 0
  ) {
    return null
  }
  let pace = ''
  if (workout.type === WorkoutType.SWIM) {
    pace = formatPaceMinPerKm(durationMin / (distanceKm * 10))
  } else if (
    workout.type === WorkoutType.RUN ||
    workout.type === WorkoutType.TRIATHLON ||
    workout.type === WorkoutType.HYROX
  ) {
    pace = formatPaceMinPerKm(durationMin / distanceKm)
  }
  return pace || null
}

function structureBlocks(workout: PlanWorkoutDetail): MobileStructureBlock[] {
  if (!workout.structure || !hasStructureContent(workout.structure)) return []
  try {
    const display = buildAthleteStructureDisplay({
      structure: workout.structure,
      plannedDistance: workout.plannedDistance,
      plannedDuration: workout.plannedDuration,
      sportType: workout.type,
    })
    return display.blocks.slice(0, 12).map((block) => ({
      label: block.title || 'Block',
      detail: formatPhaseBlockDetail(block),
    }))
  } catch {
    return []
  }
}

function isRestLike(workout: PlanWorkoutDetail): boolean {
  return workout.type === WorkoutType.REST || workout.type === WorkoutType.RECOVERY
}

export function toMobileWorkoutDto(
  workout: PlanWorkoutDetail,
  thresholds: SessionLoadThresholds = {},
): MobileWorkoutDto {
  const done = isWorkoutCardCompleted(workout.status)
  const skipped = isWorkoutCardSkipped(workout.status)
  const hero = getWorkoutCardHero(workout)
  const secondary = getWorkoutCardDuration(workout)
  const showLogged = done && workoutHasLoggedActuals(workout)
  const metrics = getWorkoutPlanMetrics(workout, workout.status)
  const essence = getWorkoutCardEssence(workout, DEFAULT_DURATION_NOTATION, {
    includeAllBlocks: false,
  })
  const description =
    workout.description?.trim() ||
    essence.join('\n') ||
    metrics.distance ||
    metrics.duration ||
    '—'
  const prescription =
    essence[0] ||
    getWorkoutPlanMetrics(workout, WorkoutStatus.PLANNED).distance ||
    getWorkoutPlanMetrics(workout, WorkoutStatus.PLANNED).duration ||
    description.split('\n')[0] ||
    '—'

  const plannedMetric = hero
    ? formatHeroLabel(hero.value, hero.unit)
    : metrics.distance ?? metrics.duration ?? '—'

  const actualMetric =
    showLogged && hero ? formatHeroLabel(hero.value, hero.unit) : null
  const plannedAlongside =
    showLogged && hero?.plannedValue
      ? formatHeroLabel(hero.plannedValue, hero.plannedUnit)
      : null

  const actualSecondary =
    showLogged && secondary?.actual
      ? secondary.actual
      : showLogged && workout.result?.actualDuration != null
        ? formatResultClock(workout.result.actualDuration)
        : null
  const plannedSecondary =
    showLogged && secondary?.planned
      ? secondary.planned
      : showLogged && workout.plannedDuration != null && workout.plannedDuration > 0
        ? formatResultClock(workout.plannedDuration)
        : null

  const sessionType = workout.sessionType
    ? getSessionTypeLabel(workout.sessionType, workout.type)
    : null

  const zone =
    extractZone(workout.description) ?? extractZone(prescription) ?? null

  const pct = getWorkoutCompletionPercent(workout, workout.status)
  const tss = getWorkoutCardTss(workout, workout.status, thresholds)

  return {
    id: workout.id,
    sport: sportId(workout.type),
    sportLabel: WORKOUT_TYPE_LABELS[workout.type],
    title: workout.isRace ? `⚑ ${workout.title}` : workout.title,
    description,
    dateKey: workout.dateKey,
    dateLabel: formatDateOnly(workout.dateKey, 'EEE d MMM yyyy'),
    weekday: formatDateOnly(workout.dateKey, 'EEE'),
    dateNum: formatDateOnly(workout.dateKey, 'd'),
    month: formatDateOnly(workout.dateKey, 'MMM'),
    metric: plannedMetric,
    zone,
    sessionType,
    prescription,
    status: skipped ? 'skipped' : done ? 'completed' : 'planned',
    actualMetric,
    plannedMetric: plannedAlongside ?? (done ? plannedMetric : null),
    actualSecondary,
    plannedSecondary,
    pace: done ? avgPace(workout) : null,
    completionPercent: pct,
    coachNotes: workout.coachNotes?.trim() || null,
    structure: structureBlocks(workout),
    tss: tss?.actual ?? null,
    plannedTss: tss?.planned ?? null,
  }
}

export function formatGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatGreetingName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name
  return first
}

function workoutsByDateMap(workouts: PlanWorkoutDetail[]) {
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const workout of workouts) {
    const list = byDate.get(workout.dateKey) ?? []
    list.push(workout)
    byDate.set(workout.dateKey, list)
  }
  return byDate
}

/** Same Upcoming window as web athlete home (forward weeks only). */
export function buildMobileUpcoming(input: {
  weekPlanWorkouts: PlanWorkoutDetail[]
  weekOffset: number
  thresholds?: SessionLoadThresholds
}): {
  upcoming: MobileWorkoutDto[]
  weekLabel: string
  weekTitle: string
  canGoPrev: boolean
  canGoNext: boolean
  weekOffset: number
} {
  const weekOffset = Math.max(0, Math.min(4, Math.floor(input.weekOffset)))
  const thisWeekStart = startOfWeekDateOnly(todayDateOnly())
  const viewWeekStart = addDateOnlyDays(thisWeekStart, weekOffset * 7)
  const byDate = workoutsByDateMap(input.weekPlanWorkouts)
  const dates = Array.from({ length: 7 }, (_, i) =>
    addDateOnlyDays(viewWeekStart, i),
  )
  let days = buildPlanTableDays(dates, byDate)

  if (weekOffset === 0) {
    const todayKey = todayDateKey()
    days = days.filter((day) => day.dateKey > todayKey)
  }

  const upcoming: MobileWorkoutDto[] = []
  for (const day of days) {
    for (const workout of day.workouts) {
      if (isRestLike(workout) && !workout.isRace) continue
      if (workout.isRescheduleGhost) continue
      upcoming.push(toMobileWorkoutDto(workout, input.thresholds))
    }
  }

  let weekLabel: string
  if (weekOffset === 0 && days.length > 0) {
    const first = days[0]!
    const last = days[days.length - 1]!
    weekLabel =
      first.dateKey === last.dateKey
        ? formatDateOnly(first.date, 'd MMM')
        : `${formatDateOnly(first.date, 'd MMM')} – ${formatDateOnly(last.date, 'd MMM')}`
  } else {
    const end = endOfWeekDateOnly(viewWeekStart)
    weekLabel = `${formatDateOnly(viewWeekStart, 'd MMM')} – ${formatDateOnly(end, 'd MMM')}`
  }

  const weekTitle =
    weekOffset === 0
      ? 'Upcoming'
      : weekOffset === 1
        ? 'Next week'
        : 'Week'

  return {
    upcoming,
    weekLabel,
    weekTitle,
    canGoPrev: weekOffset > 0,
    canGoNext: weekOffset < 4,
    weekOffset,
  }
}

export function filterTodayWorkouts(
  todayWorkouts: PlanWorkoutDetail[],
): PlanWorkoutDetail[] {
  return todayWorkouts.filter(
    (w) => !isRestLike(w) || Boolean(w.description?.trim() || w.coachNotes?.trim()),
  )
}

const WEEK_STATS_NAV_LIMIT = DASHBOARD_WEEK_NAV_LIMIT

export type MobileWeekSportStat = {
  id: string
  sport: MobileSportId
  label: string
  actualLabel: string
  plannedLabel: string
  unit: string
  pct: number
}

export type MobileWeekStatsDto = {
  title: string
  rangeLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
  sports: MobileWeekSportStat[]
  overall: {
    completedLabel: string
    plannedLabel: string
    pct: number
  }
}

function formatHoursLabel(min: number): string {
  if (min <= 0) return '0h'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h${m}` : `${h}h`
}

function workoutTypeToMobileSport(type: WorkoutType): MobileSportId {
  return sportId(type)
}

/** Same week-stats math as web `AthleteWeekStatsCard`. */
export function buildMobileWeekStats(input: {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  weekOffset: number
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
}): MobileWeekStatsDto {
  const weekOffset = Math.max(
    -WEEK_STATS_NAV_LIMIT,
    Math.min(WEEK_STATS_NAV_LIMIT, Math.floor(input.weekOffset)),
  )
  const anchor = parseDateOnly(input.anchorWeekStartKey)
  const weekStart = addDateOnlyDays(anchor, weekOffset * 7)
  const keys = Array.from({ length: 7 }, (_, i) =>
    toDateKey(addDateOnlyDays(weekStart, i)),
  )
  const keySet = new Set(keys)
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const w of input.workouts) {
    if (!keySet.has(w.dateKey)) continue
    const list = byDate.get(w.dateKey) ?? []
    list.push(w)
    byDate.set(w.dateKey, list)
  }
  const days = keys.map((dateKey) => ({
    workouts: byDate.get(dateKey) ?? [],
  }))
  const all = days.flatMap((d) => d.workouts)
  const options = { swimCssSecPer100m: input.swimCssSecPer100m ?? null }
  const sportList = weekSportsWithPlannedWork(
    days,
    input.planSportRows ?? [],
    options,
  )

  let plannedMin = 0
  let completedMin = 0
  const sports: MobileWeekSportStat[] = []
  for (const type of sportList) {
    const totals = sumSportWeekTotals(days, type, options)
    plannedMin += totals.durationMin
    completedMin += totals.actualDurationMin
    const metric = weekSportMetric(type, totals, all)
    sports.push({
      id: type,
      sport: workoutTypeToMobileSport(type),
      label: WORKOUT_TYPE_LABELS[type],
      actualLabel: metric.actualLabel,
      plannedLabel: metric.plannedLabel,
      unit: metric.unit,
      pct: weekSportProgressPercent(metric.actual, metric.planned),
    })
  }

  const overallPct =
    plannedMin > 0
      ? Math.min(100, Math.round((completedMin / plannedMin) * 100))
      : 0

  const start = parseDateOnly(keys[0]!)
  const end = parseDateOnly(keys[6]!)
  const rangeLabel =
    start.getMonth() === end.getMonth()
      ? `${formatDateOnly(start, 'd')}–${formatDateOnly(end, 'd MMM')}`
      : `${formatDateOnly(start, 'd MMM')}–${formatDateOnly(end, 'd MMM')}`

  const weekNum = getISOWeek(start)
  const title =
    weekOffset === 0
      ? 'This week'
      : weekOffset === -1
        ? 'Last week'
        : weekOffset === 1
          ? 'Next week'
          : `Week ${weekNum}`

  return {
    title,
    rangeLabel,
    weekOffset,
    canGoPrev: weekOffset > -WEEK_STATS_NAV_LIMIT,
    canGoNext: weekOffset < WEEK_STATS_NAV_LIMIT,
    sports,
    overall: {
      completedLabel: formatHoursLabel(completedMin),
      plannedLabel: formatHoursLabel(plannedMin),
      pct: overallPct,
    },
  }
}

/** Full ±4 week window for mobile swipe carousel (same as web). */
export function buildMobileWeekStatsWindow(input: {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
}): MobileWeekStatsDto[] {
  const weeks: MobileWeekStatsDto[] = []
  for (let offset = -WEEK_STATS_NAV_LIMIT; offset <= WEEK_STATS_NAV_LIMIT; offset++) {
    weeks.push(
      buildMobileWeekStats({
        ...input,
        weekOffset: offset,
      }),
    )
  }
  return weeks
}

const TRAINING_LOAD_OFFSETS = Array.from(
  { length: DASHBOARD_WEEK_NAV_LIMIT * 2 + 1 },
  (_, i) => i - DASHBOARD_WEEK_NAV_LIMIT,
)

export type MobileTrainingLoadWeek = {
  weekOffset: number
  title: string
  rangeLabel: string
  plannedWeek: boolean
  dailyPlannedTss: number[]
  dailyActualTss: number[]
  dailyPlannedTime: number[]
  dailyActualTime: number[]
  plannedTotalTss: number
  actualTotalTss: number
  plannedTotalTime: number
  actualTotalTime: number
}

function dayMinutesPlanned(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === WorkoutType.REST || w.isRescheduleGhost) continue
    if (w.status === WorkoutStatus.SKIPPED) continue
    sum += w.plannedDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

function dayMinutesActual(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === WorkoutType.REST || w.isRescheduleGhost) continue
    if (w.status !== WorkoutStatus.COMPLETED) continue
    sum += w.result?.actualDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

/** Last / this / next week training-load series — same math as web card. */
export function buildMobileTrainingLoadWeeks(input: {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  thresholds?: SessionLoadThresholds
}): MobileTrainingLoadWeek[] {
  const todayKey = todayDateKey()
  const anchor = parseDateOnly(input.anchorWeekStartKey)
  const thresholds = input.thresholds ?? {}

  return TRAINING_LOAD_OFFSETS.map((off) => {
    const weekStart = addDateOnlyDays(anchor, off * 7)
    const keys = Array.from({ length: 7 }, (_, i) =>
      toDateKey(addDateOnlyDays(weekStart, i)),
    )
    const plannedWeek = keys.every((k) => k > todayKey)
    const dailyPlannedTss = keys.map((k) =>
      daySessionLoadPlanned(input.workouts, k, thresholds),
    )
    const dailyActualTss = keys.map((k) =>
      daySessionLoadActual(input.workouts, k, thresholds),
    )
    const dailyPlannedTime = keys.map((k) => dayMinutesPlanned(input.workouts, k))
    const dailyActualTime = keys.map((k) => dayMinutesActual(input.workouts, k))

    const start = parseDateOnly(keys[0]!)
    const end = parseDateOnly(keys[6]!)
    const rangeLabel =
      start.getMonth() === end.getMonth()
        ? `${formatDateOnly(start, 'd')}–${formatDateOnly(end, 'd MMM')}`
        : `${formatDateOnly(start, 'd MMM')}–${formatDateOnly(end, 'd MMM')}`

    const title =
      off === 0
        ? 'This week'
        : off === -1
          ? 'Last week'
          : off === 1
            ? 'Next week'
            : `Week ${getISOWeek(start)}`

    return {
      weekOffset: off,
      title,
      rangeLabel,
      plannedWeek,
      dailyPlannedTss,
      dailyActualTss,
      dailyPlannedTime,
      dailyActualTime,
      plannedTotalTss: dailyPlannedTss.reduce((a, b) => a + b, 0),
      actualTotalTss: dailyActualTss.reduce((a, b) => a + b, 0),
      plannedTotalTime: dailyPlannedTime.reduce((a, b) => a + b, 0),
      actualTotalTime: dailyActualTime.reduce((a, b) => a + b, 0),
    }
  })
}

