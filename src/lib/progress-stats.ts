import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { getISOWeek } from 'date-fns'
import { SPORT_ROW_ORDER } from '@/lib/constants'
import {
  addDateOnlyDays,
  endOfMonthDateOnly,
  endOfWeekDateOnly,
  formatDateOnly,
  startOfMonthDateOnly,
  startOfWeekDateOnly,
  todayDateOnly,
} from '@/lib/dates'
import { percent } from '@/lib/utils'

export type ProgressWorkoutRow = {
  date: Date
  type: WorkoutType
  status: WorkoutStatus
  selfLogged?: boolean
  plannedDistance: number | null
  plannedDistanceMeters?: number | null
  plannedDuration: number | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
  } | null
}

export type ProgressMonthBucket = {
  planned: number
  completed: number
  skipped: number
  plannedDistance: number
  completedDistance: number
  plannedDuration: number
  completedDuration: number
}

export type ProgressWeekBucket = ProgressMonthBucket & {
  label: string
  range: string
  start: Date
  completion: number
}

export type ProgressMonthRow = {
  label: string
  monthIndex: number
  byYear: Partial<Record<number, ProgressMonthBucket>>
}

export type ProgressSportBucket = {
  sport: WorkoutType | 'ALL'
  weekly: ProgressWeekBucket[]
  monthly: ProgressMonthRow[]
  month: ProgressMonthBucket
}

export type ProgressStats = {
  sports: WorkoutType[]
  years: number[]
  all: ProgressSportBucket
  bySport: Partial<Record<WorkoutType, ProgressSportBucket>>
}

const STAT_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

