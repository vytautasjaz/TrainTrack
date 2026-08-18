import webpush from 'web-push'
import { CoachingAuthorRole, CoachAthleteLinkStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAthleteInboxUnreadCount, getCoachInboxUnreadCount } from '@/lib/coaching-inbox'

let vapidConfigured = false

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

function inboxUrl(threadId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'
  const normalized = base.replace(/\/$/, '')
  return threadId ? `${normalized}/inbox?thread=${encodeURIComponent(threadId)}` : `${normalized}/inbox`
}

type SendInboxPushInput = {
  threadId: string
  athleteId: string
  authorRole: CoachingAuthorRole
  body: string
}

export async function sendInboxPushNotifications(input: SendInboxPushInput) {
  if (!ensureVapidConfig()) return
  const preview = input.body.trim().slice(0, 120)
  if (!preview) return

  let recipientUserIds: string[] = []
  const unreadByUserId = new Map<string, number>()
  if (input.authorRole === CoachingAuthorRole.COACH) {
    const athlete = await prisma.athlete.findUnique({
      where: { id: input.athleteId },
      select: { userId: true },
    })
    if (athlete?.userId) {
      recipientUserIds = [athlete.userId]
      unreadByUserId.set(athlete.userId, await getAthleteInboxUnreadCount(input.athleteId))
    }
  } else {
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

  const subs = await prisma.webPushSubscription.findMany({
    where: { userId: { in: recipientUserIds } },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  })
  if (subs.length === 0) return

  await Promise.all(
    subs.map(async (sub) => {
      const payload = JSON.stringify({
        title: 'New inbox message',
        body: preview,
        url: `/inbox?thread=${encodeURIComponent(input.threadId)}`,
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
      } catch (error) {
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0
        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      }
    }),
  )
}

export async function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  )
}

export function pushInboxAbsoluteUrl(threadId?: string) {
  return inboxUrl(threadId)
}
