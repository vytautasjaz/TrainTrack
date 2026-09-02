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
import { AthleteStatus, RaceIntent, WorkoutStatus, WorkoutType, CoachingAuthorRole, CoachingMessageKind, CoachingThreadStatus } from '@prisma/client'
import { buildProgressStats } from '@/lib/progress-stats'
import {
  resolveRaceDistancesBySport,
  sumRaceDistancesKm,
  sumRaceDurationsMin,
} from '@/lib/race-distance-stats'
import { WORKOUT_LIST_ORDER_BY } from '@/lib/workout-sort'
import { athleteOwnedByCoachWhere } from '@/lib/session'
import {
  listCoachInboxThreads,
  serializeInboxThread,
  toCoachingThreadView,
  INBOX_LIST_MAX,
  ensureGeneralChatThreads,
  listCoachGeneralChatThreads,
  type CoachingThreadWithMessages,
} from '@/lib/coaching-inbox'
import { CoachingThreadKind } from '@prisma/client'
import {
  buildCoachRosterRows,
  type CoachHomeActivityFeedItem,
  type CoachHomeNeedsReplyThread,
  type CoachHomeTodayAthlete,
  type CoachNeedsReplySummary,
  type CoachRosterChatThread,
  type CoachRosterFeedbackItem,
  type CoachRosterRow,
} from '@/lib/coach-roster'
import { toPlanWorkoutDetail, redactPlanWorkoutNotesForViewer } from '@/lib/plan-workout'
import { getWorkoutCompletionSource } from '@/lib/workout-history'
import { formatDateKeyCompact } from '@/lib/dates'
import { daysUntil } from '@/lib/utils'
import { getWorkoutCardHero, getWorkoutCardSubtitle } from '@/lib/workout-card'
import { formatInboxRaceResultLabel } from '@/components/inbox/inbox-race-report-summary'
import type { RaceLegView } from '@/lib/race-legs'
import {
  athleteOptionsFromRoster,
  buildCoachHomeActivityTableRows,
  buildCoachHomeAttentionItems,
  buildCoachHomePlanningCoverageRows,
  buildCoachHomeRaceActivityRows,
  filterDismissedCoachHomeAttentionItems,
  mergeCoachHomeActivityFeed,
  type CoachHomeRaceFeedSource,
} from '@/lib/coach-home'

function mapCoachHomeRaceLegs(
  legs: Array<{
    id: string
    kind: RaceLegView['kind']
    sortOrder: number
    plannedTime: string | null
    plannedNotes: string | null
    plannedDistanceKm: number | null
    resultTime: string | null
    stravaActivityId: string | null
    stravaActivityUrl: string | null
    stravaActivityName: string | null
    actualDistanceKm: number | null
    actualDurationMin: number | null
  }>,
): RaceLegView[] {
  return legs.map((leg) => ({
    id: leg.id,
    kind: leg.kind,
    sortOrder: leg.sortOrder,
    plannedTime: leg.plannedTime,
    plannedNotes: leg.plannedNotes,
    plannedDistanceKm: leg.plannedDistanceKm,
    resultTime: leg.resultTime,
    stravaActivityId: leg.stravaActivityId,
    stravaActivityUrl: leg.stravaActivityUrl,
    stravaActivityName: leg.stravaActivityName,
    actualDistanceKm: leg.actualDistanceKm,
    actualDurationMin: leg.actualDurationMin,
  }))
}

