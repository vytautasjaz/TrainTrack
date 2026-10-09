import { WorkoutType } from '@prisma/client'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import { formatElapsedClock } from '@/lib/race-legs'
import type { StravaLap, StravaSplit } from '@/lib/strava/types'

export type ActivitySplitRow = {
  index: number
  label: string
  distanceM: number
  elapsedSec: number
  avgSpeedMps: number
  avgHr: number | null
  avgWatts: number | null
}

export const LAPS_CACHE_VERSION = 5 as const

export type ActivityOverlayProfile = {
  elevationM: number[] | null
  hrBpm: number[] | null
  /** Instantaneous GPS speed (m/s), not per-split averages. */
  speedMps: number[] | null
}

export type ActivityLapsCache = {
  version: 3 | 4 | typeof LAPS_CACHE_VERSION
  fetched: true
  /** True when Strava recorded 2+ real laps (not the single auto-lap). */
  hasLaps: boolean
  laps: ActivitySplitRow[]
  splitsMetric: ActivitySplitRow[]
  profile?: ActivityOverlayProfile | null
}

function positive(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

function speedFrom(
  distanceM: number,
  elapsedSec: number,
  averageSpeed?: number,
): number {
  const fromField = positive(averageSpeed)
  if (fromField) return fromField
  if (distanceM > 0 && elapsedSec > 0) return distanceM / elapsedSec
  return 0
}

function elapsedFrom(row: { elapsed_time?: number; moving_time?: number }): number {
  const moving = positive(row.moving_time)
  const elapsed = positive(row.elapsed_time)
  return moving ?? elapsed ?? 0
}

export function normalizeStravaLaps(laps: StravaLap[]): ActivitySplitRow[] {
  return laps
    .map((lap, i) => {
      const distanceM = positive(lap.distance) ?? 0
      const elapsedSec = elapsedFrom(lap)
      const avgSpeedMps = speedFrom(distanceM, elapsedSec, lap.average_speed)
      return {
        index: i + 1,
        label: String(i + 1),
        distanceM,
        elapsedSec,
        avgSpeedMps,
        avgHr: positive(lap.average_heartrate),
        avgWatts: positive(lap.average_watts),
      }
    })
    .filter((row) => row.distanceM >= 5 && row.elapsedSec > 0 && row.avgSpeedMps > 0)
}

export function normalizeStravaSplits(splits: StravaSplit[]): ActivitySplitRow[] {
  return splits
    .map((split, i) => {
      const distanceM = positive(split.distance) ?? 0
      const elapsedSec = elapsedFrom(split)
      const avgSpeedMps = speedFrom(distanceM, elapsedSec, split.average_speed)
      return {
        index: split.split || i + 1,
        label: String(split.split || i + 1),
        distanceM,
        elapsedSec,
        avgSpeedMps,
        avgHr: positive(split.average_heartrate),
        avgWatts: null,
      }
    })
    .filter((row) => row.distanceM >= 5 && row.elapsedSec > 0 && row.avgSpeedMps > 0)
}

/** Build km (or 100 m) splits from Strava distance/time streams. */
export function splitsFromDistanceTime(
  distanceM: number[] | null | undefined,
  timeSec: number[] | null | undefined,
  splitMeters = 1000,
): ActivitySplitRow[] {
  if (!distanceM || !timeSec) return []
  const n = Math.min(distanceM.length, timeSec.length)
  if (n < 2) return []

  const rows: ActivitySplitRow[] = []
  let startD = distanceM[0]!
  let startT = timeSec[0]!
  let nextMark = startD + splitMeters
  let index = 1

  function pushSplit(endD: number, endT: number) {
    const dist = endD - startD
    const elapsed = endT - startT
    if (dist < 5 || elapsed <= 0) {
      startD = endD
      startT = endT
      return
    }
    rows.push({
      index,
      label: String(index),
      distanceM: dist,
      elapsedSec: elapsed,
      avgSpeedMps: dist / elapsed,
      avgHr: null,
      avgWatts: null,
    })
    index += 1
    startD = endD
    startT = endT
  }

  for (let i = 1; i < n; i += 1) {
    const d0 = distanceM[i - 1]!
    const d1 = distanceM[i]!
    const t0 = timeSec[i - 1]!
    const t1 = timeSec[i]!
    if (!(d1 >= nextMark)) continue
    let guard = 0
    while (d1 >= nextMark && guard < 50) {
      const span = d1 - d0
      const frac = span > 0 ? (nextMark - d0) / span : 1
      pushSplit(nextMark, t0 + (t1 - t0) * Math.min(1, Math.max(0, frac)))
      nextMark += splitMeters
      guard += 1
    }
  }

  const lastD = distanceM[n - 1]!
  const lastT = timeSec[n - 1]!
  if (lastD - startD >= splitMeters * 0.08) {
    pushSplit(lastD, lastT)
  }
  return rows
}

export function splitsFromCachedStreams(
  raw: unknown,
  splitMeters = 1000,
): ActivitySplitRow[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const obj = raw as Record<
    string,
    { time?: unknown; distance?: unknown } | null | undefined
  >
  for (const key of ['altitude', 'heartrate', 'watts'] as const) {
    const series = obj[key]
    if (!series || !Array.isArray(series.distance) || !Array.isArray(series.time)) {
      continue
    }
    const rows = splitsFromDistanceTime(
      series.distance as number[],
      series.time as number[],
      splitMeters,
    )
    if (rows.length >= 2) return rows
  }
  return []
}

export function splitIntervalMeters(sport: WorkoutType): number {
  return sport === WorkoutType.SWIM ? 100 : 1000
}

export function hasUsableLaps(laps: ActivitySplitRow[]): boolean {
  return laps.length >= 2
}

export function sampleOverlaySeries(
  values: number[] | null | undefined,
  maxPoints = 80,
): number[] | null {
  if (!values || values.length < 2) return null
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length < 2) return null
  if (finite.length <= maxPoints) return finite
  const out: number[] = []
  const step = (finite.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(finite[Math.round(i * step)]!)
  }
  return out
}

