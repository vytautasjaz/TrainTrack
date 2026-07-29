'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { maybeAutoSyncStravaActivities } from '@/app/actions/strava'

/**
 * Runs a debounced Strava sync once per app session when an athlete is logged in
 * and auto-sync is enabled. Manual sync remains available on Preferences.
 * Interval is enforced server-side via StravaConnection.lastSyncedAt.
 */
export function StravaAutoSync() {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    let cancelled = false

    void (async () => {
      try {
        const result = await maybeAutoSyncStravaActivities()
        if (cancelled) return
        if (result.status === 'synced' && result.matched > 0) {
          router.refresh()
        }
      } catch {
        // Silent: auto-sync must never interrupt the athlete UI.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}
