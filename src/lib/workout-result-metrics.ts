import { WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  estimateSessionLoad,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import {
  DEFAULT_SWIM_DISTANCE_UNIT,
  DEFAULT_UNIT_SYSTEM,
  formatDistanceValue,
  formatElevationValue,
  formatPace,
  formatPaceUnit,
  formatSpeedKph,
  formatSpeedUnit,
  formatSwimDistanceValue,
  formatSwimPace,
  formatSwimPaceUnit,
  type SwimDistanceUnit,
  type UnitSystem,
} from '@/lib/units'

export type WorkoutResultMetricSlot = {
  label: string
  value: string
  unit?: string | null
  planned?: string | null
}

function formatClock(durationMin: number): string {
  const totalSecs = Math.max(0, Math.round(durationMin * 60))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function paceOrSpeed(
  workout: PlanWorkoutDetail,
  unitSystem: UnitSystem,
  swimUnit: SwimDistanceUnit,
): WorkoutResultMetricSlot | null {
  const result = workout.result
  const distanceKm = result?.actualDistance
  const durationMin = result?.actualDuration
  const speedMps = result?.averageSpeedMps

  if (workout.type === WorkoutType.BIKE) {
    const kph =
      speedMps != null && speedMps > 0
        ? speedMps * 3.6
        : distanceKm != null &&
            distanceKm > 0 &&
            durationMin != null &&
            durationMin > 0
          ? distanceKm / (durationMin / 60)
          : null
    if (kph == null || !Number.isFinite(kph) || kph <= 0) return null
    return {
      label: 'Avg speed',
      value: formatSpeedKph(kph, unitSystem, { withUnit: false }),
      unit: formatSpeedUnit(unitSystem),
    }
  }

  if (
    distanceKm == null ||
    distanceKm <= 0 ||
    durationMin == null ||
    durationMin <= 0
  ) {
    return null
  }

  if (workout.type === WorkoutType.SWIM) {
    const minPer100m = durationMin / (distanceKm * 10)
    const pace = formatSwimPace(minPer100m, swimUnit, { withUnit: false })
    if (!pace) return null
    return {
      label: 'Avg pace',
      value: pace,
      unit: formatSwimPaceUnit(swimUnit),
    }
  }

  const minPerKm = durationMin / distanceKm
  const pace = formatPace(minPerKm, unitSystem, { withUnit: false })
  if (!pace) return null
  return { label: 'Avg pace', value: pace, unit: formatPaceUnit(unitSystem) }
}

function distanceSlot(
  workout: PlanWorkoutDetail,
  unitSystem: UnitSystem,
  swimUnit: SwimDistanceUnit,
): WorkoutResultMetricSlot | null {
  const result = workout.result
  if (workout.type === WorkoutType.SWIM && result?.actualDistance != null && result.actualDistance > 0) {
    const parts = formatSwimDistanceValue(
      result.actualDistance * 1000,
      swimUnit,
    )
    if (!parts) return null
    return { label: 'Distance', value: parts.value, unit: parts.unit }
  }
  if (result?.actualDistance != null && result.actualDistance > 0) {
    const parts = formatDistanceValue(result.actualDistance, unitSystem)
    if (!parts) return null
    return { label: 'Distance', value: parts.value, unit: parts.unit }
  }
  return null
}

/**
 * Feed-style completed metrics for a Strava-synced (or otherwise fully logged) session.
 * Primary row matches the activity feed; extras (HR, cadence, …) follow when present.
 */
export function stravaSyncedMetricSlots(
  workout: PlanWorkoutDetail,
  thresholds: SessionLoadThresholds = {},
  unitSystem: UnitSystem = DEFAULT_UNIT_SYSTEM,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): { primary: WorkoutResultMetricSlot[]; extra: WorkoutResultMetricSlot[] } {
  const result = workout.result
  if (!result) return { primary: [], extra: [] }

  const distance = distanceSlot(workout, unitSystem, swimUnit)
  const time =
    result.actualDuration != null && result.actualDuration > 0
      ? { label: 'Time', value: formatClock(result.actualDuration) }
      : null
  const pace = paceOrSpeed(workout, unitSystem, swimUnit)
  const watts =
    result.weightedAverageWatts ?? result.averageWatts ?? null
  const power =
    watts != null && watts > 0
      ? { label: 'Avg power', value: String(Math.round(watts)), unit: 'W' }
      : null
  const elevParts = formatElevationValue(result.elevationGainM, unitSystem)
  const elev = elevParts
    ? {
        label: 'Elev gain',
        value: elevParts.value,
        unit: elevParts.unit,
      }
    : null
  const load = estimateSessionLoad(workout, thresholds, { preferPlanned: false })
  const tss =
    load && load.tss > 0
      ? { label: 'TSS', value: String(Math.round(load.tss)) }
      : null
  const avgHr =
    result.averageHeartrate != null && result.averageHeartrate > 0
      ? {
          label: 'Avg HR',
          value: String(Math.round(result.averageHeartrate)),
          unit: 'bpm',
        }
      : null
  const calories =
    result.calories != null && result.calories > 0
      ? { label: 'Calories', value: String(Math.round(result.calories)) }
      : null

  const primary: WorkoutResultMetricSlot[] = []
  if (workout.type === WorkoutType.STRENGTH) {
    if (time) primary.push({ ...time, label: 'Duration' })
    if (avgHr) primary.push(avgHr)
    if (calories) primary.push(calories)
    if (tss) primary.push(tss)
  } else if (workout.type === WorkoutType.RECOVERY) {
    if (time) primary.push({ ...time, label: 'Duration' })
    if (distance) primary.push(distance)
    if (pace) primary.push(pace)
    if (elev) primary.push(elev)
    if (tss) primary.push(tss)
  } else if (workout.type === WorkoutType.BIKE) {
    if (distance) primary.push(distance)
    if (time) primary.push(time)
    if (power) primary.push(power)
    else if (pace) primary.push(pace)
    if (elev) primary.push(elev)
    if (tss) primary.push(tss)
  } else if (workout.type === WorkoutType.SWIM) {
    if (distance) primary.push(distance)
    if (time) primary.push(time)
    if (pace) primary.push(pace)
    if (tss) primary.push(tss)
  } else {
    if (distance) primary.push(distance)
    if (time) primary.push(time)
    if (pace) primary.push(pace)
    if (elev) primary.push(elev)
    if (tss) primary.push(tss)
  }

  const used = new Set(primary.map((slot) => slot.label))
  const extra: WorkoutResultMetricSlot[] = []
  const pushExtra = (slot: WorkoutResultMetricSlot | null) => {
    if (!slot || used.has(slot.label)) return
    extra.push(slot)
    used.add(slot.label)
  }

  pushExtra(avgHr)
  if (result.maxHeartrate != null && result.maxHeartrate > 0) {
    pushExtra({
      label: 'Max HR',
      value: String(Math.round(result.maxHeartrate)),
      unit: 'bpm',
    })
  }
  if (result.averageCadence != null && result.averageCadence > 0) {
    pushExtra({
      label: 'Cadence',
      value: String(Math.round(result.averageCadence)),
      unit: workout.type === WorkoutType.BIKE ? 'rpm' : 'spm',
    })
  }
  pushExtra(calories)
  pushExtra(power)
  pushExtra(elev)
  pushExtra(tss)

  return {
    primary: primary.slice(0, 5),
    extra: extra.slice(0, 4),
  }
}
