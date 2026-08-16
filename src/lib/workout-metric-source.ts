import { PlannedMetricSource } from '@prisma/client'
import {
  APPROX_DISTANCE_TAG,
  APPROX_DURATION_TAG,
  approxMetricsFromTags,
} from '@/lib/workout-approx-tags'

export { PlannedMetricSource }

/** True when the value should be recomputed for each athlete (not a locked absolute). */
export function isAutomatedMetricSource(
  source: PlannedMetricSource | null | undefined,
): boolean {
  return source === PlannedMetricSource.STRUCTURE || source === PlannedMetricSource.COMPANION
}

/** Show ~ on cards when the planned value was auto-derived. */
export function isApproximateMetricSource(
  source: PlannedMetricSource | null | undefined,
): boolean {
  return isAutomatedMetricSource(source)
}

/**
 * Resolve source from editor intent.
 * manual → MANUAL; structure-driven → STRUCTURE; otherwise COMPANION (pace/speed fill).
 */
export function metricSourceFromEditorIntent(opts: {
  hasValue: boolean
  manual: boolean
  fromStructure: boolean
}): PlannedMetricSource | null {
  if (!opts.hasValue) return null
  if (opts.manual) return PlannedMetricSource.MANUAL
  if (opts.fromStructure) return PlannedMetricSource.STRUCTURE
  return PlannedMetricSource.COMPANION
}

/** Prefer explicit DB source; fall back to legacy approx tags. */
export function resolveMetricSource(opts: {
  source?: PlannedMetricSource | null
  tags?: string[] | null
  metric: 'distance' | 'duration'
  hasValue: boolean
}): PlannedMetricSource | null {
  if (!opts.hasValue) return null
  if (opts.source) return opts.source
  const approx = approxMetricsFromTags(opts.tags ?? undefined)
  const isApprox = opts.metric === 'distance' ? approx.distance : approx.duration
  return isApprox ? PlannedMetricSource.COMPANION : PlannedMetricSource.MANUAL
}

/** Keep approx:* tags in sync with sources for older readers. */
export function syncApproxTagsFromSources(
  tags: string[] | undefined,
  sources: {
    distance?: PlannedMetricSource | null
    duration?: PlannedMetricSource | null
  },
): string[] {
  const next = [...(tags ?? [])].filter(
    (t) =>
      t !== APPROX_DURATION_TAG &&
      t !== APPROX_DISTANCE_TAG &&
      t !== 'bikeApprox:duration' &&
      t !== 'bikeApprox:distance',
  )
  if (isAutomatedMetricSource(sources.duration)) next.push(APPROX_DURATION_TAG)
  if (isAutomatedMetricSource(sources.distance)) next.push(APPROX_DISTANCE_TAG)
  return next
}

export type ResolvedPlannedMetrics = {
  plannedDistance?: number
  plannedDuration?: number
  distanceSource: PlannedMetricSource | null
  durationSource: PlannedMetricSource | null
}