function rosterChatThreadContext(
  row: ReturnType<typeof serializeInboxThread>,
  threadKind: CoachingThreadKind,
) {
  if (row.workoutDetail) {
    const hero = getWorkoutCardHero(row.workoutDetail)
    const contextMetric = hero?.value
      ? `${hero.approximate ? '~' : ''}${hero.value}${hero.unit ? ` ${hero.unit}` : ''}`.trim()
      : null
    return {
      contextTitle: row.workoutDetail.title,
      contextSubtitle: getWorkoutCardSubtitle(row.workoutDetail),
      contextMetric,
      contextDateKey: row.workoutDetail.dateKey,
    }
  }
  if (row.race) {
    return {
      contextTitle: row.race.name,
      contextSubtitle: formatInboxRaceResultLabel(row.race),
      contextMetric: row.race.resultPlace?.trim() || null,
      contextDateKey: row.race.dateKey,
    }
  }
  if (threadKind === CoachingThreadKind.ASK) {
    return {
      contextTitle: 'Ask coach',
      contextSubtitle: null,
      contextMetric: null,
      contextDateKey: null,
    }
  }
  if (threadKind === CoachingThreadKind.GENERAL) {
    return {
      contextTitle: 'General chat',
      contextSubtitle: 'Not tied to a workout',
      contextMetric: null,
      contextDateKey: null,
    }
  }
  return {
    contextTitle: null,
    contextSubtitle: null,
    contextMetric: null,
    contextDateKey: null,
  }
}

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
  coachingThread: {
    select: {
      status: true,
      lastMessageAt: true,
      coachLastReadAt: true,
      athleteLastReadAt: true,
      _count: { select: { messages: true } },
      messages: {
        select: { authorRole: true, kind: true },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
} as const

const ACTIVITY_FEED_WORKOUT_INCLUDE = {
  ...WORKOUT_PLAN_INCLUDE,
  coachingThread: {
    select: {
      id: true,
      kind: true,
      status: true,
      lastMessageAt: true,
      coachLastReadAt: true,
      athleteLastReadAt: true,
      messages: {
        select: {
          id: true,
          authorRole: true,
          kind: true,
          body: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
} as const

function buildActivityFeedThreadView(
  workout: {
    result: { feeling?: number | null } | null
    coachingThread: {
      id: string
      kind: CoachingThreadKind
      status: CoachingThreadStatus
      lastMessageAt: Date
      coachLastReadAt: Date | null
      athleteLastReadAt: Date | null
      messages: Array<{
        id: string
        authorRole: CoachingAuthorRole
        kind: CoachingMessageKind
        body: string
        createdAt: Date
      }>
    } | null
  },
): ReturnType<typeof toCoachingThreadView> | null {
  const thread = workout.coachingThread
  if (!thread || thread.messages.length === 0) return null
  return toCoachingThreadView({
    id: thread.id,
    status: thread.status,
    kind: thread.kind,
    messages: thread.messages,
    workout: { result: workout.result ? { feeling: workout.result.feeling ?? null } : null },
  })
}

function mapActivityFeedCoachingThread(
  thread: NonNullable<Parameters<typeof buildActivityFeedThreadView>[0]['coachingThread']>,
) {
  return {
    status: thread.status,
    lastMessageAt: thread.lastMessageAt,
    coachLastReadAt: thread.coachLastReadAt,
    athleteLastReadAt: thread.athleteLastReadAt,
    _count: { messages: thread.messages.length },
    messages: thread.messages.map((message) => ({
      authorRole: message.authorRole,
      kind: message.kind,
    })),
  }
}

function buildActivityFeedFeedbackThread(
  workout: Parameters<typeof buildActivityFeedThreadView>[0],
): ReturnType<typeof toCoachingThreadView> | null {
  const thread = workout.coachingThread
  if (!thread || thread.messages.length === 0) return null
  if (thread.kind !== CoachingThreadKind.FEEDBACK) return null
  return buildActivityFeedThreadView(workout)
}

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
    nextRaces,
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
        orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
        /** Glanceable Home list — full schedule via View plan. */
        take: 7,
      }),
      prisma.race.findMany({
        where: {
          athleteId,
          intent: 'PLANNED',
          resultsLogOnly: false,
          date: { gte: today },
        },
        orderBy: { date: 'asc' },
        take: 5,
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
          date: { lte: today },
          isRescheduleGhost: false,
          type: { notIn: [WorkoutType.REST, WorkoutType.RECOVERY] },
          status: { in: [WorkoutStatus.COMPLETED, WorkoutStatus.SKIPPED] },
        },
        include: WORKOUT_PLAN_INCLUDE,
        orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        take: 10,
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
    nextRace: nextRaces[0] ?? null,
    nextRaces,
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
        include: {
          athlete: { select: { id: true, name: true, avatarUrl: true } },
        },
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
    athletes.length > 0
      ? await prisma.workout.groupBy({
          by: ['athleteId'],
          where: {
            athleteId: { in: athletes.map((a) => a.id) },
            date: { gte: today },
            isRescheduleGhost: false,
          },
          _max: { date: true },
        })
      : []
  const lastPlannedKeyByAthlete = new Map<string, string | null>(
    coverage.map((row) => [
      row.athleteId,
      row._max.date ? toDateKey(row._max.date) : null,
    ]),
  )
  const horizonKey = toDateKey(horizonDate)

  const planningWarnings = activeAthletes
    .map((athlete) => {
      const lastPlannedKey = lastPlannedKeyByAthlete.get(athlete.id) ?? null
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
    lastPlannedKeyByAthlete,
  }
}

function buildRosterChatThread(
  thread: CoachingThreadWithMessages & {
    athlete?: { id: string; name: string; avatarUrl?: string | null }
  },
): CoachRosterChatThread {
  const row = serializeInboxThread(thread, 'coach')
  const view = toCoachingThreadView(thread)
  const context = rosterChatThreadContext(row, thread.kind)
  return {
    id: thread.id,
    unread: row.unread,
    needsReply: row.needsReply,
    preview: row.preview,
    lastMessageAt: row.lastMessageAt,
    contextTitle: context.contextTitle,
    contextSubtitle: context.contextSubtitle,
    contextMetric: context.contextMetric,
    contextDateKey: context.contextDateKey,
    threadKind: thread.kind,
    workoutDetail: row.workoutDetail,
    thread: view,
  }
}

export async function getCoachNeedsReplySummaries(
  coachUserId: string,
): Promise<CoachNeedsReplySummary[]> {
  const { needsReply } = await getCoachInboxAthleteStats(coachUserId)
  return needsReply
}

async function getCoachInboxAthleteStats(coachUserId: string) {
  const threads = await listCoachInboxThreads(coachUserId, {
    filter: 'all',
    take: INBOX_LIST_MAX,
  })

  const summaryMap = new Map<string, CoachNeedsReplySummary>()
  const needsReplyByAthlete = new Map<string, number>()
  const chatThreadsByAthlete = new Map<string, CoachRosterChatThread[]>()
  const feedbackThreadsByAthlete = new Map<string, CoachRosterFeedbackItem[]>()
  const needsReplyThreads: CoachHomeNeedsReplyThread[] = []

  function pushChat(athleteId: string, item: CoachRosterChatThread) {
    const list = chatThreadsByAthlete.get(athleteId) ?? []
    list.push(item)
    chatThreadsByAthlete.set(athleteId, list)
  }

  function pushFeedback(athleteId: string, item: CoachRosterFeedbackItem) {
    const list = feedbackThreadsByAthlete.get(athleteId) ?? []
    list.push(item)
    feedbackThreadsByAthlete.set(athleteId, list)
  }

  for (const thread of threads) {
    if (!thread.athlete) continue

    const athleteId = thread.athlete.id
    const row = serializeInboxThread(thread, 'coach')
    const view = toCoachingThreadView(thread)
    const context = rosterChatThreadContext(row, thread.kind)

    if (thread.kind !== CoachingThreadKind.GENERAL) {
      const isFeedbackThread =
        thread.kind === CoachingThreadKind.FEEDBACK ||
        thread.kind === CoachingThreadKind.RACE_REPORT

      if (isFeedbackThread && thread.messages.length > 0) {
        const title =
          thread.kind === CoachingThreadKind.RACE_REPORT
            ? 'Race report'
            : 'Workout feedback'
        pushFeedback(athleteId, {
          id: thread.id,
          athleteId,
          athleteName: thread.athlete.name,
          avatarUrl: thread.athlete.avatarUrl,
          unread: row.unread,
          preview: row.preview,
          lastMessageAt: row.lastMessageAt,
          title,
          body: row.preview,
          workoutTitle: context.contextTitle,
          workoutDateKey: context.contextDateKey,
          thread: view,
        })
      } else if (thread.messages.length > 0) {
        pushChat(athleteId, buildRosterChatThread(thread))
      }
    }

    if (!row.needsReply) continue

    needsReplyByAthlete.set(athleteId, (needsReplyByAthlete.get(athleteId) ?? 0) + 1)

    needsReplyThreads.push({
      id: thread.id,
      athleteId,
      athleteName: thread.athlete.name,
      avatarUrl: thread.athlete.avatarUrl,
      preview: row.preview,
      lastMessageAt: row.lastMessageAt,
      contextTitle: context.contextTitle,
      contextDateKey: context.contextDateKey,
      threadKind: thread.kind,
      workoutType: row.workoutDetail?.type ?? null,
      thread: view,
    })

    const existing = summaryMap.get(athleteId)
    if (existing) {
      existing.count += 1
      if (new Date(row.lastMessageAt) > new Date(existing.lastMessageAt)) {
        existing.preview = row.preview
        existing.lastMessageAt = row.lastMessageAt
      }
      continue
    }

    summaryMap.set(athleteId, {
      athleteId,
      athleteName: thread.athlete.name,
      avatarUrl: thread.athlete.avatarUrl,
      preview: row.preview,
      count: 1,
      lastMessageAt: row.lastMessageAt,
    })
  }

  for (const list of chatThreadsByAthlete.values()) {
    list.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    )
  }
  for (const list of feedbackThreadsByAthlete.values()) {
    list.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    )
  }

  const needsReply = Array.from(summaryMap.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )

  needsReplyThreads.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )

  return {
    needsReply,
    needsReplyByAthlete,
    chatThreadsByAthlete,
    feedbackThreadsByAthlete,
    needsReplyThreads,
  }
}

function groupWorkoutsByAthlete<T extends { athleteId: string }>(rows: T[]) {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const list = map.get(row.athleteId) ?? []
    list.push(row)
    map.set(row.athleteId, list)
  }
  return map
}

export async function getCoachHomeData(coachId: string) {
  const today = todayDateOnly()
  const weekStart = startOfWeekDateOnly(today)
  const lastWeekStart = addDateOnlyDays(weekStart, -7)
  const lastWeekEnd = addDateOnlyDays(weekStart, -1)
  const athleteWhere = athleteOwnedByCoachWhere(coachId)

  const volumeWorkoutSelect = {
    athleteId: true,
    date: true,
    status: true,
    type: true,
    selfLogged: true,
    plannedDistance: true,
    plannedDuration: true,
    isRescheduleGhost: true,
    result: { select: { actualDistance: true, actualDuration: true } },
  } as const

  const [dashboard, pendingCoach, inboxStats, lastWeekWorkouts, todayWorkoutRows, recentCompletedRows, recentRaceRows] =
    await Promise.all([
    getCoachDashboard(coachId),
    getPendingCoachRequests(coachId),
    getCoachInboxAthleteStats(coachId),
    prisma.workout.findMany({
        where: {
          athlete: athleteWhere,
          date: { gte: lastWeekStart, lte: lastWeekEnd },
          isRescheduleGhost: false,
        },
        select: volumeWorkoutSelect,
      }),
    prisma.workout.findMany({
      where: {
        athlete: athleteWhere,
        date: today,
        isRescheduleGhost: false,
      },
      include: {
        ...WORKOUT_PLAN_INCLUDE,
        athlete: { select: { id: true, name: true, avatarUrl: true, status: true } },
      },
      orderBy: WORKOUT_LIST_ORDER_BY,
    }),
    prisma.workout.findMany({
      where: {
        athlete: athleteWhere,
        status: { in: [WorkoutStatus.COMPLETED, WorkoutStatus.SKIPPED] },
        isRescheduleGhost: false,
        result: { isNot: null },
      },
      include: {
        ...ACTIVITY_FEED_WORKOUT_INCLUDE,
        athlete: { select: { id: true, name: true, avatarUrl: true } },
        result: true,
      },
      orderBy: { result: { completedAt: 'desc' } },
      take: 200,
    }),
    prisma.race.findMany({
      where: {
        athlete: athleteWhere,
        intent: RaceIntent.PLANNED,
        resultsLogOnly: false,
      },
      include: {
        athlete: { select: { id: true, name: true, avatarUrl: true } },
        legs: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ date: 'desc' }],
      take: 200,
    }),
  ])

  const {
    needsReply,
    needsReplyByAthlete,
    chatThreadsByAthlete,
    feedbackThreadsByAthlete,
    needsReplyThreads,
  } = inboxStats

  const athleteIds = dashboard.athletes.map((a) => a.id)
  await ensureGeneralChatThreads(athleteIds)
  const generalThreads = await listCoachGeneralChatThreads(coachId)
  const generalChatByAthlete = new Map<string, CoachRosterChatThread>(
    generalThreads.map((thread) => [thread.athleteId, buildRosterChatThread(thread)]),
  )

  const lastWeekWorkoutsByAthlete = groupWorkoutsByAthlete(lastWeekWorkouts)
  const planningWarningIds = new Set(
    dashboard.planningWarnings.map((w) => w.athleteId),
  )

  const todayWorkoutsByAthlete = new Map<string, ReturnType<typeof toPlanWorkoutDetail>[]>()
  for (const workout of todayWorkoutRows) {
    const list = todayWorkoutsByAthlete.get(workout.athleteId) ?? []
    list.push(redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(workout), 'coach'))
    todayWorkoutsByAthlete.set(workout.athleteId, list)
  }

  const todayAthletes: CoachHomeTodayAthlete[] = dashboard.athletes
    .filter((athlete) => athlete.status === AthleteStatus.ACTIVE)
    .map((athlete) => ({
      athleteId: athlete.id,
      athleteName: athlete.name,
      avatarUrl: athlete.avatarUrl,
      status: athlete.status,
      workouts: todayWorkoutsByAthlete.get(athlete.id) ?? [],
    }))

  const latestFeedback: CoachRosterFeedbackItem[] = []
  for (const list of feedbackThreadsByAthlete.values()) {
    latestFeedback.push(...list)
  }
  latestFeedback.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )

  const activityFeed: CoachHomeActivityFeedItem[] = recentCompletedRows.map((workout) => {
    const kind = workout.status === WorkoutStatus.SKIPPED ? 'skipped' : 'completed'
    const workoutForDetail = {
      ...workout,
      coachingThread: workout.coachingThread
        ? mapActivityFeedCoachingThread(workout.coachingThread)
        : null,
    }
    return {
      athleteId: workout.athlete.id,
      athleteName: workout.athlete.name,
      avatarUrl: workout.athlete.avatarUrl,
      activityAt: workout.result!.completedAt.toISOString(),
      kind,
      source: kind === 'completed' ? getWorkoutCompletionSource(workout) : null,
      workout: redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(workoutForDetail), 'coach'),
      feedbackThread: buildActivityFeedFeedbackThread(workout),
    }
  })

  const rosterRows: CoachRosterRow[] = buildCoachRosterRows({
    athletes: dashboard.athletes.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      avatarUrl: a.avatarUrl,
      userId: a.userId,
      races: a.races,
      workouts: a.workouts,
    })),
    lastWeekWorkoutsByAthlete,
    planningWarningIds,
    lastPlannedKeyByAthlete: dashboard.lastPlannedKeyByAthlete,
    needsReplyByAthlete,
    chatThreadsByAthlete,
    feedbackThreadsByAthlete,
    generalChatByAthlete,
    formatNextRace: (race) => {
      const d = daysUntil(race.date)
      return { label: `${race.name} · ${d}d`, days: d }
    },
  })

  const avatarByAthlete = new Map(
    dashboard.athletes.map((a) => [a.id, a.avatarUrl]),
  )

  const attentionItemsRaw = buildCoachHomeAttentionItems({
    joinRequests: [],
    needsReplyThreads,
    planningWarnings: dashboard.planningWarnings,
    rosterRows,
  })

  const coachingRequests = pendingCoach.requests.map((link) => ({
    id: link.id,
    createdAt: link.createdAt.toISOString(),
    athlete: {
      id: link.athlete.id,
      name: link.athlete.name,
      avatarUrl: link.athlete.avatarUrl ?? null,
    },
  }))

  const attentionDismissals = await prisma.coachAttentionDismissal.findMany({
    where: { coachUserId: coachId },
    select: { itemKey: true, contextAt: true, dismissedAt: true },
  })

  const attentionItems = filterDismissedCoachHomeAttentionItems(
    attentionItemsRaw,
    attentionDismissals.map((row) => ({
      itemKey: row.itemKey,
      contextAt: row.contextAt,
      dismissedAt: row.dismissedAt,
    })),
  )

  const planningCoverageRows = buildCoachHomePlanningCoverageRows({
    rosterRows,
    planningLeadDays: dashboard.planningLeadDays,
  }).map((row) => ({
    ...row,
    avatarUrl: avatarByAthlete.get(row.athleteId) ?? null,
  }))

  const needsPlanCount = planningCoverageRows.filter((row) => row.daysUnplanned > 0).length

  const activityTableRows = mergeCoachHomeActivityFeed(
    buildCoachHomeActivityTableRows(activityFeed),
    buildCoachHomeRaceActivityRows(
      recentRaceRows.map(
        (race): CoachHomeRaceFeedSource => ({
          id: race.id,
          name: race.name,
          date: race.date,
          location: race.location,
          type: race.type,
          sport: race.sport,
          priority: race.priority,
          outcome: race.outcome,
          resultTime: race.resultTime,
          resultPlace: race.resultPlace,
          resultNotes: race.resultNotes,
          resultLoggedAt: race.resultLoggedAt,
          stravaActivityUrl: race.stravaActivityUrl,
          stravaActivityName: race.stravaActivityName,
          legs: mapCoachHomeRaceLegs(race.legs),
          athlete: race.athlete,
        }),
      ),
    ),
  )
  const athleteOptions = athleteOptionsFromRoster(rosterRows)

  return {
    ...dashboard,
    pendingCoach,
    needsReply,
    needsReplyThreads,
    todayAthletes,
    activityFeed,
    latestFeedback: latestFeedback.slice(0, 8),
    rosterRows,
    attentionItems,
    coachingRequests,
    planningCoverageRows,
    needsPlanCount,
    activityTableRows,
    athleteOptions,
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
  const currentYear = today.getUTCFullYear()
  const rangeStart = new Date(Date.UTC(currentYear - 2, 0, 1))

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
    plannedDistanceMeters: w.plannedDistanceMeters,
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
