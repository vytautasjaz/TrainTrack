import { prisma } from '@/lib/prisma'
import {
  addDateOnlyDays,
  endOfMonthDateOnly,
  endOfWeekDateOnly,
  startOfMonthDateOnly,
  startOfWeekDateOnly,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'
import type { DayNoteData, DayNoteViewer } from '@/lib/day-notes'
import { redactDayNoteForViewer } from '@/lib/day-notes'
import { AthleteStatus, WorkoutStatus, WorkoutType } from '@prisma/client'
import { buildProgressStats } from '@/lib/progress-stats'
import {
  resolveRaceDistancesBySport,
  sumRaceDistancesKm,
  sumRaceDurationsMin,
} from '@/lib/race-distance-stats'
import { WORKOUT_LIST_ORDER_BY } from '@/lib/workout-sort'
import { athleteOwnedByCoachWhere } from '@/lib/session'

export const DEFAULT_PLANNING_LEAD_DAYS = 3
export const MIN_PLANNING_LEAD_DAYS = 1
export const MAX_PLANNING_LEAD_DAYS = 30

export function clampPlanningLeadDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PLANNING_LEAD_DAYS
  return Math.min(MAX_PLANNING_LEAD_DAYS, Math.max(MIN_PLANNING_LEAD_DAYS, Math.floor(value)))
}

export const WORKOUT_PLAN_INCLUDE = {
  result: true,
  rescheduledCopy: { select: { id: true, date: true } },
} as const

/** Workouts that count toward weekly compliance (not rest/recovery markers or day notes). */
export function countsTowardCompliance(workout: {
  type: WorkoutType
  isRescheduleGhost?: boolean
  selfLogged?: boolean
}): boolean {
  if (workout.isRescheduleGhost) return false
  if (workout.selfLogged) return false
  return workout.type !== WorkoutType.REST && workout.type !== WorkoutType.RECOVERY
}

function workoutVolumeKm(workout: {
  selfLogged?: boolean
  status: WorkoutStatus
  plannedDistance: number | null
  result?: { actualDistance: number | null } | null
}): number {
  const actual = workout.result?.actualDistance ?? 0
  const planned = workout.plannedDistance ?? 0
  if (workout.selfLogged) {
    return workout.status === WorkoutStatus.COMPLETED ? actual || planned : 0
  }
  return actual || planned
}

function workoutVolumeMin(workout: {
  selfLogged?: boolean
  status: WorkoutStatus
  plannedDuration: number | null
  result?: { actualDuration: number | null } | null
}): number {
  const actual = workout.result?.actualDuration ?? 0
  const planned = workout.plannedDuration ?? 0
  if (workout.selfLogged) {
    return workout.status === WorkoutStatus.COMPLETED ? actual || planned : 0
  }
  return actual || planned
}

