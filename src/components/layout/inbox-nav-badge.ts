/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'

const INBOX_UNREAD_EVENT = 'tt-inbox-unread'

export function emitInboxUnreadCount(count: number) {
  window.dispatchEvent(new CustomEvent(INBOX_UNREAD_EVENT, { detail: { count } }))
}

async function applyAppBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (count > 0) {
    if (typeof nav.setAppBadge === 'function') await nav.setAppBadge(count)
    return
  }
  if (typeof nav.clearAppBadge === 'function') await nav.clearAppBadge()
}

/** Refresh nav + home-screen badges from the live unread API. */
export async function refreshInboxUnreadBadge() {
  try {
    const res = await fetch('/api/inbox/unread-count', { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { count?: number }
    if (typeof data.count !== 'number') return
    emitInboxUnreadCount(data.count)
    await applyAppBadge(data.count)
  } catch {
    // ignore badge sync failures
  }
}

export function useInboxNavBadge(initialCount: number) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    function onUnread(event: Event) {
      const next = (event as CustomEvent<{ count?: number }>).detail?.count
      if (typeof next === 'number') setCount(next)
    }
    window.addEventListener(INBOX_UNREAD_EVENT, onUnread)
    return () => window.removeEventListener(INBOX_UNREAD_EVENT, onUnread)
  }, [])

  return count
}