const MONTH_LABELS = [
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

const WEEK_COUNT = 52
const YEAR_LOOKBACK = 2

function isStatWorkout(w: ProgressWorkoutRow) {
  return w.type !== WorkoutType.REST
}

function plannedDistanceKm(workout: ProgressWorkoutRow): number {
  if (workout.type === WorkoutType.SWIM) {
    if (workout.plannedDistanceMeters != null && workout.plannedDistanceMeters > 0) {
      return workout.plannedDistanceMeters / 1000
    }
    if (workout.plannedDistance != null && workout.plannedDistance > 0) {
      return workout.plannedDistance
    }
    return 0
  }
  return workout.plannedDistance ?? 0
}

function completedDistanceKm(workout: ProgressWorkoutRow): number {
  if (workout.result?.actualDistance != null && workout.result.actualDistance > 0) {
    return workout.result.actualDistance
  }
  return plannedDistanceKm(workout)
}

function emptyMonthBucket(): ProgressMonthBucket {
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

function aggregateWorkouts(workouts: ProgressWorkoutRow[]): ProgressMonthBucket {
  const relevant = workouts.filter(isStatWorkout)
  const plannedRows = relevant.filter((w) => !w.selfLogged)
  const completedRows = relevant.filter((w) => w.status === WorkoutStatus.COMPLETED)
  return {
    planned: plannedRows.length,
    completed: completedRows.length,
    skipped: relevant.filter((w) => w.status === WorkoutStatus.SKIPPED).length,
    plannedDistance: plannedRows.reduce((s, w) => s + plannedDistanceKm(w), 0),
    completedDistance: completedRows.reduce((s, w) => s + completedDistanceKm(w), 0),
    plannedDuration: plannedRows.reduce((s, w) => s + (w.plannedDuration ?? 0), 0),
    completedDuration: completedRows.reduce(
      (s, w) => s + (w.result?.actualDuration ?? w.plannedDuration ?? 0),
      0,
    ),
  }
}

function toWeekBucket(
  workouts: ProgressWorkoutRow[],
  label: string,
  range: string,
  start: Date,
): ProgressWeekBucket {
  const month = aggregateWorkouts(workouts)
  return {
    label,
    range,
    start,
    ...month,
    completion: percent(month.completed, month.planned),
  }
}

function initMonthRows(years: number[]): ProgressMonthRow[] {
  return MONTH_LABELS.map((label, monthIndex) => ({
    label,
    monthIndex,
    byYear: Object.fromEntries(years.map((year) => [year, emptyMonthBucket()])),
  }))
}

function addMonthWorkouts(rows: ProgressMonthRow[], workouts: ProgressWorkoutRow[]) {
  for (const workout of workouts.filter(isStatWorkout)) {
    const year = workout.date.getUTCFullYear()
    const monthIndex = workout.date.getUTCMonth()
    const row = rows[monthIndex]
    if (!row?.byYear[year]) continue

    const bucket = row.byYear[year]!
    const isPlanned = !workout.selfLogged
    const isCompleted = workout.status === WorkoutStatus.COMPLETED
    const isSkipped = workout.status === WorkoutStatus.SKIPPED

    if (isPlanned) {
      bucket.planned += 1
      bucket.plannedDistance += plannedDistanceKm(workout)
      bucket.plannedDuration += workout.plannedDuration ?? 0
    }
    if (isCompleted) {
      bucket.completed += 1
      bucket.completedDistance += completedDistanceKm(workout)
      bucket.completedDuration +=
        workout.result?.actualDuration ?? workout.plannedDuration ?? 0
    }
    if (isSkipped) bucket.skipped += 1
  }
}

function buildWeekRanges(count: number) {
  const today = todayDateOnly()
  return Array.from({ length: count }, (_, i) => {
    const anchor = addDateOnlyDays(today, -(count - 1 - i) * 7)
    const start = startOfWeekDateOnly(anchor)
    const end = endOfWeekDateOnly(anchor)
    const weekNum = getISOWeek(start)
    return {
      start,
      end,
      label: `W${weekNum}`,
      range: `${formatDateOnly(start, 'd MMM')}–${formatDateOnly(end, 'd MMM')}`,
    }
  })
}

function buildSportBucket(
  sport: WorkoutType | 'ALL',
  allWorkouts: ProgressWorkoutRow[],
  weekRanges: ReturnType<typeof buildWeekRanges>,
  monthStart: Date,
  monthEnd: Date,
  years: number[],
): ProgressSportBucket {
  const filtered =
    sport === 'ALL' ? allWorkouts : allWorkouts.filter((w) => w.type === sport)

  const weekly = weekRanges.map(({ start, end, label, range }) => {
    const inWeek = filtered.filter((w) => w.date >= start && w.date <= end)
    return toWeekBucket(inWeek, label, range, start)
  })

  const monthWorkouts = filtered.filter((w) => w.date >= monthStart && w.date <= monthEnd)
  const monthly = initMonthRows(years)
  addMonthWorkouts(monthly, filtered)

  return {
    sport,
    weekly,
    monthly,
    month: aggregateWorkouts(monthWorkouts),
  }
}

export function buildProgressStats(workouts: ProgressWorkoutRow[]): ProgressStats {
  const today = todayDateOnly()
  const monthStart = startOfMonthDateOnly(today)
  const monthEnd = endOfMonthDateOnly(today)
  const currentYear = today.getUTCFullYear()
  const years = Array.from({ length: YEAR_LOOKBACK + 1 }, (_, i) => currentYear - i)

  const weekRanges = buildWeekRanges(WEEK_COUNT)
  const rangeStart = weekRanges[0]?.start ?? monthStart
  const inRange = workouts.filter((w) => w.date >= rangeStart && w.date <= monthEnd)

  const sportsWithData = STAT_SPORTS.filter((sport) =>
    inRange.some((w) => w.type === sport && isStatWorkout(w)),
  )

  const bySport: Partial<Record<WorkoutType, ProgressSportBucket>> = {}
  for (const sport of sportsWithData) {
    bySport[sport] = buildSportBucket(sport, inRange, weekRanges, monthStart, monthEnd, years)
  }

  return {
    sports: sportsWithData,
    years,
    all: buildSportBucket('ALL', inRange, weekRanges, monthStart, monthEnd, years),
    bySport,
  }
}
