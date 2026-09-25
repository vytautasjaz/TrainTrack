'use server'

import {
  revalidateCoachSurfaces,
  revalidateInboxSurfaces,
} from '@/lib/cache-tags'
import { prisma } from '@/lib/prisma'
import { getAppSettings } from '@/lib/app-settings'
import {
  COACH_HOME_ACTIVITY_INITIAL,
  COACH_HOME_ACTIVITY_PAGE,
  getCoachHomeActivityFeedPage,
  type CoachHomeActivityFeedCursor,
} from '@/lib/queries'
import type { CoachHomeTimeRange } from '@/lib/coach-home'
import { isCoach, requireSession, athleteOwnedByCoachWhere } from '@/lib/session'
import { markCoachingThreadRead } from '@/app/actions/coaching-inbox'
import {
  INBOX_LIST_MAX,
  isThreadUnreadForRole,
} from '@/lib/coaching-inbox-shared'

export async function loadMoreCoachHomeActivity(
  cursor: CoachHomeActivityFeedCursor,
  timeRange: CoachHomeTimeRange = 'last_7d',
) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  if (!cursor?.activityAt || !cursor?.id) throw new Error('Cursor required')

  const settings = await getAppSettings()
  if (!settings.coachActivityFeedEnabled) {
    return { rows: [], nextCursor: null, hasMore: false }
  }

  return getCoachHomeActivityFeedPage(session.userId, {
    cursor,
    limit: COACH_HOME_ACTIVITY_PAGE,
    timeRange,
  })
}

/** Reset / change time range — first page for the selected window. */
export async function loadCoachHomeActivityFeed(
  timeRange: CoachHomeTimeRange,
) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const settings = await getAppSettings()
  if (!settings.coachActivityFeedEnabled) {
    return { rows: [], nextCursor: null, hasMore: false }
  }

  return getCoachHomeActivityFeedPage(session.userId, {
    limit: COACH_HOME_ACTIVITY_INITIAL,
    timeRange,
  })
}

async function verifyCoachOwnsAttentionItem(coachUserId: string, itemKey: string) {
  if (itemKey.startsWith('join-')) {
    const linkId = itemKey.slice('join-'.length)
    const link = await prisma.coachAthleteLink.findFirst({
      where: {
        id: linkId,
        status: 'PENDING',
        coachProfile: { userId: coachUserId },
      },
      select: { id: true },
    })
    if (!link) throw new Error('Join request not found')
    return
  }

  if (itemKey.startsWith('reply-')) {
    const threadId = itemKey.slice('reply-'.length)
    const thread = await prisma.coachingThread.findFirst({
      where: {
        id: threadId,
        athlete: athleteOwnedByCoachWhere(coachUserId),
      },
      select: { id: true },
    })
    if (!thread) throw new Error('Conversation not found')
    return
  }

  if (itemKey.startsWith('missed-')) {
    const workoutId = itemKey.slice('missed-'.length)
    const workout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        athlete: athleteOwnedByCoachWhere(coachUserId),
      },
      select: { id: true },
    })
    if (!workout) throw new Error('Workout not found')
    return
  }

  if (itemKey.startsWith('plan-')) {
    const athleteId = itemKey.slice('plan-'.length)
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, ...athleteOwnedByCoachWhere(coachUserId) },
      select: { id: true },
    })
    if (!athlete) throw new Error('Athlete not found')
    return
  }

  if (itemKey.startsWith('compliance-')) {
    const athleteId = itemKey.slice('compliance-'.length)
    if (!athleteId) throw new Error('Athlete not found')
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, ...athleteOwnedByCoachWhere(coachUserId) },
      select: { id: true },
    })
    if (!athlete) throw new Error('Athlete not found')
    return
  }

  throw new Error('Unknown attention item')
}

export async function dismissCoachHomeAttentionItem(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const itemKey = formData.get('itemKey') as string
  const contextAt = ((formData.get('contextAt') as string) ?? '').trim()
  if (!itemKey) throw new Error('Item required')

  const result = await dismissAttentionItemsForCoach(session.userId, [
    { itemKey, contextAt },
  ])
  revalidateCoachSurfaces(session.userId)
  if (result.markedReplyThreadIds.length > 0) {
    revalidateInboxSurfaces(session.userId)
  }
  return result
}

export async function dismissCoachHomeAttentionItems(
  items: Array<{ itemKey: string; contextAt: string }>,
) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  if (!items.length) {
    return { markedReplyThreadIds: [] as string[], inboxUnreadCount: null as number | null }
  }

  const result = await dismissAttentionItemsForCoach(session.userId, items)
  revalidateCoachSurfaces(session.userId)
  if (result.markedReplyThreadIds.length > 0) {
    revalidateInboxSurfaces(session.userId)
  }
  return result
}

/** Fresh unread count (avoids React cache() stale value after mark-read in same request). */
async function countCoachInboxUnreadUncached(coachUserId: string): Promise<number> {
  const threads = await prisma.coachingThread.findMany({
    where: {
      athlete: athleteOwnedByCoachWhere(coachUserId),
    },
    select: {
      lastMessageAt: true,
      coachLastReadAt: true,
      athleteLastReadAt: true,
      messages: {
        select: { authorRole: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: INBOX_LIST_MAX,
  })
  return threads
    .map((t) => ({
      ...t,
      messages: [...t.messages].reverse(),
    }))
    .filter((t) => isThreadUnreadForRole(t, 'coach')).length
}

async function dismissAttentionItemsForCoach(
  coachUserId: string,
  items: Array<{ itemKey: string; contextAt: string }>,
): Promise<{
  markedReplyThreadIds: string[]
  inboxUnreadCount: number | null
}> {
  const unique = new Map<string, string>()
  for (const item of items) {
    if (!item.itemKey) continue
    unique.set(item.itemKey, (item.contextAt ?? '').trim())
  }

  for (const itemKey of unique.keys()) {
    await verifyCoachOwnsAttentionItem(coachUserId, itemKey)
  }

  const now = new Date()
  await Promise.all(
    [...unique.entries()].map(([itemKey, contextAt]) =>
      prisma.coachAttentionDismissal.upsert({
        where: {
          coachUserId_itemKey: {
            coachUserId,
            itemKey,
          },
        },
        create: {
          coachUserId,
          itemKey,
          contextAt,
        },
        update: {
          contextAt,
          dismissedAt: now,
        },
      }),
    ),
  )

  const replyThreadIds = [...unique.keys()]
    .filter((key) => key.startsWith('reply-'))
    .map((key) => key.slice('reply-'.length))

  for (const threadId of replyThreadIds) {
    const markForm = new FormData()
    markForm.set('threadId', threadId)
    await markCoachingThreadRead(markForm)
  }

  if (replyThreadIds.length === 0) {
    return { markedReplyThreadIds: [], inboxUnreadCount: null }
  }

  const inboxUnreadCount = await countCoachInboxUnreadUncached(coachUserId)
  return { markedReplyThreadIds: replyThreadIds, inboxUnreadCount }
}
