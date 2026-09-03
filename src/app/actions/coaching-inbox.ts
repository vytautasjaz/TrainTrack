'use server'

import { revalidatePath } from 'next/cache'
import {
  CoachingAuthorRole,
  CoachingMessageKind,
  CoachingThreadKind,
  CoachingThreadStatus,
  WorkoutStatus,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  resolveAthleteId,
  isCoach,
  isCoachView,
  athleteHasConnectedCoach,
  coachCanAccessAthlete,
  athleteOwnedByCoachWhere,
  requireCoachOwnsAthlete,
} from '@/lib/session'
import { toDateKey, todayDateKey } from '@/lib/dates'
import {
  athleteCanAskCoachAboutWorkout,
  athleteCanFollowUpWithCoachAboutWorkout,
  COACHING_THREAD_MESSAGE_CAP,
  getAthleteInboxUnreadCount,
  getCoachInboxUnreadCount,
  getCoachingThreadById,
  mirrorWorkoutResultFromThread,
  toCoachingThreadView,
  trimCoachingMessageBody,
  getWorkoutCoachingThread,
  getRaceCoachingThread,
  getOrCreateAthleteGeneralChatThread,
} from '@/lib/coaching-inbox'
import { parseWorkoutFeeling } from '@/lib/workout-feeling'
import { sendInboxPushNotifications } from '@/lib/push-notifications'

function revalidateInboxPaths(opts?: { workoutId?: string; raceId?: string; athleteId?: string }) {
  revalidatePath('/inbox', 'layout')
  revalidatePath('/', 'layout')
  revalidatePath('/inbox')
  revalidatePath('/dashboard')
  revalidatePath('/athletes')
  revalidatePath('/training')
  revalidatePath('/season')
  if (opts?.workoutId) revalidatePath(`/workouts/${opts.workoutId}`)
  if (opts?.raceId) revalidatePath(`/races`)
  if (opts?.athleteId) revalidatePath(`/athletes/${opts.athleteId}`)
}

async function requireAthleteOwnedWorkout(workoutId: string) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true, coachingThread: { include: { messages: true } } },
  })
  if (!workout) throw new Error('Workout not found')
  return { session, athleteId, workout }
}

async function requireThreadAccess(threadId: string) {
  const session = await requireSession()
  const thread = await prisma.coachingThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      workout: true,
      race: true,
    },
  })
  if (!thread) throw new Error('Thread not found')

  // Use workspace (hasCoach + viewMode), not roles[] — roles can lag profiles and would
  // mark coach-view reads onto athleteLastReadAt, so unread returns after refresh.
  if (isCoachView(session)) {
    const ok = await coachCanAccessAthlete(session.userId, thread.athleteId)
    if (!ok) throw new Error('Thread not found')
    return { session, thread, role: 'coach' as const }
  }

  if (!session.hasAthlete) throw new Error('Not allowed')
  const athleteId = await resolveAthleteId(session)
  if (!athleteId || athleteId !== thread.athleteId) throw new Error('Thread not found')
  return { session, thread, role: 'athlete' as const }
}

async function appendMessage(opts: {
  threadId: string
  authorRole: CoachingAuthorRole
  body: string
  kind?: CoachingMessageKind
  workoutId?: string | null
  raceId?: string | null
  athleteId: string
}) {
  const count = await prisma.coachingMessage.count({ where: { threadId: opts.threadId } })
  if (count >= COACHING_THREAD_MESSAGE_CAP) {
    throw new Error(`This conversation is limited to ${COACHING_THREAD_MESSAGE_CAP} messages`)
  }

  const body = trimCoachingMessageBody(opts.body)
  if (!body && opts.kind !== CoachingMessageKind.FEEDBACK) {
    throw new Error('Message is required')
  }

  const message = await prisma.coachingMessage.create({
    data: {
      threadId: opts.threadId,
      authorRole: opts.authorRole,
      kind: opts.kind ?? CoachingMessageKind.CHAT,
      body,
    },
  })
  const at = message.createdAt

  await prisma.coachingThread.update({
    where: { id: opts.threadId },
    data: {
      lastMessageAt: at,
      status: CoachingThreadStatus.OPEN,
      ...(opts.authorRole === CoachingAuthorRole.ATHLETE
        ? { athleteLastReadAt: at, coachLastReadAt: null }
        : { coachLastReadAt: at, athleteLastReadAt: null }),
    },
  })

  if (opts.workoutId) {
    await mirrorWorkoutResultFromThread(opts.workoutId)
  }

  await sendInboxPushNotifications({
    threadId: opts.threadId,
    athleteId: opts.athleteId,
    authorRole: opts.authorRole,
    body,
    messageId: message.id,
  })

  revalidateInboxPaths({
    workoutId: opts.workoutId ?? undefined,
    raceId: opts.raceId ?? undefined,
    athleteId: opts.athleteId,
  })
}

