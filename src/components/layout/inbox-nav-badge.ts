/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const INBOX_UNREAD_EVENT = 'tt-inbox-unread'

let lastEmittedCount: number | null = null
let focusListenersAttached = false

export function emitInboxUnreadCount(count: number) {
  if (typeof window === 'undefined') return
  lastEmittedCount = count
  window.dispatchEvent(new CustomEvent(INBOX_UNREAD_EVENT, { detail: { count } }))
  void applyAppBadge(count)
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
  } catch {
    // ignore badge sync failures
  }
}

/**
 * @param initialCount SSR seed from the app shell
 * @param viewMode When athlete/coach workspace flips, re-seed + refetch (pathname may stay `/inbox`)
 */
export function useInboxNavBadge(initialCount: number, viewMode?: string) {
  const [count, setCount] = useState(initialCount)
  const pathname = usePathname()
  const seedRef = useRef({ initialCount, viewMode, pathname })

  useEffect(() => {
    function onUnread(event: Event) {
      const next = (event as CustomEvent<{ count?: number }>).detail?.count
      if (typeof next !== 'number') return
      setCount((prev) => (prev === next ? prev : next))
    }
    window.addEventListener(INBOX_UNREAD_EVENT, onUnread)
    return () => window.removeEventListener(INBOX_UNREAD_EVENT, onUnread)
  }, [])

  useEffect(() => {
    const prev = seedRef.current
    const viewChanged = prev.viewMode !== viewMode
    const pathChanged = prev.pathname !== pathname
    const seedChanged = prev.initialCount !== initialCount
    seedRef.current = { initialCount, viewMode, pathname }

    if (seedChanged || viewChanged) {
      setCount((c) => (c === initialCount ? c : initialCount))
    }
    if (seedChanged || viewChanged || pathChanged) {
      void refreshInboxUnreadBadge()
    }
  }, [initialCount, viewMode, pathname])

  useEffect(() => {
    if (focusListenersAttached) return
    focusListenersAttached = true
    function refreshOnFocus() {
      if (document.visibilityState === 'visible') {
        void refreshInboxUnreadBadge()
      }
    }
    document.addEventListener('visibilitychange', refreshOnFocus)
    window.addEventListener('focus', refreshOnFocus)
  }, [])

  return count
}
