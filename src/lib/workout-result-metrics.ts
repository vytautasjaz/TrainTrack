import { WorkoutType } from '@prisma/client'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  estimateSessionLoad,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import { formatDistance } from '@/lib/utils'

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

function paceOrSpeed(workout: PlanWorkoutDetail): WorkoutResultMetricSlot | null {
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
      value: kph >= 10 ? kph.toFixed(1) : kph.toFixed(2),
      unit: 'km/h',
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
    const pace = formatPaceMinPerKm(durationMin / (distanceKm * 10))
    if (!pace) return null
    return { label: 'Avg pace', value: pace, unit: '/100m' }
  }

  const pace = formatPaceMinPerKm(durationMin / distanceKm)
  if (!pace) return null
  return { label: 'Avg pace', value: pace, unit: '/km' }
}

function distanceSlot(workout: PlanWorkoutDetail): WorkoutResultMetricSlot | null {
  const result = workout.result
  if (workout.type === WorkoutType.SWIM && result?.actualDistance != null && result.actualDistance > 0) {
    return {
      label: 'Distance',
      value: String(Math.round(result.actualDistance * 1000)),
      unit: 'm',
    }
  }
  if (result?.actualDistance != null && result.actualDistance > 0) {
    const formatted = formatDistance(result.actualDistance)
    if (!formatted || formatted === '—') return null
    const match = formatted.trim().match(/^(.+?)\s+(km|m)$/i)
    if (match) {
      return { label: 'Distance', value: match[1]!, unit: match[2]!.toLowerCase() }
    }
    return { label: 'Distance', value: formatted }
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
): { primary: WorkoutResultMetricSlot[]; extra: WorkoutResultMetricSlot[] } {
  const result = workout.result
  if (!result) return { primary: [], extra: [] }

  const distance = distanceSlot(workout)
  const time =
    result.actualDuration != null && result.actualDuration > 0
      ? { label: 'Time', value: formatClock(result.actualDuration) }
      : null
  const pace = paceOrSpeed(workout)
  const watts =
    result.weightedAverageWatts ?? result.averageWatts ?? null
  const power =
    watts != null && watts > 0
      ? { label: 'Avg power', value: String(Math.round(watts)), unit: 'W' }
      : null
  const elev =
    result.elevationGainM != null && result.elevationGainM >= 1
      ? {
          label: 'Elev gain',
          value: String(Math.round(result.elevationGainM)),
          unit: 'm',
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