/** GPS speed from consecutive distance/time samples, lightly smoothed. */
export function instantaneousSpeedMps(
  distanceM?: number[] | null,
  timeSec?: number[] | null,
): number[] | null {
  if (!distanceM || !timeSec) return null
  const n = Math.min(distanceM.length, timeSec.length)
  if (n < 3) return null
  const raw: number[] = new Array(n)
  raw[0] = 0
  for (let i = 1; i < n; i += 1) {
    const dt = timeSec[i]! - timeSec[i - 1]!
    const dd = distanceM[i]! - distanceM[i - 1]!
    raw[i] = dt > 0.25 && dd >= 0 ? dd / dt : raw[i - 1]!
  }
  raw[0] = raw[1] ?? 0
  const out: number[] = []
  for (let i = 0; i < n; i += 1) {
    let sum = 0
    let count = 0
    for (let j = i - 2; j <= i + 2; j += 1) {
      const v = j >= 0 && j < n ? raw[j]! : 0
      if (v > 0) {
        sum += v
        count += 1
      }
    }
    out.push(count > 0 ? sum / count : 0)
  }
  return out.some((v) => v > 0.3) ? out : null
}

export function overlayProfileFromStreams(args: {
  altitudeM?: number[] | null
  heartrate?: number[] | null
  distanceM?: number[] | null
  timeSec?: number[] | null
  velocityMps?: number[] | null
}): ActivityOverlayProfile | null {
  const elevationM = sampleOverlaySeries(args.altitudeM)
  const hrBpm = sampleOverlaySeries(args.heartrate)
  const fromVelocity = sampleOverlaySeries(args.velocityMps, 120)
  const fromGps = sampleOverlaySeries(
    instantaneousSpeedMps(args.distanceM, args.timeSec),
    120,
  )
  const speedMps = fromVelocity ?? fromGps
  if (!elevationM && !hrBpm && !speedMps) return null
  return { elevationM, hrBpm, speedMps }
}

export function overlayProfileFromPackedStreams(
  raw: unknown,
): ActivityOverlayProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<
    string,
    { values?: unknown; time?: unknown; distance?: unknown } | null | undefined
  >
  const altitude = Array.isArray(obj.altitude?.values)
    ? (obj.altitude.values as number[])
    : null
  const heartrate = Array.isArray(obj.heartrate?.values)
    ? (obj.heartrate.values as number[])
    : null
  const gpsSeries = obj.altitude ?? obj.heartrate ?? obj.watts
  const distance = Array.isArray(gpsSeries?.distance)
    ? (gpsSeries.distance as number[])
    : null
  const time = Array.isArray(gpsSeries?.time)
    ? (gpsSeries.time as number[])
    : null
  return overlayProfileFromStreams({
    altitudeM: altitude,
    heartrate,
    distanceM: distance,
    timeSec: time,
  })
}

export function hasOverlayProfile(
  profile: ActivityOverlayProfile | null | undefined,
): boolean {
  return (
    (profile?.elevationM?.length ?? 0) >= 2 ||
    (profile?.hrBpm?.length ?? 0) >= 2 ||
    (profile?.speedMps?.length ?? 0) >= 2
  )
}

export function hasInstantPace(
  profile: ActivityOverlayProfile | null | undefined,
): boolean {
  return (profile?.speedMps?.length ?? 0) >= 2
}

/** Splits are ready to paint from the workout DTO. */
export function lapsChartReady(
  cache: ActivityLapsCache | null | undefined,
): boolean {
  if (!cache) return false
  return cache.hasLaps || cache.splitsMetric.length >= 2
}

