import webpush from 'web-push'
import {
  CoachingAuthorRole,
  CoachingThreadKind,
  CoachAthleteLinkStatus,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAthleteInboxUnreadCount, getCoachInboxUnreadCount } from '@/lib/coaching-inbox'

let vapidConfigured = false

export type InboxPushType =
  | 'new_message'
  | 'workout_question'
  | 'workout_feedback'
  | 'race_thread'
  | 'coach_reply'
  | 'athlete_reply'

export type NotificationPrefs = {
  messages?: boolean
  workoutAsks?: boolean
  workoutFeedback?: boolean
  raceThreads?: boolean
  mentions?: boolean
}

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

/** Only allow same-origin relative inbox deep links in notification payloads. */
export function safeInboxThreadPath(threadId?: string | null): string {
  if (!threadId || !/^[a-zA-Z0-9_-]+$/.test(threadId)) return '/inbox'
  return `/inbox?thread=${encodeURIComponent(threadId)}`
}

function pushTypeForThread(
  kind: CoachingThreadKind,
  authorRole: CoachingAuthorRole,
): InboxPushType {
  if (kind === CoachingThreadKind.ASK) return 'workout_question'
  if (kind === CoachingThreadKind.FEEDBACK) return 'workout_feedback'
  if (kind === CoachingThreadKind.RACE_REPORT) return 'race_thread'
  return authorRole === CoachingAuthorRole.COACH ? 'coach_reply' : 'athlete_reply'
}

function prefsAllow(prefs: NotificationPrefs | null | undefined, type: InboxPushType): boolean {
  if (!prefs) return true
  switch (type) {
    case 'workout_question':
      return prefs.workoutAsks !== false
    case 'workout_feedback':
      return prefs.workoutFeedback !== false
    case 'race_thread':
      return prefs.raceThreads !== false
    case 'new_message':
    case 'coach_reply':
    case 'athlete_reply':
    default:
      return prefs.messages !== false
  }
}

function parsePrefs(raw: unknown): NotificationPrefs | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as NotificationPrefs
}

type SendInboxPushInput = {
  threadId: string
  athleteId: string
  authorRole: CoachingAuthorRole
  body: string
  messageId?: string
}

function buildCopy(opts: {
  type: InboxPushType
  senderName: string
  threadTitle: string | null
  preview: string
}): { title: string; body: string } {
  const { type, senderName, threadTitle, preview } = opts
  if (type === 'workout_question') {
    return {
      title: threadTitle ? `${senderName} · ${threadTitle}` : senderName,
      body: preview || 'New workout question',
    }
  }
  if (type === 'workout_feedback') {
    return {
      title: threadTitle ? `${senderName} · ${threadTitle}` : senderName,
      body: preview || 'New workout feedback',
    }
  }
  if (type === 'race_thread') {
    return {
      title: threadTitle ? `${senderName} · ${threadTitle}` : senderName,
      body: preview || 'New race update',
    }
  }
  return {
    title: senderName,
    body: threadTitle ? `${threadTitle} · ${preview}` : preview,
  }
}

export async function sendInboxPushNotifications(input: SendInboxPushInput) {
  if (!ensureVapidConfig()) return
  const preview = input.body.trim().slice(0, 120)
  if (!preview && !input.messageId) return

  const thread = await prisma.coachingThread.findUnique({
    where: { id: input.threadId },
    select: {
      kind: true,
      athlete: { select: { name: true, userId: true } },
      workout: { select: { title: true } },
      race: { select: { name: true } },
    },
  })
  if (!thread) return

  const type = pushTypeForThread(thread.kind, input.authorRole)
  const threadTitle = thread.workout?.title ?? thread.race?.name ?? null

  let recipientUserIds: string[] = []
  const unreadByUserId = new Map<string, number>()
  let senderName = 'TrainTrack'

  if (input.authorRole === CoachingAuthorRole.COACH) {
    senderName = 'Your coach'
    const coachLink = await prisma.coachAthleteLink.findFirst({
      where: {
        athleteId: input.athleteId,
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
      select: { coachProfile: { select: { user: { select: { name: true } } } } },
    })
    if (coachLink?.coachProfile.user.name) {
      senderName = coachLink.coachProfile.user.name
    }
    const athleteUserId = thread.athlete.userId
    if (athleteUserId) {
      recipientUserIds = [athleteUserId]
      unreadByUserId.set(athleteUserId, await getAthleteInboxUnreadCount(input.athleteId))
    }
  } else {
    senderName = thread.athlete.name || 'Athlete'
    const links = await prisma.coachAthleteLink.findMany({
      where: { athleteId: input.athleteId, status: CoachAthleteLinkStatus.ACCEPTED },
      select: { coachProfile: { select: { userId: true } } },
    })
    recipientUserIds = links.map((l) => l.coachProfile.userId)
    await Promise.all(
      recipientUserIds.map(async (userId) => {
        unreadByUserId.set(userId, await getCoachInboxUnreadCount(userId))
      }),
    )
  }

  if (recipientUserIds.length === 0) return

  const users = await prisma.user.findMany({
    where: { id: { in: recipientUserIds } },
    select: { id: true, notificationPrefs: true },
  })
  const allowedUserIds = users
    .filter((u) => prefsAllow(parsePrefs(u.notificationPrefs), type))
    .map((u) => u.id)
  if (allowedUserIds.length === 0) return

  const { title, body } = buildCopy({
    type,
    senderName,
    threadTitle,
    preview: preview || 'New inbox message',
  })

  const subs = await prisma.webPushSubscription.findMany({
    where: { userId: { in: allowedUserIds }, revokedAt: null },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  })
  if (subs.length === 0) return

  const path = safeInboxThreadPath(input.threadId)

  await Promise.all(
    subs.map(async (sub) => {
      const payload = JSON.stringify({
        type,
        messageId: input.messageId ?? null,
        threadId: input.threadId,
        senderName,
        threadTitle,
        preview: preview || null,
        title,
        body,
        url: path,
        tag: `inbox-thread-${input.threadId}`,
        unreadCount: unreadByUserId.get(sub.userId) ?? 1,
      })
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        )
        await prisma.webPushSubscription
          .update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {})
      } catch (error) {
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0
        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription
            .update({
              where: { id: sub.id },
              data: { revokedAt: new Date() },
            })
            .catch(() => {
              void prisma.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
            })
        }
      }
    }),
  )
}

/** Dev/test helper — send a synthetic inbox push to the given user. */
export async function sendTestPushNotification(userId: string, threadId?: string) {
  if (!ensureVapidConfig()) {
    throw new Error('Push is not configured (missing VAPID env vars)')
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId },
    select: { id: true },
  })
  const unread = athlete
    ? await getAthleteInboxUnreadCount(athlete.id)
    : await getCoachInboxUnreadCount(userId)

  const path = safeInboxThreadPath(threadId)
  const subs = await prisma.webPushSubscription.findMany({
    where: { userId, revokedAt: null },
  })
  if (subs.length === 0) throw new Error('No active push subscriptions for this user')

  await Promise.all(
    subs.map(async (sub) => {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          type: 'new_message',
          threadId: threadId ?? null,
          title: 'TrainTrack test',
          body: 'Push + badge sync looks good.',
          url: path,
          tag: 'inbox-test',
          unreadCount: Math.max(1, unread),
        }),
      )
      await prisma.webPushSubscription
        .update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {})
    }),
  )
  return { sent: subs.length, unreadCount: unread }
}

export async function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  )
}

export function pushInboxAbsoluteUrl(threadId?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}${safeInboxThreadPath(threadId)}`
}
