'use client'

import { markInboxThreadReadClient } from '@/lib/inbox-mark-read-client'

const pendingMarkRead = new Set<string>()
let flushHookInstalled = false

export function queueCoachRosterSessionMarkRead(threadId: string) {
  if (!threadId || threadId.startsWith('optimistic-')) return
  pendingMarkRead.add(threadId)
}

export async function flushCoachRosterSessionMarkReads() {
  const ids = [...pendingMarkRead]
  pendingMarkRead.clear()
  if (ids.length === 0) return
  await Promise.all(ids.map((id) => markInboxThreadReadClient(id)))
}

/** Flush queued read marks when leaving the page (not on row collapse). */
export function installCoachRosterSessionReadFlush() {
  if (flushHookInstalled || typeof window === 'undefined') return
  flushHookInstalled = true
  window.addEventListener('pagehide', () => {
    void flushCoachRosterSessionMarkReads()
  })
}
