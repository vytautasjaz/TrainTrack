const CACHE_VERSION = 'v3'
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

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {}
    } catch {
      return {}
    }
  })()
  const title = payload.title || 'TrainTrack'
  const body = payload.body || 'You have a new notification'
  const url = payload.url || '/inbox'
  const unreadCount = Number(payload.unreadCount)
  event.waitUntil(
    (async () => {
      const registration = self.registration
      if ('setAppBadge' in registration && Number.isFinite(unreadCount) && unreadCount >= 0) {
        if (unreadCount > 0) {
          await registration.setAppBadge(unreadCount)
        } else if ('clearAppBadge' in registration) {
          await registration.clearAppBadge()
        }
      }
      await registration.showNotification(title, {
        body,
        tag: payload.tag || 'inbox-notification',
        data: { url },
        badge: '/icons/icon-192.png',
        icon: '/icons/icon-192.png',
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/inbox'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes('/inbox')) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      return undefined
    }),
  )
})
