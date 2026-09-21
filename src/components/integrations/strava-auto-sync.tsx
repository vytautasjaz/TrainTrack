'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { maybeAutoSyncStravaActivities } from '@/app/actions/strava'

/**
 * Debounced Strava sync after the shell is idle — fallback when hourly cron
 * (`/api/cron/strava-sync`) is not configured. Server still no-ops if synced
 * within the last hour.
 */
export function StravaAutoSync() {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    let cancelled = false
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const run = () => {
      void (async () => {
        try {
          const result = await maybeAutoSyncStravaActivities()
          if (cancelled) return
          if (result.status === 'synced' && (result.matched > 0 || result.imported > 0)) {
            router.refresh()
          }
        } catch {
          // Silent: auto-sync must never interrupt the athlete UI.
        }
      })()
    }

    const ric = window.requestIdleCallback
    if (typeof ric === 'function') {
      idleId = ric(() => run(), { timeout: 8000 })
    } else {
      timeoutId = setTimeout(run, 4000)
    }

    return () => {
      cancelled = true
      if (idleId != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [router])

  return null
}
