'use server'

import { revalidatePath } from 'next/cache'
import {
  CoachingAuthorRole,
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
} from '@/lib/session'
import { toDateKey, todayDateKey } from '@/lib/dates'
import {
  athleteCanAskCoachAboutWorkout,
  COACHING_THREAD_MESSAGE_CAP,
  getCoachingThreadById,
  mirrorWorkoutResultFromThread,
  toCoachingThreadView,
  trimCoachingMessageBody,
  getWorkoutCoachingThread,
  getRaceCoachingThread,
} from '@/lib/coaching-inbox'

function revalidateInboxPaths(opts?: { workoutId?: string; raceId?: string; athleteId?: string }) {
  revalidatePath('/inbox')
  revalidatePath('/dashboard')
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

  if (isCoachView(session) && isCoach(session)) {
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
  workoutId?: string | null
  raceId?: string | null
  athleteId: string
}) {
  const count = await prisma.coachingMessage.count({ where: { threadId: opts.threadId } })
  if (count >= COACHING_THREAD_MESSAGE_CAP) {
    throw new Error(`This conversation is limited to ${COACHING_THREAD_MESSAGE_CAP} messages`)
  }

  const body = trimCoachingMessageBody(opts.body)
  if (!body) throw new Error('Message is required')

  const now = new Date()
  await prisma.coachingMessage.create({
    data: {
      threadId: opts.threadId,
      authorRole: opts.authorRole,
      body,
    },
  })

  await prisma.coachingThread.update({
    where: { id: opts.threadId },
    data: {
      lastMessageAt: now,
      status: CoachingThreadStatus.OPEN,
      ...(opts.authorRole === CoachingAuthorRole.ATHLETE
        ? { athleteLastReadAt: now }
        : { coachLastReadAt: now }),
    },
  })

  if (opts.workoutId) {
    await mirrorWorkoutResultFromThread(opts.workoutId)
  }

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
  if (
    !athleteCanAskCoachAboutWorkout({
      dateKey,
      status: workout.status,
      isRace: false,
      isRescheduleGhost: workout.isRescheduleGhost,
      type: workout.type,
    })
  ) {
    throw new Error('You can only ask about upcoming planned workouts')
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

export async function postWorkoutFeedbackMessage(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  const raw = (formData.get('athleteNotes') as string) ?? (formData.get('body') as string) ?? ''
  const notesPrivate = formData.get('athleteNotesPrivate') === 'true'
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

  // Always keep WorkoutResult notes (including private).
  const noteData = {
    athleteNotes: body || null,
    athleteNotesPrivate: body ? notesPrivate : false,
    feedbackDismissedAt:
      body && !notesPrivate ? null : (workout.result?.feedbackDismissedAt ?? null),
  }

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: { workoutId, ...noteData },
    update: noteData,
  })

  // Public notes (or clearing) sync into FEEDBACK thread when athlete has a coach.
  if (!notesPrivate && (await athleteHasConnectedCoach(athleteId))) {
    let thread = await prisma.coachingThread.findUnique({ where: { workoutId } })
    if (!thread && body) {
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

    if (thread && body) {
      const messages = await prisma.coachingMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
      })
      const firstAthlete = messages.find((m) => m.authorRole === CoachingAuthorRole.ATHLETE)
      if (firstAthlete && messages.length === 1) {
        await prisma.coachingMessage.update({
          where: { id: firstAthlete.id },
          data: { body },
        })
        await prisma.coachingThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: new Date(), athleteLastReadAt: new Date() },
        })
      } else if (!firstAthlete) {
        await appendMessage({
          threadId: thread.id,
          authorRole: CoachingAuthorRole.ATHLETE,
          body,
          workoutId,
          athleteId,
        })
        return
      } else {
        // Follow-up public note as a new message when thread already has replies
        await appendMessage({
          threadId: thread.id,
          authorRole: CoachingAuthorRole.ATHLETE,
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

export async function markCoachingThreadRead(formData: FormData) {
  const threadId = formData.get('threadId') as string
  if (!threadId) throw new Error('Thread required')

  const { thread, role } = await requireThreadAccess(threadId)
  const now = new Date()
  await prisma.coachingThread.update({
    where: { id: thread.id },
    data:
      role === 'coach'
        ? { coachLastReadAt: now }
        : { athleteLastReadAt: now },
  })

  if (role === 'athlete' && thread.workoutId) {
    await prisma.workoutResult.updateMany({
      where: { workoutId: thread.workoutId, coachReply: { not: null }, coachReplyReadAt: null },
      data: { coachReplyReadAt: now },
    })
  }

  revalidateInboxPaths({
    workoutId: thread.workoutId ?? undefined,
    raceId: thread.raceId ?? undefined,
    athleteId: thread.athleteId,
  })
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
  if (!session.hasAthlete && !(isCoach(session) && isCoachView(session))) {
    throw new Error('Not allowed')
  }

  if (isCoachView(session) && isCoach(session)) {
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, athlete: athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (!workout) throw new Error('Workout not found')
  } else {
    const athleteId = await resolveAthleteId(session)
    if (!athleteId) throw new Error('No athlete profile')
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, athleteId },
      select: { id: true },
    })
    if (!workout) throw new Error('Workout not found')
  }

  const thread = await getWorkoutCoachingThread(workoutId)
  return thread ? toCoachingThreadView(thread) : null
}

export async function loadRaceCoachingThread(raceId: string) {
  const session = await requireSession()
  if (!session.hasAthlete && !(isCoach(session) && isCoachView(session))) {
    throw new Error('Not allowed')
  }

  if (isCoachView(session) && isCoach(session)) {
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
