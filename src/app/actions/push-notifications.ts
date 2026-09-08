'use server'

import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isPushConfigured } from '@/lib/push-notifications'
import {
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/notification-prefs'

type SubscriptionPayload = {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
}

export async function registerWebPushSubscription(payload: SubscriptionPayload) {
  const session = await requireSession()
  if (!(await isPushConfigured())) {
    throw new Error('Push notifications are not configured on the server')
  }
  if (!payload.endpoint || !payload.p256dh || !payload.auth) {
    throw new Error('Invalid push subscription payload')
  }
  const now = new Date()
  await prisma.webPushSubscription.upsert({
    where: { endpoint: payload.endpoint },
    update: {
      userId: session.userId,
      p256dh: payload.p256dh,
      auth: payload.auth,
      userAgent: payload.userAgent ?? null,
      lastUsedAt: now,
      revokedAt: null,
    },
    create: {
      userId: session.userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
      userAgent: payload.userAgent ?? null,
      lastUsedAt: now,
    },
  })
}

export async function unregisterWebPushSubscription(endpoint: string) {
  const session = await requireSession()
  if (!endpoint) return
  await prisma.webPushSubscription.updateMany({
    where: { endpoint, userId: session.userId },
    data: { revokedAt: new Date() },
  })
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const session = await requireSession()
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { notificationPrefs: true },
  })
  return normalizeNotificationPrefs(user?.notificationPrefs)
}

export async function updateNotificationPrefs(input: NotificationPrefs) {
  const session = await requireSession()
  const next = normalizeNotificationPrefs(input)
  await prisma.user.update({
    where: { id: session.userId },
    data: { notificationPrefs: next },
  })
  return next
}
