/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProgressState = 'idle' | 'loading' | 'finishing'

/**
 * Anti-flicker: wait before painting chrome so instant navigations stay quiet.
 * ~100–200ms is the usual top-bar range (NProgress-style / Material linear progress).
 */
const SHOW_DELAY_MS = 150
/** Once shown, keep visible briefly so it doesn't flash off. */
const MIN_VISIBLE_MS = 300
const FINISH_MS = 280
/** How long we wait for `(app)/loading.tsx` to appear after the URL commits. */
const PENDING_GRACE_MS = 80
const ROUTE_PENDING_SELECTOR = '[data-tt-route-pending]'

function hasRoutePending() {
  return Boolean(document.querySelector(ROUTE_PENDING_SELECTOR))
}

/**
 * Stay busy until the App Router page slot leaves `loading.tsx`.
 * If no pending marker shows up quickly (cached / client-only), settle after a short grace.
 */
function waitForRouteReady(signal: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      if (!signal.cancelled) resolve()
    }

    const watchUntilClear = () => {
      if (signal.cancelled) return
      if (!hasRoutePending()) {
        done()
        return
      }
      const observer = new MutationObserver(() => {
        if (signal.cancelled) {
          observer.disconnect()
          return
        }
        if (!hasRoutePending()) {
          observer.disconnect()
          // Let the real page paint once before clearing the chrome.
          requestAnimationFrame(() => requestAnimationFrame(done))
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    if (hasRoutePending()) {
      watchUntilClear()
      return
    }

    // URL may commit a frame before React swaps in `loading.tsx`.
    window.setTimeout(() => {
      if (signal.cancelled) return
      watchUntilClear()
    }, PENDING_GRACE_MS)
  })
}

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [state, setState] = useState<ProgressState>('idle')
  const activeRef = useRef(false)
  const visibleRef = useRef(false)
  const shownAtRef = useRef(0)
  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minVisibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipFirstRouteEffect = useRef(true)
  const prevPathnameRef = useRef(pathname)
  const settleGenRef = useRef(0)
  const settleSignalRef = useRef<{ cancelled: boolean }>({ cancelled: false })

  function clearShowDelay() {
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current)
      showDelayRef.current = null
    }
  }

  function clearMinVisibleTimer() {
    if (minVisibleTimerRef.current) {
      clearTimeout(minVisibleTimerRef.current)
      minVisibleTimerRef.current = null
    }
  }

  function cancelSettle() {
    settleSignalRef.current.cancelled = true
    settleGenRef.current += 1
  }

  function reveal() {
    clearShowDelay()
    if (!visibleRef.current) {
      visibleRef.current = true
      shownAtRef.current = Date.now()
    }
    setState('loading')
  }

  /** Mark navigation in flight; paint chrome only after SHOW_DELAY (unless skeleton is up). */
  function beginLoading() {
    activeRef.current = true
    if (visibleRef.current) {
      setState('loading')
      return
    }
    // Skeleton already means the user is waiting — skip the anti-flicker delay.
    if (hasRoutePending()) {
      reveal()
      return
    }
    if (showDelayRef.current) return
    showDelayRef.current = setTimeout(() => {
      showDelayRef.current = null
      if (activeRef.current) reveal()
    }, SHOW_DELAY_MS)
  }

  function finish() {
    clearShowDelay()
    activeRef.current = false

    if (!visibleRef.current) {
      // Finished before the show delay — never paint (avoid flicker).
      setState('idle')
      return
    }

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
    clearMinVisibleTimer()
    minVisibleTimerRef.current = setTimeout(() => {
      minVisibleTimerRef.current = null
      visibleRef.current = false
      setState((prev) => (prev === 'loading' ? 'finishing' : 'idle'))
    }, remaining)
  }

  function settleAfterRouteCommit() {
    cancelSettle()
    clearMinVisibleTimer()
    const gen = settleGenRef.current
    const signal = { cancelled: false }
    settleSignalRef.current = signal
    beginLoading()
    void waitForRouteReady(signal).then(() => {
      if (signal.cancelled || gen !== settleGenRef.current) return
      finish()
    })
  }

  useEffect(() => {
    if (skipFirstRouteEffect.current) {
      skipFirstRouteEffect.current = false
      prevPathnameRef.current = pathname
      return
    }

    const pathChanged = prevPathnameRef.current !== pathname
    prevPathnameRef.current = pathname

    // Path changes (Link / router.push / back) and in-flight click navigations
    // (including ?query changes) share one settle path so the chrome stays up
    // through skeleton → real page. Pure silent search updates do not flash it.
    if (pathChanged || activeRef.current) {
      settleAfterRouteCommit()
    }

    return () => {
      settleSignalRef.current.cancelled = true
    }
  }, [routeKey])

  useEffect(() => {
    if (state !== 'finishing') return
    const t = setTimeout(() => setState('idle'), FINISH_MS)
    return () => clearTimeout(t)
  }, [state])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return
      }

      beginLoading()
    }

    function onPopState() {
      beginLoading()
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      cancelSettle()
      clearShowDelay()
      clearMinVisibleTimer()
    }
  }, [])

  if (state === 'idle') return null

  const busy = state === 'loading'

  return (
    <>
      <div
        className={cn(
          'tt-route-progress',
          state === 'finishing' && 'tt-route-progress--finishing',
        )}
        role="progressbar"
        aria-hidden={!busy}
        aria-busy={busy}
        aria-label={busy ? 'Loading page' : undefined}
      />
      {busy ? (
        <div
          className="tt-route-progress-status"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="tt-view-mode-switch-status-spinner" aria-hidden />
          <span>Loading…</span>
        </div>
      ) : null}
    </>
  )
}

/** Same route-progress chrome used for athlete ↔ coach switch, during menu navigations. */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
