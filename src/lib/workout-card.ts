import { WorkoutStatus, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { bikePrimaryMetricFromTags } from '@/lib/bike-workout/defaults'
import {
  approxMetricsFromTags,
  durationUnitFromTags,
  primaryMetricFromTags,
  secondaryMetricVisibleFromTags,
  type WorkoutDurationUnit,
} from '@/lib/workout-approx-tags'
import {
  isApproximateMetricSource,
  resolveMetricSource,
} from '@/lib/workout-metric-source'
import { hasStructureContent } from '@/lib/workout-builder/utils'

export type WorkoutCardHero = {
  value: string
  unit: string | null
  kind: 'distance' | 'duration'
  approximate?: boolean
  /**
   * Value after "/".
   * Workouts (completed) and races (with result): planned (muted).
   */
  plannedValue?: string
  plannedUnit?: string | null
}

function splitDistanceDisplay(distance: string): { value: string; unit: string } {
  const trimmed = distance.trim()
  const match = trimmed.match(/^(.+?)\s+(km|m)$/i)
  if (match) {
    return { value: match[1]!, unit: match[2]!.toLowerCase() }
  }
  return { value: trimmed, unit: '' }
}

function isWarmOrCoolLine(line: string): boolean {
  const lower = line.trim().toLowerCase()
  return lower.startsWith('wu ') || lower.startsWith('cd ')
}

/** Single gray subheader for plan data cards — only explicit workout description. */
export function getWorkoutCardSubtitle(workout: PlanWorkoutDetail): string | null {
  const description = workout.description?.trim()
  if (!description) return null

  for (const line of description.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !isWarmOrCoolLine(trimmed)) return trimmed
  }

  return null
}

function metricApproximate(
  workout: PlanWorkoutDetail,
  metric: 'duration' | 'distance',
): boolean {
  if (workout.type !== WorkoutType.BIKE && workout.type !== WorkoutType.RUN) return false
  // Structure totals are athlete-resolved estimates — still show ~ unless locked MANUAL.
  const source =
    metric === 'duration'
      ? resolveMetricSource({
          source: workout.plannedDurationSource,
          tags: workout.tags,
          metric: 'duration',
          hasValue: Boolean(workout.plannedDuration),
        })
      : resolveMetricSource({
          source: workout.plannedDistanceSource,
          tags: workout.tags,
          metric: 'distance',
          hasValue: Boolean(workout.plannedDistance),
        })
  if (source) return isApproximateMetricSource(source)
  if (workout.structure && hasStructureContent(workout.structure)) return false
  const approx = approxMetricsFromTags(workout.tags)
  return metric === 'duration' ? approx.duration : approx.distance
}

function resolveCardDurationUnit(workout: PlanWorkoutDetail): WorkoutDurationUnit {
  return (
    durationUnitFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE ? 'hours' : 'min')
  )
}

function resolveDurationMinutes(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus,
): number | null {
  const isCompleted = status === WorkoutStatus.COMPLETED
  const actual = workout.result?.actualDuration
  if (isCompleted && actual != null && actual > 0) return Math.round(actual)
  if (workout.plannedDuration != null && workout.plannedDuration > 0) {
    return Math.round(workout.plannedDuration)
  }
  return null
}

/** Card duration display: `1:30` + `h`, or `90` + `min`. */
export function formatWorkoutCardDurationParts(
  totalMinutes: number,
  unit: WorkoutDurationUnit,
): { value: string; unit: string } {
  const safe = Math.max(0, Math.round(totalMinutes))
  if (unit === 'hours') {
    const hours = Math.floor(safe / 60)
    const minutes = safe % 60
    return {
      value: `${hours}:${String(minutes).padStart(2, '0')}`,
      unit: 'h',
    }
  }
  return { value: String(safe), unit: 'min' }
}

export function formatWorkoutCardDurationLabel(
  totalMinutes: number,
  unit: WorkoutDurationUnit,
  approximate = false,
): string {
  const parts = formatWorkoutCardDurationParts(totalMinutes, unit)
  return `${approximate ? '~ ' : ''}${parts.value} ${parts.unit}`
}

