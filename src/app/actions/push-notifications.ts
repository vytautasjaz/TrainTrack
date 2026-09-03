'use server'

import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isPushConfigured, type NotificationPrefs } from '@/lib/push-notifications'

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
  const raw = user?.notificationPrefs
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      messages: true,
      workoutAsks: true,
      workoutFeedback: true,
      raceThreads: true,
    }
  }
  const prefs = raw as NotificationPrefs
  return {
    messages: prefs.messages !== false,
    workoutAsks: prefs.workoutAsks !== false,
    workoutFeedback: prefs.workoutFeedback !== false,
    raceThreads: prefs.raceThreads !== false,
  }
}

export async function updateNotificationPrefs(input: NotificationPrefs) {
  const session = await requireSession()
  const next: NotificationPrefs = {
    messages: input.messages !== false,
    workoutAsks: input.workoutAsks !== false,
    workoutFeedback: input.workoutFeedback !== false,
    raceThreads: input.raceThreads !== false,
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: { notificationPrefs: next },
  })
  return next
}
