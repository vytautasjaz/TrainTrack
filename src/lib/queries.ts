import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { todayDateOnly, toDateKey } from '@/lib/dates'
import type { DayNoteData } from '@/lib/day-notes'
import { WorkoutStatus } from '@prisma/client'
import { buildProgressStats } from '@/lib/progress-stats'

export async function getAthleteDashboard(athleteId: string) {
  const today = todayDateOnly()

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const [todayWorkouts, upcomingWorkouts, nextRace, weekWorkouts, monthWorkouts] =
    await Promise.all([
      prisma.workout.findMany({
        where: { athleteId, date: today },
        include: { result: true },
        orderBy: { title: 'asc' },
      }),
      prisma.workout.findMany({
        where: { athleteId, date: { gt: today } },
        include: { result: true },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      prisma.race.findFirst({
        where: { athleteId, date: { gte: today } },
        orderBy: { date: 'asc' },
      }),
      prisma.workout.findMany({
        where: { athleteId, date: { gte: weekStart, lte: weekEnd } },
        include: { result: true },
      }),
      prisma.workout.findMany({
        where: {
          athleteId,
          date: { gte: monthStart, lte: monthEnd },
          status: WorkoutStatus.COMPLETED,
        },
        include: { result: true },
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
  const athletes = await prisma.athlete.findMany({
    where: { coachId },
    include: {
      races: { where: { date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 1 },
      workouts: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
            lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
          },
        },
        include: { result: true },
      },
    },
    orderBy: { name: 'asc' },
  })

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
    where: { athleteId, date: { gte: start, lte: end } },
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
    include: { result: true, template: true },
    orderBy: [{ date: 'asc' }, { title: 'asc' }],
  })
}

export async function getMonthWorkouts(athleteId: string, year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = endOfMonth(start)

  return prisma.workout.findMany({
    where: { athleteId, date: { gte: start, lte: end } },
    include: { result: true },
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
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const rangeStart = startOfWeek(addDays(today, -7 * 7), { weekStartsOn: 1 })

  const workouts = await prisma.workout.findMany({
    where: { athleteId, date: { gte: rangeStart, lte: monthEnd } },
    include: { result: true },
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
    include: { result: true },
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
    include: { result: true },
    orderBy: [{ date: 'asc' }, { title: 'asc' }],
  })
}