export function getWorkoutCardHero(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus = workout.status,
): WorkoutCardHero | null {
  if (workout.isRace) return getRaceCardHero(workout)

  const metrics = getWorkoutPlanMetrics(workout, status)
  const primary =
    primaryMetricFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE ? bikePrimaryMetricFromTags(workout.tags) : null)
  const durationUnit = resolveCardDurationUnit(workout)

  const isCompleted = status === WorkoutStatus.COMPLETED

  const hasActualDistance =
    workout.result?.actualDistance != null && workout.result.actualDistance > 0

  const distanceHero = (): WorkoutCardHero | null => {
    if (!metrics.distance) return null
    const { value, unit } = splitDistanceDisplay(metrics.distance)
    let plannedValue: string | undefined
    let plannedUnit: string | null | undefined
    // Use formatted planned distance (includes swim meters), not raw km number.
    if (
      isCompleted &&
      !workout.selfLogged &&
      hasActualDistance &&
      metrics.plannedDistance
    ) {
      const planned = splitDistanceDisplay(metrics.plannedDistance)
      plannedValue = planned.value
      plannedUnit = planned.unit || unit || null
    }
    return {
      value,
      unit: unit || null,
      kind: 'distance',
      approximate: metricApproximate(workout, 'distance'),
      plannedValue,
      plannedUnit,
    }
  }

  const durationHero = (): WorkoutCardHero | null => {
    const minutes = resolveDurationMinutes(workout, status)
    if (minutes == null) return null
    const parts = formatWorkoutCardDurationParts(minutes, durationUnit)
    let plannedValue: string | undefined
    let plannedUnit: string | null | undefined
    if (
      isCompleted &&
      !workout.selfLogged &&
      workout.result?.actualDuration != null &&
      workout.result.actualDuration > 0 &&
      workout.plannedDuration != null &&
      workout.plannedDuration > 0
    ) {
      const plannedParts = formatWorkoutCardDurationParts(
        Math.round(workout.plannedDuration),
        durationUnit,
      )
      plannedValue = plannedParts.value
      plannedUnit = plannedParts.unit
    }
    return {
      value: parts.value,
      unit: parts.unit,
      kind: 'duration',
      approximate: metricApproximate(workout, 'duration'),
      plannedValue,
      plannedUnit,
    }
  }

  if (primary === 'duration') {
    return durationHero() ?? distanceHero()
  }

  if (primary === 'distance') {
    return distanceHero() ?? durationHero()
  }

  if (metrics.distance) {
    return distanceHero()
  }

  if (metrics.duration) {
    return durationHero()
  }

  return null
}

/**
 * Race cards: distance primary — actual (done) as hero when logged,
 * planned after "/" in muted style. Before result: planned only.
 * DNF / DNS with no distance → "0 / {planned}".
 * Falls back to duration when distance is missing.
 */
function getRaceCardHero(workout: PlanWorkoutDetail): WorkoutCardHero | null {
  const plannedMetrics = getWorkoutPlanMetrics(workout, WorkoutStatus.PLANNED)
  const plannedLabel = plannedMetrics.plannedDistance ?? plannedMetrics.distance
  if (plannedLabel) {
    const planned = splitDistanceDisplay(plannedLabel)
    const actualKm = workout.result?.actualDistance
    const hasActualLogged = actualKm != null && Number.isFinite(actualKm) && actualKm >= 0

    if (hasActualLogged) {
      if (actualKm === 0) {
        return {
          value: '0',
          unit: null,
          kind: 'distance',
          plannedValue: planned.value,
          plannedUnit: planned.unit || 'km',
        }
      }
      const actualMetrics = getWorkoutPlanMetrics(workout, WorkoutStatus.COMPLETED)
      if (actualMetrics.distance) {
        const actual = splitDistanceDisplay(actualMetrics.distance)
        return {
          value: actual.value,
          unit: actual.unit || planned.unit || null,
          kind: 'distance',
          plannedValue: planned.value,
          plannedUnit: planned.unit || actual.unit || null,
        }
      }
    }

    return {
      value: planned.value,
      unit: planned.unit || null,
      kind: 'distance',
    }
  }

  if (workout.plannedDuration == null || workout.plannedDuration <= 0) {
    const actualMin = workout.result?.actualDuration
    if (actualMin == null || actualMin <= 0) return null
    const durationUnit = resolveCardDurationUnit(workout)
    const actualParts = formatWorkoutCardDurationParts(Math.round(actualMin), durationUnit)
    return {
      value: actualParts.value,
      unit: actualParts.unit,
      kind: 'duration',
    }
  }

  const durationUnit = resolveCardDurationUnit(workout)
  const plannedParts = formatWorkoutCardDurationParts(
    Math.round(workout.plannedDuration),
    durationUnit,
  )
  const actualMin = workout.result?.actualDuration
  if (actualMin != null && actualMin > 0) {
    const actualParts = formatWorkoutCardDurationParts(Math.round(actualMin), durationUnit)
    return {
      value: actualParts.value,
      unit: actualParts.unit,
      kind: 'duration',
      plannedValue: plannedParts.value,
      plannedUnit: plannedParts.unit,
    }
  }
  return {
    value: plannedParts.value,
    unit: plannedParts.unit,
    kind: 'duration',
  }
}

export type WorkoutCardDuration = {
  actual: string
  planned?: string
}

