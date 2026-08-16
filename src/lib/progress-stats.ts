import { WorkoutStatus, WorkoutType } from '@prisma/client'
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
  plannedDuration: number | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
  } | null
}

export type ProgressWeekBucket = {
  label: string
  planned: number
  completed: number
  skipped: number
  plannedDistance: number
  completedDistance: number
  plannedDuration: number
  completedDuration: number
  completion: number
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

export type ProgressSportBucket = {
  sport: WorkoutType | 'ALL'
  weekly: ProgressWeekBucket[]
  month: ProgressMonthBucket
}

export type ProgressStats = {
  sports: WorkoutType[]
  all: ProgressSportBucket
  bySport: Partial<Record<WorkoutType, ProgressSportBucket>>
}

const STAT_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

function isStatWorkout(w: ProgressWorkoutRow) {
  return w.type !== WorkoutType.REST
}

function aggregateWorkouts(workouts: ProgressWorkoutRow[]): ProgressMonthBucket {
  const relevant = workouts.filter(isStatWorkout)
  const plannedRows = relevant.filter((w) => !w.selfLogged)
  const completedRows = relevant.filter((w) => w.status === WorkoutStatus.COMPLETED)
  return {
    planned: plannedRows.length,
    completed: completedRows.length,
    skipped: relevant.filter((w) => w.status === WorkoutStatus.SKIPPED).length,
    plannedDistance: plannedRows.reduce((s, w) => s + (w.plannedDistance ?? 0), 0),
    completedDistance: completedRows.reduce(
      (s, w) => s + (w.result?.actualDistance ?? w.plannedDistance ?? 0),
      0,
    ),
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
): ProgressWeekBucket {
  const month = aggregateWorkouts(workouts)
  return {
    label,
    ...month,
    completion: percent(month.completed, month.planned),
  }
}

function buildSportBucket(
  sport: WorkoutType | 'ALL',
  allWorkouts: ProgressWorkoutRow[],
  weekRanges: { start: Date; end: Date; label: string }[],
  monthStart: Date,
  monthEnd: Date,
): ProgressSportBucket {
  const filtered =
    sport === 'ALL'
      ? allWorkouts
      : allWorkouts.filter((w) => w.type === sport)

  const weekly = weekRanges.map(({ start, end, label }) => {
    const inWeek = filtered.filter((w) => w.date >= start && w.date <= end)
    return toWeekBucket(inWeek, label)
  })

  const monthWorkouts = filtered.filter((w) => w.date >= monthStart && w.date <= monthEnd)

  return {
    sport,
    weekly,
    month: aggregateWorkouts(monthWorkouts),
  }
}

export function buildProgressStats(workouts: ProgressWorkoutRow[]): ProgressStats {
  const today = todayDateOnly()
  const monthStart = startOfMonthDateOnly(today)
  const monthEnd = endOfMonthDateOnly(today)

  const weekRanges = Array.from({ length: 8 }, (_, i) => {
    const anchor = addDateOnlyDays(today, -i * 7)
    const start = startOfWeekDateOnly(anchor)
    const end = endOfWeekDateOnly(anchor)
    return { start, end, label: formatDateOnly(start, 'd MMM') }
  }).reverse()

  const rangeStart = weekRanges[0]?.start ?? monthStart
  const inRange = workouts.filter((w) => w.date >= rangeStart && w.date <= monthEnd)

  const sportsWithData = STAT_SPORTS.filter((sport) =>
    inRange.some((w) => w.type === sport && isStatWorkout(w)),
  )

  const bySport: Partial<Record<WorkoutType, ProgressSportBucket>> = {}
  for (const sport of sportsWithData) {
    bySport[sport] = buildSportBucket(sport, inRange, weekRanges, monthStart, monthEnd)
  }

  return {
    sports: sportsWithData,
    all: buildSportBucket('ALL', inRange, weekRanges, monthStart, monthEnd),
    bySport,
  }
}
