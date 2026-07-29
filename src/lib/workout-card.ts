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
import { hasStructureContent } from '@/lib/workout-builder/utils'

export type WorkoutCardHero = {
  value: string
  unit: string | null
  kind: 'distance' | 'duration'
  approximate?: boolean
  /** Planned value shown after "/" when workout is completed */
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
  return `${approximate ? '~ ' : ''}${parts.value}${parts.unit}`
}

export function getWorkoutCardHero(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus = workout.status,
): WorkoutCardHero | null {
  const metrics = getWorkoutPlanMetrics(workout, status)
  const primary =
    primaryMetricFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE ? bikePrimaryMetricFromTags(workout.tags) : null)
  const durationUnit = resolveCardDurationUnit(workout)

  const isCompleted = status === WorkoutStatus.COMPLETED

  const distanceHero = (): WorkoutCardHero | null => {
    if (!metrics.distance) return null
    const { value, unit } = splitDistanceDisplay(metrics.distance)
    let plannedValue: string | undefined
    let plannedUnit: string | null | undefined
    if (isCompleted && workout.plannedDistance) {
      const plannedStr = String(workout.plannedDistance)
      const planned = splitDistanceDisplay(plannedStr)
      const plannedVal = planned.value || plannedStr
      const plannedUnitVal = planned.unit || unit
      if (plannedVal !== value || plannedUnitVal !== unit) {
        plannedValue = plannedVal
        plannedUnit = plannedUnitVal || null
      }
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
    if (isCompleted && workout.result?.actualDuration != null && workout.plannedDuration != null && workout.plannedDuration > 0) {
      const plannedParts = formatWorkoutCardDurationParts(Math.round(workout.plannedDuration), durationUnit)
      if (plannedParts.value !== parts.value) {
        plannedValue = plannedParts.value
        plannedUnit = plannedParts.unit
      }
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

  // Swim planned meters may be on the workout even when metrics formatting missed km path
  if (
    workout.type === WorkoutType.SWIM &&
    workout.plannedDistanceMeters != null &&
    workout.plannedDistanceMeters > 0 &&
    status !== WorkoutStatus.COMPLETED
  ) {
    return {
      value: workout.plannedDistanceMeters.toLocaleString(),
      unit: 'm',
      kind: 'distance',
    }
  }

  return null
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
  if (!secondaryMetricVisibleFromTags(workout.tags)) return null
  const hero = getWorkoutCardHero(workout, status)
  if (!hero) return null
  const metrics = getWorkoutPlanMetrics(workout, status)
  const isCompleted = status === WorkoutStatus.COMPLETED

  if (hero.kind === 'duration') {
    if (!metrics.distance) return null
    const actual = metricApproximate(workout, 'distance') ? `~ ${metrics.distance}` : metrics.distance
    let planned: string | undefined
    if (isCompleted && workout.plannedDistance) {
      const plannedStr = String(workout.plannedDistance)
      if (plannedStr !== metrics.distance) {
        const actualUnit = splitDistanceDisplay(metrics.distance).unit
        planned = actualUnit ? `${plannedStr} ${actualUnit}` : plannedStr
      }
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
  if (isCompleted && workout.result?.actualDuration != null && workout.plannedDuration != null && workout.plannedDuration > 0) {
    const plannedLabel = formatWorkoutCardDurationLabel(Math.round(workout.plannedDuration), durationUnit)
    if (actualLabel !== plannedLabel) {
      planned = plannedLabel
    }
  }
  return { actual: actualLabel, planned }
}

export function isWorkoutCardCompleted(
  status: WorkoutStatus,
): boolean {
  return status === WorkoutStatus.COMPLETED
}

export function isWorkoutCardSkipped(status: WorkoutStatus): boolean {
  return status === WorkoutStatus.SKIPPED
}
