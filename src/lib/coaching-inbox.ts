import {
  CoachingAuthorRole,
  CoachingMessageKind,
  CoachingThreadKind,
  CoachingThreadStatus,
  type CoachingMessage,
  type CoachingThread,
  type Race,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toDateKey } from '@/lib/dates'
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
      logType: true,
    },
  },
} as const

export type CoachingThreadWithMessages = CoachingThread & {
  messages: CoachingMessage[]
  workout: Parameters<typeof toPlanWorkoutDetail>[0] | null
  race: Pick<Race, 'id' | 'name' | 'date' | 'type' | 'outcome' | 'resultNotes'> | null
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
      outcome: true,
      resultNotes: true,
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
  })
  return threads.filter((t) => isThreadUnreadForRole(t, 'athlete')).length
}

export async function getCoachInboxUnreadCount(coachUserId: string): Promise<number> {
  const threads = await prisma.coachingThread.findMany({
    where: {
      athlete: athleteOwnedByCoachWhere(coachUserId),
    },
    include: {
      messages: { select: { authorRole: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  return threads.filter((t) => isThreadUnreadForRole(t, 'coach')).length
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
    ? redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(thread.workout), role)
    : null

  return {
    id: thread.id,
    kind: thread.kind,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    unread: isThreadUnreadForRole(thread, role),
    needsReply: threadNeedsReplyFrom(thread, role),
    preview: last?.body?.slice(0, 140) ?? '',
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
          outcome: thread.race.outcome,
          resultNotes: thread.race.resultNotes,
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
