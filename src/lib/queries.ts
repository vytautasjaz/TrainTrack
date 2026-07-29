import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { addDateOnlyDays, todayDateOnly, toDateKey } from '@/lib/dates'
import type { DayNoteData } from '@/lib/day-notes'
import { AthleteStatus, WorkoutStatus } from '@prisma/client'
import { buildProgressStats } from '@/lib/progress-stats'
import { WORKOUT_LIST_ORDER_BY } from '@/lib/workout-sort'

export const DEFAULT_PLANNING_LEAD_DAYS = 3
export const MIN_PLANNING_LEAD_DAYS = 1
export const MAX_PLANNING_LEAD_DAYS = 30

export function clampPlanningLeadDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PLANNING_LEAD_DAYS
  return Math.min(MAX_PLANNING_LEAD_DAYS, Math.max(MIN_PLANNING_LEAD_DAYS, Math.floor(value)))
}

export const WORKOUT_PLAN_INCLUDE = {
  result: true,
} as const

export async function getAthleteDashboard(athleteId: string) {
  const today = todayDateOnly()

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const [todayWorkouts, upcomingWorkouts, nextRace, pendingRaceFollowUps, weekWorkouts, monthWorkouts] =
    await Promise.all([
      prisma.workout.findMany({
        where: { athleteId, date: today },
        include: WORKOUT_PLAN_INCLUDE,
        orderBy: WORKOUT_LIST_ORDER_BY,
      }),
      prisma.workout.findMany({
        where: { athleteId, date: { gt: today } },
        include: WORKOUT_PLAN_INCLUDE,
        orderBy: { date: 'asc' },
        take: 5,
      }),
      prisma.race.findFirst({
        where: { athleteId, intent: 'PLANNED', date: { gte: today } },
        orderBy: { date: 'asc' },
      }),
      prisma.race.findMany({
        where: {
          athleteId,
          intent: 'PLANNED',
          date: { lt: today },
          outcome: null,
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.workout.findMany({
        where: { athleteId, date: { gte: weekStart, lte: weekEnd } },
        include: WORKOUT_PLAN_INCLUDE,
      }),
      prisma.workout.findMany({
        where: {
          athleteId,
          date: { gte: monthStart, lte: monthEnd },
          status: WorkoutStatus.COMPLETED,
        },
        include: WORKOUT_PLAN_INCLUDE,
      }),
    ])

  const weekPlanned = weekWorkouts.filter((w) => w.type !== 'REST').length
  const weekCompleted = weekWorkouts.filter((w) => w.status === WorkoutStatus.COMPLETED).length

  const weekDistance = weekWorkouts.reduce(
    (sum, w) => sum + (w.result?.actualDistance ?? w.plannedDistance ?? 0),
    0,
  )
  const weekDuration = weekWorkouts.reduce(
    (sum, w) => sum + (w.result?.actualDuration ?? w.plannedDuration ?? 0),
    0,
  )

  const monthDistance = monthWorkouts.reduce(
    (sum, w) => sum + (w.result?.actualDistance ?? w.plannedDistance ?? 0),
    0,
  )
  const monthDuration = monthWorkouts.reduce(
    (sum, w) => sum + (w.result?.actualDuration ?? w.plannedDuration ?? 0),
    0,
  )

  return {
    todayWorkouts,
    upcomingWorkouts,
    nextRace,
    pendingRaceFollowUps,
    weekPlanned,
    weekCompleted,
    weekDistance,
    weekDuration,
    monthDistance,
    monthDuration,
    monthWorkoutsCompleted: monthWorkouts.length,
    unreadCoachReplies: await getUnreadCoachReplies(athleteId),
  }
}

export async function getUnreadCoachReplies(athleteId: string) {
  const results = await prisma.workoutResult.findMany({
    where: {
      workout: { athleteId },
      coachReply: { not: null },
      coachReplyReadAt: null,
    },
    include: { workout: true },
    orderBy: { coachRepliedAt: 'desc' },
    take: 20,
  })

  return results.filter((r) => r.coachReply?.trim())
}

export async function getUnreadCoachReplyCount(athleteId: string) {
  return prisma.workoutResult.count({
    where: {
      workout: { athleteId },
      coachReply: { not: null },
      coachReplyReadAt: null,
    },
  })
}

export async function getUnreadCoachFeedbackCount(coachId: string) {
  return prisma.workoutResult.count({
    where: {
      workout: { athlete: { coachId } },
      athleteNotes: { not: null },
      feedbackDismissedAt: null,
    },
  })
}

export async function getCoachDashboard(coachId: string) {
  const today = todayDateOnly()
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { planningLeadDays: true },
  })
  const planningLeadDays = clampPlanningLeadDays(
    coach?.planningLeadDays ?? DEFAULT_PLANNING_LEAD_DAYS,
  )
  const horizonDate = addDateOnlyDays(today, planningLeadDays)

  const athletes = await prisma.athlete.findMany({
    where: { coachId },
    include: {
      races: {
        where: { intent: 'PLANNED', date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: 1,
      },
      workouts: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
            lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
          },
        },
        include: WORKOUT_PLAN_INCLUDE,
      },
    },
    orderBy: { name: 'asc' },
  })

  const activeAthletes = athletes.filter((a) => a.status === AthleteStatus.ACTIVE)
  const coverage =
    activeAthletes.length > 0
      ? await prisma.workout.groupBy({
          by: ['athleteId'],
          where: {
            athleteId: { in: activeAthletes.map((a) => a.id) },
            date: { gte: today },
          },
          _max: { date: true },
        })
      : []
  const coverageByAthlete = new Map(
    coverage.map((row) => [row.athleteId, row._max.date ? toDateKey(row._max.date) : null]),
  )
  const horizonKey = toDateKey(horizonDate)

  const planningWarnings = activeAthletes
    .map((athlete) => {
      const lastPlannedKey = coverageByAthlete.get(athlete.id) ?? null
      const needsPlan = !lastPlannedKey || lastPlannedKey < horizonKey
      if (!needsPlan) return null
      return {
        athleteId: athlete.id,
        athleteName: athlete.name,
        avatarUrl: athlete.avatarUrl,
        lastPlannedKey,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  const recentFeedback = await prisma.workoutResult.findMany({
    where: {
      workout: { athlete: { coachId } },
      athleteNotes: { not: null },
      feedbackDismissedAt: null,
    },
    include: {
      workout: { include: { athlete: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 20,
  })

  return {
    athletes,
    recentFeedback: recentFeedback.filter((r) => r.athleteNotes?.trim()),
    planningLeadDays,
    planningWarnings,
  }
}

export async function getWeekExtraPlanSportRows(athleteId: string, weekStart: Date) {
  const rows = await prisma.athleteWeekPlanSportRow.findMany({
    where: { athleteId, weekStart },
    select: { sport: true },
    orderBy: { sport: 'asc' },
  })
  return rows.map((row) => row.sport)
}

export async function getWeekHiddenPlanSportRows(athleteId: string, weekStart: Date) {
  const rows = await prisma.athleteWeekHiddenPlanSportRow.findMany({
    where: { athleteId, weekStart },
    select: { sport: true },
    orderBy: { sport: 'asc' },
  })
  return rows.map((row) => row.sport)
}

export async function getAthleteForCoach(coachId: string, athleteId: string) {
  return prisma.athlete.findFirst({
    where: { id: athleteId, coachId },
    include: {
      races: { orderBy: { date: 'asc' } },
    },
  })
}

export async function getRacesForRange(athleteId: string, start: Date, end: Date) {
  return prisma.race.findMany({
    where: {
      athleteId,
      intent: 'PLANNED',
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }, { name: 'asc' }],
  })
}

export async function getPlanWorkouts(athleteId: string, anchor: Date) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })
  return getPlanWorkoutsInRange(athleteId, weekStart, weekEnd)
}

export async function getPlanWorkoutsInRange(athleteId: string, start: Date, end: Date) {
  return prisma.workout.findMany({
    where: { athleteId, date: { gte: start, lte: end } },
    include: { ...WORKOUT_PLAN_INCLUDE, template: true },
    orderBy: WORKOUT_LIST_ORDER_BY,
  })
}

export async function getMonthWorkouts(athleteId: string, year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = endOfMonth(start)

  return prisma.workout.findMany({
    where: { athleteId, date: { gte: start, lte: end } },
    include: WORKOUT_PLAN_INCLUDE,
    orderBy: { date: 'asc' },
  })
}

export function groupWorkoutsByDate<T extends { date: Date }>(workouts: T[]) {
  const map = new Map<string, T[]>()
  for (const w of workouts) {
    const key = toDateKey(w.date)
    const list = map.get(key) ?? []
    map.set(key, [...list, w])
  }
  return map
}

export async function getDayNotesForRange(athleteId: string, start: Date, end: Date) {
  return prisma.dayNote.findMany({
    where: { athleteId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  })
}

export function groupDayNotesByDate(
  notes: { date: Date; status: DayNoteData['status']; notes: string | null }[],
) {
  const map = new Map<string, DayNoteData>()
  for (const n of notes) {
    map.set(toDateKey(n.date), { status: n.status, notes: n.notes })
  }
  return map
}

export function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export async function getProgressStats(athleteId: string) {
  const today = new Date()
  const monthEnd = endOfMonth(today)
  const rangeStart = startOfWeek(addDays(today, -7 * 7), { weekStartsOn: 1 })

  const workouts = await prisma.workout.findMany({
    where: { athleteId, date: { gte: rangeStart, lte: monthEnd } },
    include: WORKOUT_PLAN_INCLUDE,
    orderBy: { date: 'asc' },
  })

  return buildProgressStats(
    workouts.map((w) => ({
      date: w.date,
      type: w.type,
      status: w.status,
      plannedDistance: w.plannedDistance,
      plannedDuration: w.plannedDuration,
      result: w.result
        ? {
            actualDistance: w.result.actualDistance,
            actualDuration: w.result.actualDuration,
          }
        : null,
    })),
  )
}

export async function getWorkoutHistory(athleteId: string, limit = 100) {
  return prisma.workout.findMany({
    where: {
      athleteId,
      status: WorkoutStatus.COMPLETED,
      result: { isNot: null },
    },
    include: WORKOUT_PLAN_INCLUDE,
    orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })
}

export async function getCompletedWorkoutsInRange(
  athleteId: string,
  start: Date,
  end: Date,
) {
  return prisma.workout.findMany({
    where: {
      athleteId,
      status: WorkoutStatus.COMPLETED,
      result: { isNot: null },
      date: { gte: start, lte: end },
    },
    include: WORKOUT_PLAN_INCLUDE,
    orderBy: [{ date: 'asc' }, { title: 'asc' }],
  })
}