export async function getAthleteDashboard(athleteId: string) {
  const today = todayDateOnly()

  const weekStart = startOfWeekDateOnly(today)
  const weekEnd = endOfWeekDateOnly(today)
  const monthStart = startOfMonthDateOnly(today)
  const monthEnd = endOfMonthDateOnly(today)
  /** Current week ±4 weeks for dashboard week-stats navigation. */
  const weekStatsWindowStart = addDateOnlyDays(weekStart, -28)
  const weekStatsWindowEnd = addDateOnlyDays(weekEnd, 28)

  const [
    todayWorkouts,
    upcomingWorkouts,
    nextRace,
    pendingRaceFollowUpsRaw,
    weekStatsWindowWorkouts,
    monthWorkouts,
    recentCompletedWorkouts,
    weekRaces,
    monthRaces,
    athletePlan,
  ] = await Promise.all([
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
        where: {
          athleteId,
          intent: 'PLANNED',
          resultsLogOnly: false,
          date: { gte: today },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.race.findMany({
        where: {
          athleteId,
          intent: 'PLANNED',
          resultsLogOnly: false,
          date: { lt: today },
          outcome: null,
        },
        include: {
          legs: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.workout.findMany({
        where: {
          athleteId,
          date: { gte: weekStatsWindowStart, lte: weekStatsWindowEnd },
        },
        include: WORKOUT_PLAN_INCLUDE,
        orderBy: WORKOUT_LIST_ORDER_BY,
      }),
      prisma.workout.findMany({
        where: {
          athleteId,
          date: { gte: monthStart, lte: monthEnd },
          status: WorkoutStatus.COMPLETED,
        },
        include: WORKOUT_PLAN_INCLUDE,
      }),
      prisma.workout.findMany({
        where: {
          athleteId,
          status: WorkoutStatus.COMPLETED,
          date: { lte: today },
          type: { notIn: [WorkoutType.REST, WorkoutType.RECOVERY] },
        },
        include: WORKOUT_PLAN_INCLUDE,
        orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        take: 3,
      }),
      getRacesForRange(athleteId, weekStart, weekEnd),
      getRacesForRange(athleteId, monthStart, monthEnd),
      prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { planSportRows: true, swimCssSecPer100m: true },
      }),
    ])

  const weekWorkouts = weekStatsWindowWorkouts.filter(
    (w) => w.date >= weekStart && w.date <= weekEnd,
  )

  const { ensureTriathlonLegsForRace } = await import('@/lib/strava/sync')
  const pendingRaceFollowUps = await Promise.all(
    pendingRaceFollowUpsRaw.map(async (race) => {
      if (race.type !== 'TRIATHLON') return race
      if (race.legs.length > 0) return race
      await ensureTriathlonLegsForRace(race.id, race.type)
      const legs = await prisma.raceLeg.findMany({
        where: { raceId: race.id },
        orderBy: { sortOrder: 'asc' },
      })
      return { ...race, legs }
    }),
  )

  const weekPlanned = weekWorkouts.filter(countsTowardCompliance).length
  const weekCompleted = weekWorkouts.filter(
    (w) =>
      w.status === WorkoutStatus.COMPLETED &&
      w.type !== WorkoutType.REST &&
      w.type !== WorkoutType.RECOVERY &&
      !w.isRescheduleGhost,
  ).length

  const weekDistance =
    weekWorkouts.reduce((sum, w) => {
      if (w.type === WorkoutType.REST || w.type === WorkoutType.RECOVERY) return sum
      if (w.isRescheduleGhost) return sum
      return sum + workoutVolumeKm(w)
    }, 0) +
    weekRaces.reduce((sum, race) => {
      const bySport = resolveRaceDistancesBySport(race)
      // Prefer actual when any exists; otherwise planned (upcoming races in the week).
      const actual = sumRaceDistancesKm(bySport, 'actual')
      return sum + (actual > 0 ? actual : sumRaceDistancesKm(bySport, 'planned'))
    }, 0)
  const weekDuration =
    weekWorkouts.reduce((sum, w) => {
      if (w.type === WorkoutType.REST || w.type === WorkoutType.RECOVERY) return sum
      if (w.isRescheduleGhost) return sum
      return sum + workoutVolumeMin(w)
    }, 0) +
    weekRaces.reduce((sum, race) => {
      const bySport = resolveRaceDistancesBySport(race)
      const actual = sumRaceDurationsMin(bySport, 'actual')
      return sum + (actual > 0 ? actual : sumRaceDurationsMin(bySport, 'planned'))
    }, 0)

  const monthDistance =
    monthWorkouts.reduce(
      (sum, w) => sum + (w.result?.actualDistance ?? w.plannedDistance ?? 0),
      0,
    ) +
    monthRaces
      .filter((r) => r.outcome === 'FINISHED')
      .reduce((sum, race) => {
        const bySport = resolveRaceDistancesBySport(race)
        const actual = sumRaceDistancesKm(bySport, 'actual')
        return sum + (actual > 0 ? actual : sumRaceDistancesKm(bySport, 'planned'))
      }, 0)
  const monthDuration =
    monthWorkouts.reduce(
      (sum, w) => sum + (w.result?.actualDuration ?? w.plannedDuration ?? 0),
      0,
    ) +
    monthRaces
      .filter((r) => r.outcome === 'FINISHED')
      .reduce((sum, race) => {
        const bySport = resolveRaceDistancesBySport(race)
        const actual = sumRaceDurationsMin(bySport, 'actual')
        return sum + (actual > 0 ? actual : sumRaceDurationsMin(bySport, 'planned'))
      }, 0)

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
    recentCompletedWorkouts,
    unreadCoachReplies: await getUnreadCoachReplies(athleteId),
    weekStatsWindowWorkouts,
    weekStatsAnchorStartKey: toDateKey(weekStart),
    planSportRows: athletePlan?.planSportRows ?? [],
    swimCssSecPer100m: athletePlan?.swimCssSecPer100m ?? null,
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

const UNREAD_RACE_REPORT_WHERE = {
  outcome: { in: ['FINISHED' as const, 'DID_NOT_START' as const, 'DNF' as const] },
  resultDismissedAt: null,
}

export async function getPendingCoachRequests(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
    select: {
      coachingCode: true,
      links: {
        where: { status: 'PENDING' },
        include: { athlete: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!profile) return { coachingCode: null as string | null, requests: [] }
  return {
    coachingCode: profile.coachingCode,
    requests: profile.links,
  }
}

export async function getPendingCoachRequestCount(coachUserId: string) {
  return prisma.coachAthleteLink.count({
    where: {
      status: 'PENDING',
      coachProfile: { userId: coachUserId },
    },
  })
}

export async function getUnreadCoachFeedbackCount(coachId: string) {
  const athleteWhere = athleteOwnedByCoachWhere(coachId)
  const [workoutCount, raceCount] = await Promise.all([
    prisma.workoutResult.count({
      where: {
        workout: { athlete: athleteWhere },
        athleteNotes: { not: null },
        feedbackDismissedAt: null,
      },
    }),
    prisma.race.count({
      where: {
        athlete: athleteWhere,
        ...UNREAD_RACE_REPORT_WHERE,
      },
    }),
  ])
  return workoutCount + raceCount
}

export async function getCoachDashboard(coachId: string) {
  const today = todayDateOnly()
  const athleteWhere = athleteOwnedByCoachWhere(coachId)
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { planningLeadDays: true },
  })
  const planningLeadDays = clampPlanningLeadDays(
    coach?.planningLeadDays ?? DEFAULT_PLANNING_LEAD_DAYS,
  )
  const horizonDate = addDateOnlyDays(today, planningLeadDays)

  const athletes = await prisma.athlete.findMany({
    where: athleteWhere,
    include: {
      races: {
        where: { intent: 'PLANNED', date: { gte: today } },
        orderBy: { date: 'asc' },
        take: 1,
      },
      workouts: {
        where: {
          date: {
            gte: startOfWeekDateOnly(today),
            lte: endOfWeekDateOnly(today),
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

  const [recentFeedback, recentRaceReports] = await Promise.all([
    prisma.workoutResult.findMany({
      where: {
        workout: { athlete: athleteWhere },
        athleteNotes: { not: null },
        feedbackDismissedAt: null,
      },
      include: {
        workout: { include: { athlete: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),
    prisma.race.findMany({
      where: {
        athlete: athleteWhere,
        ...UNREAD_RACE_REPORT_WHERE,
      },
      include: {
        athlete: { select: { id: true, name: true } },
        legs: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { resultLoggedAt: 'desc' },
      take: 20,
    }),
  ])

  return {
    athletes,
    recentFeedback: recentFeedback.filter((r) => r.athleteNotes?.trim()),
    recentRaceReports,
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
    where: { id: athleteId, ...athleteOwnedByCoachWhere(coachId) },
    include: {
      races: {
        orderBy: { date: 'asc' },
        include: { legs: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })
}

export async function getRacesForRange(athleteId: string, start: Date, end: Date) {
  return prisma.race.findMany({
    where: {
      athleteId,
      intent: 'PLANNED',
      resultsLogOnly: false,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      type: true,
      sport: true,
      priority: true,
      intent: true,
      goal: true,
      url: true,
      triathlonDistance: true,
      customDistanceKm: true,
      outcome: true,
      resultTime: true,
      legs: {
        select: {
          kind: true,
          actualDistanceKm: true,
          actualDurationMin: true,
          plannedDistanceKm: true,
          plannedTime: true,
          resultTime: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

export async function getPlanWorkouts(athleteId: string, anchor: Date) {
  const weekStart = startOfWeekDateOnly(anchor)
  const weekEnd = endOfWeekDateOnly(anchor)
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
  const start = new Date(Date.UTC(year, month, 1))
  const end = endOfMonthDateOnly(start)

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
  notes: {
    date: Date
    status: DayNoteData['status']
    athleteNotes: string | null
    athleteNotesPrivate: boolean
    coachNotes: string | null
    coachNotesPrivate: boolean
  }[],
  viewer: DayNoteViewer = 'athlete',
) {
  const map = new Map<string, DayNoteData>()
  for (const n of notes) {
    map.set(
      toDateKey(n.date),
      redactDayNoteForViewer(
        {
          status: n.status,
          athleteNotes: n.athleteNotes,
          athleteNotesPrivate: n.athleteNotesPrivate,
          coachNotes: n.coachNotes,
          coachNotesPrivate: n.coachNotesPrivate,
        },
        viewer,
      ),
    )
  }
  return map
}

/** Season events that overlap [start, end] (inclusive). */
export async function getSeasonEventsForRange(athleteId: string, start: Date, end: Date) {
  return prisma.seasonEvent.findMany({
    where: {
      athleteId,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      title: true,
      notes: true,
      startDate: true,
      endDate: true,
    },
  })
}

/** Future workouts (today+) for calendar export (all-day). */
export async function getCalendarTrainingEvents(athleteId: string, from: Date) {
  return prisma.workout.findMany({
    where: {
      athleteId,
      date: { gte: from },
      isRescheduleGhost: false,
    },
    orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      date: true,
      title: true,
      description: true,
      sessionType: true,
      type: true,
      plannedDistance: true,
      plannedDuration: true,
      status: true,
      selfLogged: true,
      updatedAt: true,
    },
  })
}

/** Future planned races (today+) for calendar export (all-day). */
export async function getCalendarRaceEvents(athleteId: string, from: Date) {
  return prisma.race.findMany({
    where: {
      athleteId,
      intent: 'PLANNED',
      resultsLogOnly: false,
      date: { gte: from },
    },
    orderBy: [{ date: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      date: true,
      name: true,
      location: true,
      type: true,
      sport: true,
      priority: true,
      goal: true,
      updatedAt: true,
    },
  })
}

export function getWeekDays(anchor: Date) {
  const start = startOfWeekDateOnly(anchor)
  return Array.from({ length: 7 }, (_, i) => addDateOnlyDays(start, i))
}

export async function getProgressStats(athleteId: string) {
  const today = todayDateOnly()
  const monthEnd = endOfMonthDateOnly(today)
  const rangeStart = startOfWeekDateOnly(addDateOnlyDays(today, -7 * 7))

  const [workouts, races] = await Promise.all([
    prisma.workout.findMany({
      where: { athleteId, date: { gte: rangeStart, lte: monthEnd } },
      include: WORKOUT_PLAN_INCLUDE,
      orderBy: { date: 'asc' },
    }),
    getRacesForRange(athleteId, rangeStart, monthEnd),
  ])

  const workoutRows = workouts.map((w) => ({
    date: w.date,
    type: w.type,
    status: w.status,
    selfLogged: w.selfLogged,
    plannedDistance: w.plannedDistance,
    plannedDuration: w.plannedDuration,
    result: w.result
      ? {
          actualDistance: w.result.actualDistance,
          actualDuration: w.result.actualDuration,
        }
      : null,
  }))

  const raceRows = races.flatMap((race) => {
    const bySport = resolveRaceDistancesBySport(race)
    const finished = race.outcome === 'FINISHED'
    return (Object.entries(bySport) as [WorkoutType, NonNullable<(typeof bySport)[keyof typeof bySport]>][])
      .filter(
        ([, dist]) =>
          dist && (dist.plannedKm > 0 || dist.plannedMin > 0 || dist.actualKm != null || dist.actualMin != null),
      )
      .map(([type, dist]) => ({
        date: race.date,
        type,
        status: finished ? WorkoutStatus.COMPLETED : WorkoutStatus.PLANNED,
        plannedDistance: dist.plannedKm > 0 ? dist.plannedKm : null,
        plannedDuration: dist.plannedMin > 0 ? Math.round(dist.plannedMin) : null,
        result:
          dist.actualKm != null || dist.actualMin != null || finished
            ? {
                actualDistance:
                  dist.actualKm ?? (finished && dist.plannedKm > 0 ? dist.plannedKm : null),
                actualDuration:
                  dist.actualMin != null
                    ? Math.round(dist.actualMin)
                    : finished && dist.plannedMin > 0
                      ? Math.round(dist.plannedMin)
                      : null,
              }
            : null,
      }))
  })

  return buildProgressStats([...workoutRows, ...raceRows])
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