export async function askCoachAboutWorkout(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  const raw = (formData.get('body') as string) ?? ''
  if (!workoutId) throw new Error('Workout required')

  const { athleteId, workout } = await requireAthleteOwnedWorkout(workoutId)
  if (!(await athleteHasConnectedCoach(athleteId))) {
    throw new Error('Connect to a coach to ask questions')
  }

  const dateKey = toDateKey(workout.date)
  const workoutShape = {
    dateKey,
    status: workout.status,
    isRace: false,
    isRescheduleGhost: workout.isRescheduleGhost,
    type: workout.type,
    result: workout.result,
  }
  const canAsk = athleteCanAskCoachAboutWorkout(workoutShape)
  const canFollowUp = athleteCanFollowUpWithCoachAboutWorkout(workoutShape)
  if (!canAsk && !canFollowUp) {
    throw new Error('You cannot message your coach about this workout')
  }

  let threadId = workout.coachingThread?.id
  if (!threadId) {
    const created = await prisma.coachingThread.create({
      data: {
        athleteId,
        kind: CoachingThreadKind.ASK,
        workoutId,
        status: CoachingThreadStatus.OPEN,
        athleteLastReadAt: new Date(),
      },
    })
    threadId = created.id
  } else if (workout.coachingThread && workout.coachingThread.kind !== CoachingThreadKind.ASK) {
    // Existing feedback thread on same workout — still allow follow-up asks as messages
  }

  await appendMessage({
    threadId,
    authorRole: CoachingAuthorRole.ATHLETE,
    body: raw,
    workoutId,
    athleteId,
  })
}

export async function coachMessageAboutWorkout(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  const raw = (formData.get('body') as string) ?? ''
  if (!workoutId) throw new Error('Workout required')

  const session = await requireSession()
  if (!isCoachView(session)) throw new Error('Coach only')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athlete: athleteOwnedByCoachWhere(session.userId) },
    include: { coachingThread: true },
  })
  if (!workout) throw new Error('Workout not found')

  let threadId = workout.coachingThread?.id
  if (!threadId) {
    const created = await prisma.coachingThread.create({
      data: {
        athleteId: workout.athleteId,
        kind: CoachingThreadKind.ASK,
        workoutId,
        status: CoachingThreadStatus.OPEN,
        coachLastReadAt: new Date(),
      },
    })
    threadId = created.id
  }

  await appendMessage({
    threadId,
    authorRole: CoachingAuthorRole.COACH,
    body: raw,
    workoutId,
    athleteId: workout.athleteId,
  })
}

export async function postWorkoutFeedbackMessage(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  const raw = (formData.get('athleteNotes') as string) ?? (formData.get('body') as string) ?? ''
  if (!workoutId) throw new Error('Workout required')

  const { athleteId, workout } = await requireAthleteOwnedWorkout(workoutId)
  if (workout.isRescheduleGhost) throw new Error('Cannot comment on a moved placeholder')
  if (toDateKey(workout.date) > todayDateKey()) {
    throw new Error('Can only comment on today or past workouts')
  }
  const stravaSynced = Boolean(workout.result?.stravaActivityUrl)
  if (
    workout.status !== WorkoutStatus.COMPLETED &&
    workout.status !== WorkoutStatus.SKIPPED &&
    !stravaSynced
  ) {
    throw new Error('Mark the workout completed or skipped before commenting')
  }

  const body = trimCoachingMessageBody(raw)
  const feeling = parseWorkoutFeeling(formData.get('feeling'))
  const hasFeedback = Boolean(body || feeling)

  const noteData = {
    athleteNotes: body || null,
    athleteNotesPrivate: false,
    feeling,
    feedbackDismissedAt: hasFeedback ? null : (workout.result?.feedbackDismissedAt ?? null),
  }

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: { workoutId, ...noteData },
    update: noteData,
  })

  if (await athleteHasConnectedCoach(athleteId)) {
    let thread = await prisma.coachingThread.findUnique({ where: { workoutId } })
    if (!thread && hasFeedback) {
      thread = await prisma.coachingThread.create({
        data: {
          athleteId,
          kind: CoachingThreadKind.FEEDBACK,
          workoutId,
          status: CoachingThreadStatus.OPEN,
          athleteLastReadAt: new Date(),
        },
      })
    }

    if (thread && hasFeedback) {
      const messages = await prisma.coachingMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
      })
      const firstAthlete = messages.find((m) => m.authorRole === CoachingAuthorRole.ATHLETE)
      if (firstAthlete && messages.length === 1) {
        await prisma.coachingMessage.update({
          where: { id: firstAthlete.id },
          data: { body, kind: CoachingMessageKind.FEEDBACK },
        })
        await prisma.coachingThread.update({
          where: { id: thread.id },
          data: {
            lastMessageAt: new Date(),
            athleteLastReadAt: new Date(),
            coachLastReadAt: null,
          },
        })
      } else if (!firstAthlete) {
        await appendMessage({
          threadId: thread.id,
          authorRole: CoachingAuthorRole.ATHLETE,
          kind: CoachingMessageKind.FEEDBACK,
          body,
          workoutId,
          athleteId,
        })
        return
      } else if (body) {
        // Follow-up note as a new message when thread already has replies
        await appendMessage({
          threadId: thread.id,
          authorRole: CoachingAuthorRole.ATHLETE,
          kind: CoachingMessageKind.FEEDBACK,
          body,
          workoutId,
          athleteId,
        })
        return
      }
    }
  }

  revalidateInboxPaths({ workoutId, athleteId })
}