/** Secondary metric line when the hero shows the other value. */
export function getWorkoutCardDuration(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus = workout.status,
): WorkoutCardDuration | null {
  if (workout.isRace) return getRaceCardDuration(workout)

  if (!secondaryMetricVisibleFromTags(workout.tags)) return null
  const hero = getWorkoutCardHero(workout, status)
  if (!hero) return null
  const metrics = getWorkoutPlanMetrics(workout, status)
  const isCompleted = status === WorkoutStatus.COMPLETED

  if (hero.kind === 'duration') {
    if (!metrics.distance) return null
    const actual = metricApproximate(workout, 'distance') ? `~ ${metrics.distance}` : metrics.distance
    const hasActualDistance =
      workout.result?.actualDistance != null && workout.result.actualDistance > 0
    let planned: string | undefined
    if (isCompleted && !workout.selfLogged && hasActualDistance && metrics.plannedDistance) {
      planned = metrics.plannedDistance
    }
    return { actual, planned }
  }

  const minutes = resolveDurationMinutes(workout, status)
  if (minutes == null) return null
  const durationUnit = resolveCardDurationUnit(workout)
  const actualLabel = formatWorkoutCardDurationLabel(
    minutes,
    durationUnit,
    metricApproximate(workout, 'duration'),
  )
  let planned: string | undefined
  if (
    isCompleted &&
    !workout.selfLogged &&
    workout.result?.actualDuration != null &&
    workout.result.actualDuration > 0 &&
    workout.plannedDuration != null &&
    workout.plannedDuration > 0
  ) {
    planned = formatWorkoutCardDurationLabel(Math.round(workout.plannedDuration), durationUnit)
  }
  return { actual: actualLabel, planned }
}

/**
 * Race secondary: usually time — actual first (dark), planned after "/" (muted).
 * Field names match the card UI (`actual` = left, `planned` = after slash).
 */
function getRaceCardDuration(workout: PlanWorkoutDetail): WorkoutCardDuration | null {
  const hero = getRaceCardHero(workout)
  if (!hero) return null

  if (hero.kind === 'duration') {
    const plannedMetrics = getWorkoutPlanMetrics(workout, WorkoutStatus.PLANNED)
    const plannedLabel = plannedMetrics.plannedDistance
    if (!plannedLabel && !(workout.result?.actualDistance != null && workout.result.actualDistance > 0)) {
      return null
    }
    const hasActual =
      workout.result?.actualDistance != null && workout.result.actualDistance > 0
    const actualMetrics = getWorkoutPlanMetrics(workout, WorkoutStatus.COMPLETED)
    if (hasActual && actualMetrics.distance) {
      return {
        actual: actualMetrics.distance,
        planned: plannedLabel ?? undefined,
      }
    }
    if (!plannedLabel) return null
    return { actual: plannedLabel }
  }

  const durationUnit = resolveCardDurationUnit(workout)
  const plannedMin =
    workout.plannedDuration != null && workout.plannedDuration > 0
      ? Math.round(workout.plannedDuration)
      : null
  const actualMin =
    workout.result?.actualDuration != null && workout.result.actualDuration > 0
      ? Math.round(workout.result.actualDuration)
      : null

  if (actualMin != null) {
    return {
      actual: formatWorkoutCardDurationLabel(actualMin, durationUnit),
      planned:
        plannedMin != null
          ? formatWorkoutCardDurationLabel(plannedMin, durationUnit)
          : undefined,
    }
  }
  if (plannedMin == null) return null
  return {
    actual: formatWorkoutCardDurationLabel(plannedMin, durationUnit),
  }
}

export function isWorkoutCardCompleted(
  status: WorkoutStatus,
): boolean {
  return status === WorkoutStatus.COMPLETED
}

export function isWorkoutCardSkipped(status: WorkoutStatus): boolean {
  return status === WorkoutStatus.SKIPPED
}

/**
 * Actual vs planned completion for completed workouts.
 * Prefers distance when both sides exist; otherwise duration.
 * Returns null when not comparable (planned missing, race, not completed).
 */
export function getWorkoutCompletionPercent(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus = workout.status,
): number | null {
  if (status !== WorkoutStatus.COMPLETED || workout.isRace) return null

  const actualDistanceKm = workout.result?.actualDistance
  if (actualDistanceKm != null && actualDistanceKm > 0) {
    let plannedKm = workout.plannedDistance
    if (
      workout.type === WorkoutType.SWIM &&
      workout.plannedDistanceMeters != null &&
      workout.plannedDistanceMeters > 0
    ) {
      plannedKm = workout.plannedDistanceMeters / 1000
    }
    if (plannedKm != null && plannedKm > 0) {
      return Math.round((actualDistanceKm / plannedKm) * 100)
    }
  }

  const actualDuration = workout.result?.actualDuration
  const plannedDuration = workout.plannedDuration
  if (
    actualDuration != null &&
    actualDuration > 0 &&
    plannedDuration != null &&
    plannedDuration > 0
  ) {
    return Math.round((actualDuration / plannedDuration) * 100)
  }

  return null
}
