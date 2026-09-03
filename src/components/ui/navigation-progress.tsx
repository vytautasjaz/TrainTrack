/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProgressState = 'idle' | 'loading' | 'finishing'

const SHOW_DELAY_MS = 120
const FINISH_MS = 280

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [state, setState] = useState<ProgressState>('idle')
  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  function clearShowDelay() {
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current)
      showDelayRef.current = null
    }
  }

  function start() {
    clearShowDelay()
    activeRef.current = true
    showDelayRef.current = setTimeout(() => {
      if (activeRef.current) setState('loading')
    }, SHOW_DELAY_MS)
  }

  function finish() {
    clearShowDelay()
    activeRef.current = false
    setState((prev) => (prev === 'loading' ? 'finishing' : 'idle'))
  }

  useEffect(() => {
    finish()
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

      start()
    }

    function onPopState() {
      start()
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      clearShowDelay()
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