export async function askOrCommentOnRace(formData: FormData) {
  const raceId = formData.get('raceId') as string
  const raw = (formData.get('body') as string) ?? ''
  if (!raceId) throw new Error('Race required')

  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')
  if (!(await athleteHasConnectedCoach(athleteId))) {
    throw new Error('Connect to a coach to ask questions')
  }

  const race = await prisma.race.findFirst({
    where: { id: raceId, athleteId },
    include: { coachingThread: true },
  })
  if (!race) throw new Error('Race not found')

  let threadId = race.coachingThread?.id
  if (!threadId) {
    const created = await prisma.coachingThread.create({
      data: {
        athleteId,
        kind: CoachingThreadKind.RACE_REPORT,
        raceId,
        status: CoachingThreadStatus.OPEN,
        athleteLastReadAt: new Date(),
      },
    })
    threadId = created.id
  }

  const { isRaceReportCardDuplicateMessage } = await import('@/lib/race-feedback-report')
  const body = trimCoachingMessageBody(raw)
  const existingMessages = await prisma.coachingMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  })
  const onlyAutoReport =
    existingMessages.length === 1 &&
    existingMessages[0]?.authorRole === CoachingAuthorRole.ATHLETE &&
    isRaceReportCardDuplicateMessage(existingMessages[0].body)

  if (onlyAutoReport && isRaceReportCardDuplicateMessage(body)) {
    // Refresh unread without stacking another placeholder bubble.
    const at = new Date()
    await prisma.coachingMessage.update({
      where: { id: existingMessages[0].id },
      data: { body },
    })
    await prisma.coachingThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: at,
        status: CoachingThreadStatus.OPEN,
        athleteLastReadAt: at,
        coachLastReadAt: null,
      },
    })
    await sendInboxPushNotifications({
      threadId,
      athleteId,
      authorRole: CoachingAuthorRole.ATHLETE,
      body,
    })
    revalidateInboxPaths({ raceId, athleteId })
    return
  }

  await appendMessage({
    threadId,
    authorRole: CoachingAuthorRole.ATHLETE,
    body: raw,
    raceId,
    athleteId,
  })
}

export async function replyToCoachingThread(formData: FormData) {
  const threadId = formData.get('threadId') as string
  const raw = (formData.get('body') as string) ?? ''
  if (!threadId) throw new Error('Thread required')

  const { thread, role } = await requireThreadAccess(threadId)
  const authorRole =
    role === 'coach' ? CoachingAuthorRole.COACH : CoachingAuthorRole.ATHLETE

  await appendMessage({
    threadId: thread.id,
    authorRole,
    body: raw,
    workoutId: thread.workoutId,
    raceId: thread.raceId,
    athleteId: thread.athleteId,
  })
}

export async function markCoachingThreadUnread(formData: FormData) {
  const threadId = formData.get('threadId') as string
  if (!threadId) throw new Error('Thread required')

  const { thread, role } = await requireThreadAccess(threadId)
  await prisma.coachingThread.update({
    where: { id: thread.id },
    data:
      role === 'coach'
        ? { coachLastReadAt: null }
        : { athleteLastReadAt: null },
  })

  revalidateInboxPaths({
    workoutId: thread.workoutId ?? undefined,
    raceId: thread.raceId ?? undefined,
    athleteId: thread.athleteId,
  })
}

