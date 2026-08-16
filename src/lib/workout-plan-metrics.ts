import { WorkoutStatus, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatDistance, formatDuration } from '@/lib/utils'
import { formatSwimDistance } from '@/lib/swim-workout/format'

export type WorkoutPlanMetrics = {
  duration: string | null
  distance: string | null
  rpe: string | null
  plannedDuration: string | null
  plannedDistance: string | null
  showPlannedComparison: boolean
}

function formatWorkoutDistance(
  workout: PlanWorkoutDetail,
  km: number | null | undefined,
  meters: number | null | undefined,
): string | null {
  if (workout.type === WorkoutType.SWIM && meters != null && meters > 0) {
    return formatSwimDistance(meters)
  }
  if (km != null && km > 0) {
    const formatted = formatDistance(km)
    return formatted === '—' ? null : formatted
  }
  return null
}

function formatWorkoutDuration(min: number | null | undefined): string | null {
  if (min == null || min <= 0) return null
  const formatted = formatDuration(min)
  return formatted === '—' ? null : formatted
}

export function getWorkoutPlanMetrics(
  workout: PlanWorkoutDetail,
  status: WorkoutStatus = workout.status,
): WorkoutPlanMetrics {
  const isCompleted = status === WorkoutStatus.COMPLETED
  const result = workout.result
  // Self-added sessions are athlete-logged volume, not coach plan — never compare vs planned.
  const isSelfLogged = Boolean(workout.selfLogged)

  const rawPlannedDuration = formatWorkoutDuration(workout.plannedDuration)
  const rawPlannedDistance = formatWorkoutDistance(
    workout,
    workout.plannedDistance,
    workout.plannedDistanceMeters,
  )
  const plannedDuration = isSelfLogged ? null : rawPlannedDuration
  const plannedDistance = isSelfLogged ? null : rawPlannedDistance

  const actualDuration = formatWorkoutDuration(result?.actualDuration)
  // Swim actuals are stored in km; convert to meters so cards match planned (m).
  const actualDistanceMeters =
    workout.type === WorkoutType.SWIM &&
    result?.actualDistance != null &&
    result.actualDistance > 0
      ? Math.round(result.actualDistance * 1000)
      : null
  const actualDistance = formatWorkoutDistance(
    workout,
    result?.actualDistance,
    actualDistanceMeters,
  )

  // Self-added: prefer actual when done; otherwise show the entered values as the session size
  // (not as "planned" for comparison).
  const duration =
    isCompleted && actualDuration
      ? actualDuration
      : isSelfLogged
        ? actualDuration ?? rawPlannedDuration
        : plannedDuration
  const distance =
    isCompleted && actualDistance
      ? actualDistance
      : isSelfLogged
        ? actualDistance ?? rawPlannedDistance
        : plannedDistance

  const showPlannedComparison =
    !isSelfLogged &&
    isCompleted &&
    Boolean(plannedDuration || plannedDistance) &&
    (actualDuration !== plannedDuration || actualDistance !== plannedDistance)

  const rpe = result?.rpe != null ? `${result.rpe}/10` : null

  return {
    duration,
    distance,
    rpe,
    plannedDuration,
    plannedDistance,
    showPlannedComparison,
  }
}

export function formatPlannedComparison(metrics: WorkoutPlanMetrics): string | null {
  if (!metrics.showPlannedComparison) return null
  const parts = [metrics.plannedDuration, metrics.plannedDistance].filter(Boolean)
  return parts.length > 0 ? `P: ${parts.join(' · ')}` : null
}

export function formatPrimaryMetrics(metrics: WorkoutPlanMetrics): string | null {
  const parts = [metrics.duration, metrics.distance, metrics.rpe].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