function parseOverlayProfile(raw: unknown): ActivityOverlayProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as {
    elevationM?: unknown
    hrBpm?: unknown
    speedMps?: unknown
  }
  const elevationM = Array.isArray(obj.elevationM)
    ? (obj.elevationM as number[]).filter((v) => Number.isFinite(v))
    : null
  const hrBpm = Array.isArray(obj.hrBpm)
    ? (obj.hrBpm as number[]).filter((v) => Number.isFinite(v))
    : null
  const speedMps = Array.isArray(obj.speedMps)
    ? (obj.speedMps as number[]).filter((v) => Number.isFinite(v))
    : null
  const profile: ActivityOverlayProfile = {
    elevationM: elevationM && elevationM.length >= 2 ? elevationM : null,
    hrBpm: hrBpm && hrBpm.length >= 2 ? hrBpm : null,
    speedMps: speedMps && speedMps.length >= 2 ? speedMps : null,
  }
  return hasOverlayProfile(profile) ? profile : null
}

export function buildActivityLapsCache(args: {
  sport: WorkoutType
  laps: StravaLap[]
  distanceM?: number[] | null
  timeSec?: number[] | null
  altitudeM?: number[] | null
  heartrate?: number[] | null
  velocityMps?: number[] | null
  packedStreams?: unknown
}): ActivityLapsCache {
  const laps = normalizeStravaLaps(args.laps)
  const useLaps = hasUsableLaps(laps)
  const kmSplits = useLaps
    ? []
    : splitsFromDistanceTime(
        args.distanceM,
        args.timeSec,
        splitIntervalMeters(args.sport),
      )
  const profile =
    overlayProfileFromStreams({
      altitudeM: args.altitudeM,
      heartrate: args.heartrate,
      distanceM: args.distanceM,
      timeSec: args.timeSec,
      velocityMps: args.velocityMps,
    }) ?? overlayProfileFromPackedStreams(args.packedStreams)
  return {
    version: LAPS_CACHE_VERSION,
    fetched: true,
    hasLaps: useLaps,
    laps: useLaps ? laps : [],
    splitsMetric: useLaps ? [] : kmSplits,
    profile,
  }
}

export function parseLapsCache(raw: unknown): ActivityLapsCache | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as {
    version?: unknown
    fetched?: unknown
    hasLaps?: unknown
    laps?: unknown
    splitsMetric?: unknown
    profile?: unknown
  }
  if (
    (obj.version !== 3 &&
      obj.version !== 4 &&
      obj.version !== LAPS_CACHE_VERSION) ||
    obj.fetched !== true
  ) {
    return null
  }
  if (!Array.isArray(obj.laps) || !Array.isArray(obj.splitsMetric)) return null
  const laps = obj.laps as ActivitySplitRow[]
  const splitsMetric = obj.splitsMetric as ActivitySplitRow[]
  if (!hasUsableLaps(laps) && splitsMetric.length < 2) return null
  return {
    version: obj.version === 5 ? 5 : obj.version === 4 ? 4 : 3,
    fetched: true,
    hasLaps: obj.hasLaps === true || hasUsableLaps(laps),
    laps,
    splitsMetric,
    profile: parseOverlayProfile(obj.profile),
  }
}

/** True when sync already wrote a laps payload (including empty indoor). */
export function isLapsCacheRecord(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const obj = raw as { version?: unknown; fetched?: unknown }
  return (
    obj.fetched === true &&
    (obj.version === 3 || obj.version === 4 || obj.version === LAPS_CACHE_VERSION)
  )
}

export function formatSplitDistance(meters: number, sport: WorkoutType): string {
  if (sport === WorkoutType.SWIM) {
    return `${Math.round(meters)} m`
  }
  if (meters >= 950) {
    const km = meters / 1000
    const rounded = Math.round(km * 100) / 100
    return `${rounded % 1 === 0 ? rounded : rounded.toFixed(2)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatSplitPaceOrSpeed(
  sport: WorkoutType,
  speedMps: number,
): { value: string; unit: string } {
  if (sport === WorkoutType.BIKE) {
    const kph = speedMps * 3.6
    return {
      value: kph >= 10 ? kph.toFixed(1) : kph.toFixed(2),
      unit: 'km/h',
    }
  }
  if (sport === WorkoutType.SWIM) {
    const minPer100 = speedMps > 0 ? 100 / speedMps / 60 : 0
    return { value: formatPaceMinPerKm(minPer100) || '—', unit: '/100m' }
  }
  const minPerKm = speedMps > 0 ? 1000 / speedMps / 60 : 0
  return { value: formatPaceMinPerKm(minPerKm) || '—', unit: '/km' }
}

export function formatSplitElapsed(seconds: number): string {
  return formatElapsedClock(seconds)
}

export function splitRateLabel(sport: WorkoutType): string {
  if (sport === WorkoutType.BIKE) return 'Avg speed'
  return 'Avg pace'
}
