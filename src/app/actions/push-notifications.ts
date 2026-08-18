'use server'

import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isPushConfigured } from '@/lib/push-notifications'

type SubscriptionPayload = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function registerWebPushSubscription(payload: SubscriptionPayload) {
  const session = await requireSession()
  if (!(await isPushConfigured())) {
    throw new Error('Push notifications are not configured on the server')
  }
  if (!payload.endpoint || !payload.p256dh || !payload.auth) {
    throw new Error('Invalid push subscription payload')
  }
  await prisma.webPushSubscription.upsert({
    where: { endpoint: payload.endpoint },
    update: {
      userId: session.userId,
      p256dh: payload.p256dh,
      auth: payload.auth,
    },
    create: {
      userId: session.userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
    },
  })
}

export async function unregisterWebPushSubscription(endpoint: string) {
  const session = await requireSession()
  if (!endpoint) return
  await prisma.webPushSubscription.deleteMany({
    where: { endpoint, userId: session.userId },
  })
}