export async function markCoachingThreadRead(formData: FormData): Promise<{ count: number }> {
  const threadId = formData.get('threadId') as string
  if (!threadId) throw new Error('Thread required')

  const { session, thread, role } = await requireThreadAccess(threadId)
  // Use lastMessageAt as the sole activity watermark (matches isThreadUnreadForRole).
  // Pad by 1s so TIMESTAMP(3) truncation / clock skew cannot leave the thread unread.
  const readAt = new Date(
    Math.max(Date.now(), new Date(thread.lastMessageAt).getTime()) + 1000,
  )
  await prisma.coachingThread.update({
    where: { id: thread.id },
    data:
      role === 'coach'
        ? { coachLastReadAt: readAt }
        : { athleteLastReadAt: readAt },
  })

  if (role === 'athlete' && thread.workoutId) {
    await prisma.workoutResult.updateMany({
      where: { workoutId: thread.workoutId, coachReply: { not: null }, coachReplyReadAt: null },
      data: { coachReplyReadAt: readAt },
    })
  }

  // Revalidate cache for the *next* navigation/refresh. Do not call router.refresh()
  // from the client mark-read effect — that remounted Radix poppers in a loop.
  revalidatePath('/inbox')
  revalidatePath('/', 'layout')

  if (role === 'coach') {
    const count = await getCoachInboxUnreadCount(session.userId)
    return { count }
  }

  const count = await getAthleteInboxUnreadCount(thread.athleteId)
  return { count }
}

export async function getInboxThreadDetail(threadId: string) {
  const { thread, role } = await requireThreadAccess(threadId)
  const full = await getCoachingThreadById(thread.id)
  return { thread: full, role }
}

/** Used by coach inbox page for athletes still visible under ownership check. */
export async function coachOwnsAthleteThread(coachUserId: string, athleteId: string) {
  return coachCanAccessAthlete(coachUserId, athleteId)
}

export async function checkAthleteHasConnectedCoach(): Promise<boolean> {
  const session = await requireSession()
  if (!session.hasAthlete) return false
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) return false
  return athleteHasConnectedCoach(athleteId)
}

export async function loadWorkoutCoachingThread(workoutId: string) {
  const session = await requireSession()

  if (session.hasCoach) {
    const coachWorkout = await prisma.workout.findFirst({
      where: { id: workoutId, athlete: athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (coachWorkout) {
      const thread = await getWorkoutCoachingThread(workoutId)
      return thread ? toCoachingThreadView(thread) : null
    }
  }

  if (session.hasAthlete) {
    const athleteId = await resolveAthleteId(session)
    if (!athleteId) throw new Error('No athlete profile')
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, athleteId },
      select: { id: true },
    })
    if (!workout) throw new Error('Workout not found')
    const thread = await getWorkoutCoachingThread(workoutId)
    return thread ? toCoachingThreadView(thread) : null
  }

  throw new Error('Not allowed')
}

export async function loadRaceCoachingThread(raceId: string) {
  const session = await requireSession()
  if (!session.hasAthlete && !isCoachView(session)) {
    throw new Error('Not allowed')
  }

  if (isCoachView(session)) {
    const race = await prisma.race.findFirst({
      where: { id: raceId, athlete: athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (!race) throw new Error('Race not found')
  } else {
    const athleteId = await resolveAthleteId(session)
    if (!athleteId) throw new Error('No athlete profile')
    const race = await prisma.race.findFirst({
      where: { id: raceId, athleteId },
      select: { id: true },
    })
    if (!race) throw new Error('Race not found')
  }

  const thread = await getRaceCoachingThread(raceId)
  return thread ? toCoachingThreadView(thread) : null
}

export async function listOwnedAthleteIdsForCoach(coachUserId: string) {
  const athletes = await prisma.athlete.findMany({
    where: athleteOwnedByCoachWhere(coachUserId),
    select: { id: true },
  })
  return athletes.map((a) => a.id)
}

export async function postCoachGeneralChatMessage(athleteId: string, body: string) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const thread = await getOrCreateAthleteGeneralChatThread(athleteId)
  await appendMessage({
    threadId: thread.id,
    authorRole: CoachingAuthorRole.COACH,
    body,
    athleteId,
  })
}
