'use client'

import { markCoachingThreadRead, markCoachingThreadUnread } from '@/app/actions/coaching-inbox'
import { emitInboxUnreadCount, refreshInboxUnreadBadge } from '@/components/layout/inbox-nav-badge'

const inflight = new Map<string, Promise<number | null>>()
/** Threads already successfully marked read this session (avoids re-entry loops). */
const markedRead = new Set<string>()
/** Bumped on mark-unread so in-flight mark-read results are discarded / repaired. */
const readEpoch = new Map<string, number>()

function epochOf(threadId: string) {
  return readEpoch.get(threadId) ?? 0
}

/**
 * Persist thread-as-read and push the live nav badge count.
 * Dedupes concurrent calls and skips threads already marked this session.
 */
export async function markInboxThreadReadClient(threadId: string): Promise<number | null> {
  if (!threadId || threadId.startsWith('optimistic-')) return null
  if (markedRead.has(threadId)) return null

  const existing = inflight.get(threadId)
  if (existing) {
    try {
      return await existing
    } catch {
      return null
    }
  }

  const startedEpoch = epochOf(threadId)

  const promise = (async () => {
    if (epochOf(threadId) !== startedEpoch) return null

    const formData = new FormData()
    formData.set('threadId', threadId)
    const { count } = await markCoachingThreadRead(formData)

    // User marked unread while this request was in flight — undo the write.
    if (epochOf(threadId) !== startedEpoch) {
      const undo = new FormData()
      undo.set('threadId', threadId)
      try {
        await markCoachingThreadUnread(undo)
        await refreshInboxUnreadBadge()
      } catch {
        // ignore repair failures; UI still shows unread via holdUnreadId
      }
      return null
    }

    markedRead.add(threadId)
    emitInboxUnreadCount(count)
    return count
  })()

  inflight.set(threadId, promise)
  try {
    return await promise
  } catch {
    return null
  } finally {
    inflight.delete(threadId)
  }
}

/** Clear the session mark when the user explicitly marks a thread unread again. */
export function clearInboxThreadReadClient(threadId: string) {
  markedRead.delete(threadId)
  readEpoch.set(threadId, epochOf(threadId) + 1)
}
