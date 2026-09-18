'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { WorkoutType } from '@prisma/client'
import {
  PLAN_CANVAS_STATS_METRIC_CHANGE_EVENT,
  clearPlanCanvasSportMetricPrefsCache,
  emptyPlanCanvasSportMetricPrefs,
  planCanvasStatsMetricStorageKey,
  readPlanCanvasSportMetricPrefs,
  resolveSportMetricMode,
  toggleSportMetricMode,
  writePlanCanvasSportMetricPrefs,
  type PlanCanvasSportMetricMode,
  type PlanCanvasSportMetricPrefs,
} from '@/lib/plan-canvas-stats-metric'

/**
 * Per-plan compact stats metric prefs (distance vs duration), synced across week rows.
 */
export function usePlanCanvasSportMetricPrefs(planId: string): {
  prefs: PlanCanvasSportMetricPrefs
  modeFor: (sport: WorkoutType) => PlanCanvasSportMetricMode
  toggleSport: (sport: WorkoutType) => void
} {
  const prefs = useSyncExternalStore(
    (onStoreChange) => {
      function onChange(event: Event) {
        const detail = (event as CustomEvent<{ planId: string }>).detail
        if (detail?.planId === planId) onStoreChange()
      }
      function onStorage(event: StorageEvent) {
        if (event.key === planCanvasStatsMetricStorageKey(planId)) {
          clearPlanCanvasSportMetricPrefsCache(planId)
          onStoreChange()
        }
      }
      window.addEventListener(PLAN_CANVAS_STATS_METRIC_CHANGE_EVENT, onChange)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener(
          PLAN_CANVAS_STATS_METRIC_CHANGE_EVENT,
          onChange,
        )
        window.removeEventListener('storage', onStorage)
      }
    },
    () => readPlanCanvasSportMetricPrefs(planId),
    // Must match SSR HTML — do not read localStorage during hydration.
    emptyPlanCanvasSportMetricPrefs,
  )

  const modeFor = useCallback(
    (sport: WorkoutType) => resolveSportMetricMode(sport, prefs),
    [prefs],
  )

  const toggleSport = useCallback(
    (sport: WorkoutType) => {
      const next = toggleSportMetricMode(
        sport,
        readPlanCanvasSportMetricPrefs(planId),
      )
      writePlanCanvasSportMetricPrefs(planId, next)
    },
    [planId],
  )

  return { prefs, modeFor, toggleSport }
}
