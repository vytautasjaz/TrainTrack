const CACHE_VERSION = 'v4'
const STATIC_CACHE = `traintrack-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `traintrack-dynamic-${CACHE_VERSION}`

/** App routes whose HTML embeds Server Action ids — never cache after deploy. */
const LIVE_NAV_PATHS = ['/', '/onboarding']

// Resources to pre-cache on install (including offline fallback)
const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.svg',
]

// ─── Install: pre-cache static shell ────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── Activate: purge old caches ─────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Never intercept localhost — cache-first JS would hide Next.js HMR updates.
  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname === '[::1]'
  ) {
    return
  }

  const url = new URL(request.url)

  // Skip cross-origin requests (analytics, external APIs, etc.)
  if (url.origin !== self.location.origin) return

  // Never intercept Next.js build output — cache-first stale JS breaks Server Actions
  // after deploy (client action ids no longer exist on the server).
  if (url.pathname.startsWith('/_next/')) return

  // Auth / invite shell pages must always hit the network when online.
  if (
    request.mode === 'navigate' &&
    (LIVE_NAV_PATHS.includes(url.pathname) || url.pathname.startsWith('/join/'))
  ) {
    event.respondWith(liveNavigation(request))
    return
  }

  // Cache-first for icons and manifest only (immutable branding assets).
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Network-first with offline fallback for everything else (pages, API routes)
  event.respondWith(networkFirstWithFallback(request))
})

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function liveNavigation(request) {
  try {
    return await fetch(request)
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    const offline = await caches.match('/offline')
    if (offline) return offline

    return new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // For navigation requests show the offline page
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline')
      if (offline) return offline
    }

    return new Response('Offline', { status: 503 })
  }
}


// ─── Push notifications (Inbox) ─────────────────────────────────────────────

function isTrustedInboxUrl(raw) {
  try {
    const url = new URL(raw, self.location.origin)
    if (url.origin !== self.location.origin) return null
    if (url.pathname !== '/inbox' && !url.pathname.startsWith('/inbox/')) {
      return `${self.location.origin}/inbox`
    }
    return url.href
  } catch {
    return `${self.location.origin}/inbox`
  }
}

async function updateAppBadge(unreadCount) {
  const registration = self.registration
  if (!('setAppBadge' in registration)) return
  if (!Number.isFinite(unreadCount) || unreadCount < 0) return
  if (unreadCount > 0) {
    await registration.setAppBadge(unreadCount)
  } else if ('clearAppBadge' in registration) {
    await registration.clearAppBadge()
  }
}

async function shouldSkipNotification(threadId) {
  if (!threadId) return false
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const client of clients) {
    if (!client.focused) continue
    try {
      const url = new URL(client.url)
      if (url.pathname.startsWith('/inbox') && url.searchParams.get('thread') === threadId) {
        return true
      }
    } catch {
      // ignore
    }
  }
  return false
}

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {}
    } catch {
      return {}
    }
  })()

  const title = payload.title || 'TrainTrack'
  const body = payload.body || 'You have a new inbox message'
  const url = isTrustedInboxUrl(payload.url || '/inbox') || `${self.location.origin}/inbox`
  const unreadCount = Number(payload.unreadCount)
  const threadId = typeof payload.threadId === 'string' ? payload.threadId : null
  const messageId = typeof payload.messageId === 'string' ? payload.messageId : null

  event.waitUntil(
    (async () => {
      await updateAppBadge(unreadCount)

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of clients) {
        client.postMessage({
          type: 'TT_INBOX_PUSH',
          threadId,
          messageId,
          unreadCount: Number.isFinite(unreadCount) ? unreadCount : null,
          url,
        })
      }

      if (await shouldSkipNotification(threadId)) return

      await self.registration.showNotification(title, {
        body,
        tag: payload.tag || (threadId ? `inbox-thread-${threadId}` : 'inbox-notification'),
        renotify: true,
        data: {
          url,
          threadId,
          messageId,
          type: payload.type || 'new_message',
        },
        badge: '/icons/icon-192.png',
        icon: '/icons/icon-192.png',
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification?.data?.url || '/inbox'
  const targetUrl = isTrustedInboxUrl(rawUrl) || `${self.location.origin}/inbox`

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clients) {
        if (!client.url.startsWith(self.location.origin)) continue
        if ('focus' in client) await client.focus()
        client.postMessage({
          type: 'TT_OPEN_INBOX_THREAD',
          url: targetUrl.replace(self.location.origin, '') || '/inbox',
        })
        if (typeof client.navigate === 'function') {
          try {
            await client.navigate(targetUrl)
          } catch {
            // postMessage navigation is the fallback
          }
        }
        return
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
