import { WorkoutType } from '@prisma/client'

export type PlanCanvasSportMetricMode = 'distance' | 'duration'

export type PlanCanvasSportMetricPrefs = Partial<
  Record<WorkoutType, PlanCanvasSportMetricMode>
>

const STORAGE_PREFIX = 'tt-plan-canvas-stats-metric:'
export const PLAN_CANVAS_STATS_METRIC_CHANGE_EVENT =
  'tt-plan-canvas-stats-metric-change'

const EMPTY_PREFS: PlanCanvasSportMetricPrefs = {}

/** Stable empty prefs for SSR / hydration — never read localStorage here. */
export function emptyPlanCanvasSportMetricPrefs(): PlanCanvasSportMetricPrefs {
  return EMPTY_PREFS
}

const prefsCache = new Map<string, PlanCanvasSportMetricPrefs>()

export function planCanvasStatsMetricStorageKey(planId: string): string {
  return `${STORAGE_PREFIX}${planId}`
}

export function defaultSportMetricMode(
  sport: WorkoutType,
): PlanCanvasSportMetricMode {
  if (
    sport === WorkoutType.SWIM ||
    sport === WorkoutType.RUN ||
    sport === WorkoutType.BIKE ||
    sport === WorkoutType.HYROX ||
    sport === WorkoutType.TRIATHLON
  ) {
    return 'distance'
  }
  return 'duration'
}

export function readPlanCanvasSportMetricPrefs(
  planId: string,
): PlanCanvasSportMetricPrefs {
  if (typeof window === 'undefined') return EMPTY_PREFS
  const cached = prefsCache.get(planId)
  if (cached) return cached
  try {
    const raw = localStorage.getItem(planCanvasStatsMetricStorageKey(planId))
    if (!raw) {
      prefsCache.set(planId, EMPTY_PREFS)
      return EMPTY_PREFS
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      prefsCache.set(planId, EMPTY_PREFS)
      return EMPTY_PREFS
    }
    const out: PlanCanvasSportMetricPrefs = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 'distance' || value === 'duration') {
        out[key as WorkoutType] = value
      }
    }
    const stable = Object.keys(out).length === 0 ? EMPTY_PREFS : out
    prefsCache.set(planId, stable)
    return stable
  } catch {
    prefsCache.set(planId, EMPTY_PREFS)
    return EMPTY_PREFS
  }
}

export function writePlanCanvasSportMetricPrefs(
  planId: string,
  prefs: PlanCanvasSportMetricPrefs,
) {
  const stable = Object.keys(prefs).length === 0 ? EMPTY_PREFS : prefs
  prefsCache.set(planId, stable)
  try {
    localStorage.setItem(
      planCanvasStatsMetricStorageKey(planId),
      JSON.stringify(stable),
    )
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PLAN_CANVAS_STATS_METRIC_CHANGE_EVENT, {
        detail: { planId, prefs: stable },
      }),
    )
  }
}

export function clearPlanCanvasSportMetricPrefsCache(planId?: string) {
  if (planId) prefsCache.delete(planId)
  else prefsCache.clear()
}

export function resolveSportMetricMode(
  sport: WorkoutType,
  prefs: PlanCanvasSportMetricPrefs,
): PlanCanvasSportMetricMode {
  return prefs[sport] ?? defaultSportMetricMode(sport)
}

export function toggleSportMetricMode(
  sport: WorkoutType,
  prefs: PlanCanvasSportMetricPrefs,
): PlanCanvasSportMetricPrefs {
  const current = resolveSportMetricMode(sport, prefs)
  return {
    ...prefs,
    [sport]: current === 'distance' ? 'duration' : 'distance',
  }
}
