/** Tags marking a planned metric as pace/speed-estimated (not user-entered). */
export const APPROX_DURATION_TAG = 'approx:duration'
export const APPROX_DISTANCE_TAG = 'approx:distance'

export const PRIMARY_METRIC_TAG_PREFIX = 'primaryMetric:'
export const DURATION_UNIT_TAG_PREFIX = 'durationUnit:'
/** When set, the non-primary metric is hidden on the plan card (still stored for week totals). */
export const SECONDARY_METRIC_OFF_TAG = 'secondaryMetric:off'

export type WorkoutPrimaryMetric = 'duration' | 'distance'
export type WorkoutDurationUnit = 'min' | 'hours'

export function approxMetricsFromTags(tags: string[] | undefined): {
  duration: boolean
  distance: boolean
} {
  return {
    duration: Boolean(
      tags?.includes(APPROX_DURATION_TAG) || tags?.includes('bikeApprox:duration'),
    ),
    distance: Boolean(
      tags?.includes(APPROX_DISTANCE_TAG) || tags?.includes('bikeApprox:distance'),
    ),
  }
}

export function primaryMetricFromTags(
  tags: string[] | undefined,
): WorkoutPrimaryMetric | null {
  const shared = tags?.find((t) => t.startsWith(PRIMARY_METRIC_TAG_PREFIX))
  if (shared) {
    const value = shared.slice(PRIMARY_METRIC_TAG_PREFIX.length)
    if (value === 'duration' || value === 'distance') return value
  }
  const bike = tags?.find((t) => t.startsWith('bikePrimary:'))
  if (bike) {
    const value = bike.slice('bikePrimary:'.length)
    if (value === 'duration' || value === 'distance') return value
  }
  return null
}

export function secondaryMetricVisibleFromTags(tags: string[] | undefined): boolean {
  return !tags?.includes(SECONDARY_METRIC_OFF_TAG)
}

export function durationUnitFromTags(
  tags: string[] | undefined,
): WorkoutDurationUnit | null {
  const tag = tags?.find((t) => t.startsWith(DURATION_UNIT_TAG_PREFIX))
  if (!tag) return null
  const value = tag.slice(DURATION_UNIT_TAG_PREFIX.length)
  if (value === 'min' || value === 'hours') return value
  return null
}

export function runWorkoutTags(
  primaryMetric: WorkoutPrimaryMetric,
  approx?: { duration?: boolean; distance?: boolean },
  durationUnit?: WorkoutDurationUnit,
): string[] {
  const tags = [`${PRIMARY_METRIC_TAG_PREFIX}${primaryMetric}`]
  if (durationUnit) tags.push(`${DURATION_UNIT_TAG_PREFIX}${durationUnit}`)
  if (approx?.duration) tags.push(APPROX_DURATION_TAG)
  if (approx?.distance) tags.push(APPROX_DISTANCE_TAG)
  return tags
}

/** Merge approx tags when the server invents a companion metric from pace/speed. */
export function withDerivedApproxTags(
  tags: string[] | undefined,
  {
    hadDuration,
    hadDistance,
    resolvedDuration,
    resolvedDistance,
  }: {
    hadDuration: boolean
    hadDistance: boolean
    resolvedDuration?: number
    resolvedDistance?: number
  },
): string[] {
  const next = [...(tags ?? [])].filter(
    (t) => t !== APPROX_DURATION_TAG && t !== APPROX_DISTANCE_TAG,
  )
  const approx = approxMetricsFromTags(tags)
  let durationApprox = approx.duration
  let distanceApprox = approx.distance

  if (!hadDuration && Boolean(resolvedDuration) && hadDistance) durationApprox = true
  if (!hadDistance && Boolean(resolvedDistance) && hadDuration) distanceApprox = true

  if (durationApprox && !next.includes(APPROX_DURATION_TAG)) next.push(APPROX_DURATION_TAG)
  if (distanceApprox && !next.includes(APPROX_DISTANCE_TAG)) next.push(APPROX_DISTANCE_TAG)
  // Keep legacy bike tags if they were already present
  if (durationApprox && tags?.includes('bikeApprox:duration') && !next.includes('bikeApprox:duration')) {
    next.push('bikeApprox:duration')
  }
  if (distanceApprox && tags?.includes('bikeApprox:distance') && !next.includes('bikeApprox:distance')) {
    next.push('bikeApprox:distance')
  }
  return next
}
