import {
  CoachingAuthorRole,
  CoachingMessageKind,
  CoachingThreadKind,
  CoachingThreadStatus,
  type CoachingMessage,
  type CoachingThread,
  type Race,
  type RaceOutcome,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toDateKey } from '@/lib/dates'
import { formatRaceFeedbackReportBody } from '@/lib/race-feedback-report'
import { athleteOwnedByCoachWhere } from '@/lib/session'
import {
  redactPlanWorkoutNotesForViewer,
  toPlanWorkoutDetail,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { parseWorkoutFeeling } from '@/lib/workout-feeling'
import {
  COACHING_MESSAGE_MAX_LEN,
  INBOX_LIST_MAX,
  isThreadUnreadForRole,
  threadHasChatConversation,
  threadNeedsReplyFrom,
  type InboxFilter,
  type InboxKindFilter,
} from '@/lib/coaching-inbox-shared'

export {
  COACHING_MESSAGE_MAX_LEN,
  COACHING_THREAD_MESSAGE_CAP,
  INBOX_LIST_MAX,
  athleteCanAskCoachAboutWorkout,
  athleteCanFollowUpWithCoachAboutWorkout,
  isThreadUnreadForRole,
  threadNeedsReplyFrom,
  trimCoachingMessageBody,
  type InboxFilter,
  type InboxKindFilter,
} from '@/lib/coaching-inbox-shared'

const workoutDetailSelect = {
  id: true,
  title: true,
  date: true,
  type: true,
  sessionType: true,
  status: true,
  description: true,
  plannedDistance: true,
  plannedDuration: true,
  plannedDistanceSource: true,
  plannedDurationSource: true,
  plannedDistanceMetersSource: true,
  plannedDistanceMeters: true,
  coachNotes: true,
  coachNotesPrivate: true,
  structure: true,
  swimEnvironment: true,
  swimStructure: true,
  tags: true,
  selfLogged: true,
  rescheduledFromDate: true,
  isRescheduleGhost: true,
  rescheduledCopy: { select: { id: true, date: true } },
  result: {
    select: {
      actualDistance: true,
      actualDuration: true,
      rpe: true,
      feeling: true,
      athleteNotes: true,
      athleteNotesPrivate: true,
      coachReply: true,
      coachReplyReadAt: true,
      stravaActivityUrl: true,
      stravaActivityName: true,
      stravaActivityDescription: true,
      averageHeartrate: true,
      maxHeartrate: true,
      averageSpeedMps: true,
      maxSpeedMps: true,
      elevationGainM: true,
      sufferScore: true,
      averageCadence: true,
      kilojoules: true,
      calories: true,
      averageWatts: true,
      logType: true,
    },
  },
} as const

export type CoachingThreadWithMessages = CoachingThread & {
  messages: CoachingMessage[]
  workout: Parameters<typeof toPlanWorkoutDetail>[0] | null
  race: Pick<
    Race,
    | 'id'
    | 'name'
    | 'date'
    | 'type'
    | 'priority'
    | 'outcome'
    | 'resultTime'
    | 'resultPlace'
    | 'resultNotes'
  > & {
    legs: Array<{
      id: string
      kind: import('@prisma/client').RaceLegKind
      sortOrder: number
      resultTime: string | null
      plannedTime: string | null
      stravaActivityUrl: string | null
    }>
  } | null
  athlete?: { id: string; name: string; avatarUrl: string | null }
}

const threadInclude = {
  messages: { orderBy: { createdAt: 'asc' as const } },
  workout: { select: workoutDetailSelect },
  race: {
    select: {
      id: true,
      name: true,
      date: true,
      type: true,
      priority: true,
      outcome: true,
      resultTime: true,
      resultPlace: true,
      resultNotes: true,
      legs: {
        select: {
          id: true,
          kind: true,
          sortOrder: true,
          resultTime: true,
          plannedTime: true,
          stravaActivityUrl: true,
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} as const

export async function getWorkoutCoachingThread(workoutId: string) {
  return prisma.coachingThread.findUnique({
    where: { workoutId },
    include: threadInclude,
  })
}

export async function getRaceCoachingThread(raceId: string) {
  return prisma.coachingThread.findUnique({
    where: { raceId },
    include: threadInclude,
  })
}

export async function getCoachingThreadById(threadId: string) {
  return prisma.coachingThread.findUnique({
    where: { id: threadId },
    include: {
      ...threadInclude,
      athlete: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

type ListOpts = {
  filter?: InboxFilter
  kind?: InboxKindFilter
  take?: number
}

function applyListFilters<
  T extends {
    kind: CoachingThreadKind
    messages: Pick<CoachingMessage, 'authorRole' | 'createdAt'>[]
    coachLastReadAt: Date | null
    athleteLastReadAt: Date | null
    lastMessageAt: Date
  },
>(threads: T[], role: 'athlete' | 'coach', opts: ListOpts): T[] {
  let list = threads
  if (opts.kind && opts.kind !== 'all') {
    list = list.filter((t) => t.kind === opts.kind)
  }
  const filter = opts.filter ?? 'all'
  if (filter === 'unread') {
    list = list.filter((t) => isThreadUnreadForRole(t, role))
  }
  // Empty general chats stay available for Chat-tab / athlete deep-link;
  // the Inbox UI hides them from All unless they have messages.
  return list
}

export async function listAthleteInboxThreads(athleteId: string, opts: ListOpts = {}) {
  await ensureLegacyWorkoutFeedbackMigrated(athleteId)
  const threads = await prisma.coachingThread.findMany({
    where: { athleteId },
    include: {
      ...threadInclude,
      athlete: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: INBOX_LIST_MAX,
  })
  return applyListFilters(threads, 'athlete', opts).slice(0, opts.take ?? INBOX_LIST_MAX)
}

export async function listCoachInboxThreads(coachUserId: string, opts: ListOpts = {}) {
  const athleteWhere = athleteOwnedByCoachWhere(coachUserId)
  const athletes = await prisma.athlete.findMany({
    where: athleteWhere,
    select: { id: true },
  })
  for (const a of athletes) {
    await ensureLegacyWorkoutFeedbackMigrated(a.id)
  }
  await ensureGeneralChatThreads(athletes.map((a) => a.id))

  const threads = await prisma.coachingThread.findMany({
    where: { athlete: athleteWhere },
    include: {
      ...threadInclude,
      athlete: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: INBOX_LIST_MAX,
  })
  return applyListFilters(threads, 'coach', opts).slice(0, opts.take ?? INBOX_LIST_MAX)
}

export async function getAthleteInboxUnreadCount(athleteId: string): Promise<number> {
  await ensureLegacyWorkoutFeedbackMigrated(athleteId)
  const threads = await prisma.coachingThread.findMany({
    where: { athleteId },
    include: {
      messages: { select: { authorRole: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: INBOX_LIST_MAX,
  })
  return applyListFilters(threads, 'athlete', { filter: 'all' }).filter((t) =>
    isThreadUnreadForRole(t, 'athlete'),
  ).length
}

export async function getCoachInboxUnreadCount(coachUserId: string): Promise<number> {
  const threads = await prisma.coachingThread.findMany({
    where: {
      athlete: athleteOwnedByCoachWhere(coachUserId),
    },
    include: {
      messages: { select: { authorRole: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: INBOX_LIST_MAX,
  })
  return applyListFilters(threads, 'coach', { filter: 'all' }).filter((t) =>
    isThreadUnreadForRole(t, 'coach'),
  ).length
}

/** Migrate legacy WorkoutResult notes/replies into FEEDBACK threads (idempotent). */
export async function ensureLegacyWorkoutFeedbackMigrated(athleteId: string) {
  const results = await prisma.workoutResult.findMany({
    where: {
      workout: { athleteId, coachingThread: null },
      OR: [{ athleteNotes: { not: null } }, { coachReply: { not: null } }],
    },
    include: {
      workout: { select: { id: true, athleteId: true } },
    },
    take: 50,
  })

  for (const result of results) {
    const notes = result.athleteNotes?.trim()
    const reply = result.coachReply?.trim()
    if (!notes && !reply) continue

    const existing = await prisma.coachingThread.findUnique({
      where: { workoutId: result.workoutId },
      select: { id: true },
    })
    if (existing) continue

    const messages: { authorRole: CoachingAuthorRole; body: string; createdAt: Date }[] = []
    if (notes) {
      messages.push({
        authorRole: CoachingAuthorRole.ATHLETE,
        body: notes.slice(0, COACHING_MESSAGE_MAX_LEN),
        createdAt: result.completedAt ?? result.createdAt,
      })
    }
    if (reply) {
      messages.push({
        authorRole: CoachingAuthorRole.COACH,
        body: reply.slice(0, COACHING_MESSAGE_MAX_LEN),
        createdAt: result.coachRepliedAt ?? result.updatedAt,
      })
    }
    if (messages.length === 0) continue

    const lastMessageAt = messages[messages.length - 1]!.createdAt
    await prisma.coachingThread.create({
      data: {
        athleteId: result.workout.athleteId,
        kind: CoachingThreadKind.FEEDBACK,
        workoutId: result.workoutId,
        status: CoachingThreadStatus.OPEN,
        lastMessageAt,
        athleteLastReadAt: notes ? lastMessageAt : null,
        coachLastReadAt: reply ? lastMessageAt : result.feedbackDismissedAt,
        messages: {
          create: messages.map((m) => ({
            authorRole: m.authorRole,
            kind:
              m.authorRole === CoachingAuthorRole.ATHLETE
                ? CoachingMessageKind.FEEDBACK
                : CoachingMessageKind.CHAT,
            body: m.body,
            createdAt: m.createdAt,
          })),
        },
      },
    })
  }
}

/** Mirror latest public FEEDBACK / coach reply onto WorkoutResult for card snippets. */
export async function mirrorWorkoutResultFromThread(workoutId: string) {
  const thread = await prisma.coachingThread.findUnique({
    where: { workoutId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!thread || thread.kind !== CoachingThreadKind.FEEDBACK) return

  const firstAthlete = thread.messages.find((m) => m.authorRole === CoachingAuthorRole.ATHLETE)
  const lastCoach = [...thread.messages]
    .reverse()
    .find((m) => m.authorRole === CoachingAuthorRole.COACH)

  const existing = await prisma.workoutResult.findUnique({ where: { workoutId } })
  if (!existing) {
    await prisma.workoutResult.create({
      data: {
        workoutId,
        athleteNotes: firstAthlete?.body ?? null,
        athleteNotesPrivate: false,
        coachReply: lastCoach?.body ?? null,
        coachRepliedAt: lastCoach?.createdAt ?? null,
        coachReplyReadAt: lastCoach ? null : undefined,
      },
    })
    return
  }

  await prisma.workoutResult.update({
    where: { workoutId },
    data: {
      ...(firstAthlete?.body?.trim()
        ? { athleteNotes: firstAthlete.body, athleteNotesPrivate: false }
        : {}),
      ...(lastCoach
        ? {
            coachReply: lastCoach.body,
            coachRepliedAt: lastCoach.createdAt,
            coachReplyReadAt: null,
            feedbackDismissedAt: new Date(),
          }
        : {}),
    },
  })
}

export function serializeInboxThread(
  thread: CoachingThreadWithMessages & {
    athlete?: { id: string; name: string; avatarUrl?: string | null }
  },
  role: 'athlete' | 'coach',
) {
  const last = thread.messages[thread.messages.length - 1]
  const workoutDetail: PlanWorkoutDetail | null = thread.workout
    ? {
        ...redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(thread.workout), role),
        coachingChat:
          threadHasChatConversation(thread.messages)
            ? {
                messageCount: thread.messages.length,
                lastMessageAt: thread.lastMessageAt.toISOString(),
                coachLastReadAt: thread.coachLastReadAt?.toISOString() ?? null,
                athleteLastReadAt: thread.athleteLastReadAt?.toISOString() ?? null,
                status: thread.status,
                lastAuthorRole:
                  thread.messages[thread.messages.length - 1]?.authorRole ?? null,
              }
            : null,
      }
    : null

  const raceReportPreview =
    thread.kind === CoachingThreadKind.RACE_REPORT && thread.race
      ? formatRaceFeedbackReportBody({
          outcome: thread.race.outcome as RaceOutcome | null,
          resultTime: thread.race.resultTime,
          resultPlace: thread.race.resultPlace,
          resultNotes: thread.race.resultNotes,
          type: thread.race.type,
          legs: thread.race.legs,
        })
      : ''

  return {
    id: thread.id,
    kind: thread.kind,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    unread: isThreadUnreadForRole(thread, role),
    needsReply: threadNeedsReplyFrom(thread, role),
    preview: (raceReportPreview || last?.body || '').slice(0, 140),
    lastAuthorRole: last?.authorRole ?? null,
    athlete: thread.athlete
      ? {
          id: thread.athlete.id,
          name: thread.athlete.name,
          avatarUrl: thread.athlete.avatarUrl ?? null,
        }
      : null,
    workout: workoutDetail
      ? {
          id: workoutDetail.id,
          title: workoutDetail.title,
          dateKey: workoutDetail.dateKey,
          type: workoutDetail.type,
          plannedDistance: workoutDetail.plannedDistance,
          plannedDuration: workoutDetail.plannedDuration,
          status: workoutDetail.status,
        }
      : null,
    workoutDetail,
    race: thread.race
      ? {
          id: thread.race.id,
          name: thread.race.name,
          dateKey: toDateKey(thread.race.date),
          type: thread.race.type,
          priority: thread.race.priority,
          outcome: thread.race.outcome,
          resultTime: thread.race.resultTime,
          resultPlace: thread.race.resultPlace,
          resultNotes: thread.race.resultNotes,
          legs: thread.race.legs,
        }
      : null,
    messageCount: thread.messages.length,
  }
}

export function toCoachingThreadView(thread: {
  id: string
  status: string
  kind: CoachingThreadKind
  messages: Array<{
    id: string
    authorRole: CoachingAuthorRole
    kind: CoachingMessageKind
    body: string
    createdAt: Date
  }>
  workout?: { result?: { feeling?: number | null } | null } | null
}) {
  const feeling = parseWorkoutFeeling(thread.workout?.result?.feeling)
  const firstAthleteId = thread.messages.find(
    (m) => m.authorRole === CoachingAuthorRole.ATHLETE,
  )?.id
  return {
    id: thread.id,
    status: thread.status,
    kind: thread.kind,
    messages: thread.messages.map((m) => {
      const isAthleteFeedback =
        m.authorRole === CoachingAuthorRole.ATHLETE &&
        (m.kind === CoachingMessageKind.FEEDBACK ||
          (thread.kind === CoachingThreadKind.FEEDBACK && m.id === firstAthleteId))
      return {
        id: m.id,
        authorRole: m.authorRole,
        kind: isAthleteFeedback ? CoachingMessageKind.FEEDBACK : m.kind,
        body: m.body,
        feeling: isAthleteFeedback ? feeling : null,
        createdAt: m.createdAt.toISOString(),
      }
    }),
  }
}

export type CoachRosterFeedbackListItem = {
  id: string
  preview: string
  lastMessageAt: string
  title: string
  body: string
  workoutTitle: string | null
  workoutDateKey: string | null
}

export function mapThreadToFeedbackListItem(
  thread: CoachingThreadWithMessages,
): CoachRosterFeedbackListItem | null {
  if (
    thread.kind !== CoachingThreadKind.FEEDBACK &&
    thread.kind !== CoachingThreadKind.RACE_REPORT
  ) {
    return null
  }
  if (thread.messages.length === 0) return null

  const row = serializeInboxThread(thread, 'coach')
  const contextTitle =
    row.workout?.title ?? row.race?.name ?? null
  const contextDateKey = row.workout?.dateKey ?? row.race?.dateKey ?? null
  const title =
    thread.kind === CoachingThreadKind.RACE_REPORT ? 'Race report' : 'Workout feedback'

  return {
    id: thread.id,
    preview: row.preview,
    lastMessageAt: row.lastMessageAt,
    title,
    body: row.preview,
    workoutTitle: contextTitle,
    workoutDateKey: contextDateKey,
  }
}

export async function listAthleteFeedbackThreads(
  athleteId: string,
  opts: { take?: number; cursor?: string } = {},
) {
  const take = opts.take ?? 15
  const threads = await prisma.coachingThread.findMany({
    where: {
      athleteId,
      kind: { in: [CoachingThreadKind.FEEDBACK, CoachingThreadKind.RACE_REPORT] },
      messages: { some: {} },
      ...(opts.cursor ? { lastMessageAt: { lt: new Date(opts.cursor) } } : {}),
    },
    include: threadInclude,
    orderBy: { lastMessageAt: 'desc' },
    take: take + 1,
  })

  const hasMore = threads.length > take
  const slice = hasMore ? threads.slice(0, take) : threads
  const items = slice
    .map(mapThreadToFeedbackListItem)
    .filter((item): item is CoachRosterFeedbackListItem => item != null)

  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.lastMessageAt ?? null) : null,
  }
}

export async function ensureGeneralChatThreads(athleteIds: string[]) {
  if (athleteIds.length === 0) return

  const existing = await prisma.coachingThread.findMany({
    where: { athleteId: { in: athleteIds }, kind: CoachingThreadKind.GENERAL },
    select: { athleteId: true },
  })
  const have = new Set(existing.map((row) => row.athleteId))
  const missing = athleteIds.filter((id) => !have.has(id))
  if (missing.length === 0) return

  await prisma.coachingThread.createMany({
    data: missing.map((athleteId) => ({
      athleteId,
      kind: CoachingThreadKind.GENERAL,
      status: CoachingThreadStatus.OPEN,
      coachLastReadAt: new Date(),
    })),
  })
}

export async function listCoachGeneralChatThreads(coachUserId: string) {
  return prisma.coachingThread.findMany({
    where: {
      kind: CoachingThreadKind.GENERAL,
      athlete: athleteOwnedByCoachWhere(coachUserId),
    },
    include: {
      ...threadInclude,
      athlete: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function getOrCreateAthleteGeneralChatThread(athleteId: string) {
  const existing = await prisma.coachingThread.findFirst({
    where: { athleteId, kind: CoachingThreadKind.GENERAL },
    include: threadInclude,
  })
  if (existing) return existing

  return prisma.coachingThread.create({
    data: {
      athleteId,
      kind: CoachingThreadKind.GENERAL,
      status: CoachingThreadStatus.OPEN,
      athleteLastReadAt: new Date(),
    },
    include: threadInclude,
  })
}
