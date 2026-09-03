'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { emitInboxUnreadCount, refreshInboxUnreadBadge } from '@/components/layout/inbox-nav-badge'

function isSafeInboxPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return null
    if (url.pathname !== '/inbox' && !url.pathname.startsWith('/inbox/')) return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

/** Listens for service-worker push / notification-click messages. */
export function InboxPushBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'TT_INBOX_PUSH') {
        if (typeof data.unreadCount === 'number') {
          emitInboxUnreadCount(data.unreadCount)
        } else {
          void refreshInboxUnreadBadge()
        }
        return
      }

      if (data.type === 'TT_OPEN_INBOX_THREAD') {
        const path = isSafeInboxPath(data.url)
        if (path) router.push(path)
        void refreshInboxUnreadBadge()
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [router])

  return null
}
