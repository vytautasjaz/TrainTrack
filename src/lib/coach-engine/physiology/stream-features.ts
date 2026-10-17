/**
 * Stage K — derive APM signals from Strava packed streams (HR drift, pace@HR).
 * Spec: docs/ai-coach-engine/athlete-physiology-model.md § Phase III
 */

import { clamp, clamp01, avg } from './envelope'

export type PackedStreamSeries = {
  values: number[]
  time: number[]
  distance?: number[] | null
} | null

export type PackedStreamsCache = {
  heartrate?: PackedStreamSeries
  watts?: PackedStreamSeries
  altitude?: PackedStreamSeries
  velocity_smooth?: PackedStreamSeries
}

export type SessionStreamFeatures = {
  /** % HR rise second half vs first (positive = drift). */
  hrDriftPct: number | null
  /** Mean pace min/km while HR in [bandLow, bandHigh]. */
  paceAtHrMinPerKm: number | null
  hrBandBpm: { low: number; high: number } | null
  /** Second-half vs first-half pace decay % (positive = slowing). */
  latePaceDecayPct: number | null
  sampleCount: number
}

export type AggregatedStreamFeatures = {
  sessionCount: number
  withHrCount: number
  meanHrDriftPct: number | null
  meanPaceAtHrMinPerKm: number | null
  meanLatePaceDecayPct: number | null
  /** 0–100 aerobic efficiency from pace@HR (+ low drift). */
  aerobicEfficiencyScore: number | null
  /** 0–100 late-run fatigue resistance (inverse of pace decay + drift). */
  lateRunResistanceScore: number | null
  confidence: number
}

function isPacked(series: unknown): series is NonNullable<PackedStreamSeries> {
  if (!series || typeof series !== 'object') return false
  const s = series as PackedStreamSeries
  return Boolean(
    s &&
      Array.isArray(s.values) &&
      Array.isArray(s.time) &&
      s.values.length >= 8 &&
      s.values.length === s.time.length,
  )
}

function meanSlice(values: number[], start: number, end: number): number | null {
  if (end <= start) return null
  const slice = values.slice(start, end).filter((v) => Number.isFinite(v) && v > 0)
  if (slice.length < 3) return null
  return avg(slice)
}

/** Pace min/km from consecutive distance (m) + time (s) samples. */
function paceSeriesMinPerKm(
  distanceM: number[],
  timeSec: number[],
): (number | null)[] {
  const out: (number | null)[] = new Array(distanceM.length).fill(null)
  for (let i = 1; i < distanceM.length; i += 1) {
    const dM = distanceM[i]! - distanceM[i - 1]!
    const dt = timeSec[i]! - timeSec[i - 1]!
    if (dM < 5 || dt <= 0) continue
    const km = dM / 1000
    const min = dt / 60
    const pace = min / km
    if (pace >= 2.5 && pace <= 12) out[i] = pace
  }
  return out
}

/**
 * Extract per-session features from WorkoutResult.stravaStreamsCache JSON.
 */
export function extractSessionStreamFeatures(
  cache: unknown,
  opts?: { hrBandLow?: number; hrBandHigh?: number },
): SessionStreamFeatures | null {
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return null
  const obj = cache as PackedStreamsCache
  const hr = obj.heartrate
  if (!isPacked(hr)) return null

  const n = hr.values.length
  const mid = Math.floor(n / 2)
  const firstHr = meanSlice(hr.values, 0, mid)
  const secondHr = meanSlice(hr.values, mid, n)
  let hrDriftPct: number | null = null
  if (firstHr != null && secondHr != null && firstHr > 80) {
    hrDriftPct = Math.round(((secondHr - firstHr) / firstHr) * 1000) / 10
  }

  const bandLow = opts?.hrBandLow ?? 130
  const bandHigh = opts?.hrBandHigh ?? 150
  let paceAtHrMinPerKm: number | null = null
  let latePaceDecayPct: number | null = null

  const distance = isPacked(obj.altitude) ? obj.altitude.distance : null
  // Prefer altitude companion distance; else any packed series distance.
  const dist =
    (Array.isArray(distance) && distance.length === n ? distance : null) ??
    (isPacked(obj.watts) && Array.isArray(obj.watts.distance)
      ? obj.watts.distance
      : null)

  if (dist && dist.length === n) {
    const paces = paceSeriesMinPerKm(dist, hr.time)
    const matched: number[] = []
    for (let i = 0; i < n; i += 1) {
      const bpm = hr.values[i]!
      const pace = paces[i]
      if (pace == null) continue
      if (bpm >= bandLow && bpm <= bandHigh) matched.push(pace)
    }
    if (matched.length >= 5) {
      paceAtHrMinPerKm = Math.round(avg(matched) * 100) / 100
    }

    const firstPaces = paces
      .slice(0, mid)
      .filter((p): p is number => p != null)
    const secondPaces = paces
      .slice(mid)
      .filter((p): p is number => p != null)
    const p1 = firstPaces.length >= 3 ? avg(firstPaces) : null
    const p2 = secondPaces.length >= 3 ? avg(secondPaces) : null
    if (p1 != null && p2 != null && p1 > 0) {
      // Higher min/km = slower → positive decay.
      latePaceDecayPct = Math.round(((p2 - p1) / p1) * 1000) / 10
    }
  }

  return {
    hrDriftPct,
    paceAtHrMinPerKm,
    hrBandBpm: { low: bandLow, high: bandHigh },
    latePaceDecayPct,
    sampleCount: n,
  }
}

/**
 * Aggregate recent session stream features into APM-ready scores.
 */
export function aggregateStreamFeatures(
  sessions: SessionStreamFeatures[],
): AggregatedStreamFeatures {
  const withHr = sessions.filter((s) => s.hrDriftPct != null || s.paceAtHrMinPerKm != null)
  if (!withHr.length) {
    return {
      sessionCount: sessions.length,
      withHrCount: 0,
      meanHrDriftPct: null,
      meanPaceAtHrMinPerKm: null,
      meanLatePaceDecayPct: null,
      aerobicEfficiencyScore: null,
      lateRunResistanceScore: null,
      confidence: 0,
    }
  }

  const drifts = withHr
    .map((s) => s.hrDriftPct)
    .filter((v): v is number => v != null)
  const paces = withHr
    .map((s) => s.paceAtHrMinPerKm)
    .filter((v): v is number => v != null)
  const decays = withHr
    .map((s) => s.latePaceDecayPct)
    .filter((v): v is number => v != null)

  const meanHrDriftPct = drifts.length ? avg(drifts) : null
  const meanPaceAtHrMinPerKm = paces.length ? avg(paces) : null
  const meanLatePaceDecayPct = decays.length ? avg(decays) : null

  // Pace@HR: faster (lower min/km) at same band → higher efficiency.
  // Anchor ~5:45/km @ 130–150 as mid; 4:45 elite-ish; 7:00 weak.
  let aerobicEfficiencyScore: number | null = null
  if (meanPaceAtHrMinPerKm != null) {
    const paceScore = clamp(100 - (meanPaceAtHrMinPerKm - 4.5) * 28, 15, 95)
    const driftPenalty =
      meanHrDriftPct != null ? clamp(meanHrDriftPct * 1.5, 0, 25) : 8
    aerobicEfficiencyScore = clamp(paceScore - driftPenalty, 10, 100)
  } else if (meanHrDriftPct != null) {
    // Drift-only proxy: low drift ≈ better aerobic control.
    aerobicEfficiencyScore = clamp(72 - meanHrDriftPct * 2.2, 20, 90)
  }

  let lateRunResistanceScore: number | null = null
  if (meanLatePaceDecayPct != null || meanHrDriftPct != null) {
    const decay = meanLatePaceDecayPct ?? 4
    const drift = meanHrDriftPct ?? 5
    lateRunResistanceScore = clamp(80 - decay * 3.5 - drift * 1.8, 15, 100)
  }

  const confidence = clamp01(0.25 + withHr.length * 0.12 + (paces.length > 0 ? 0.15 : 0))

  return {
    sessionCount: sessions.length,
    withHrCount: withHr.length,
    meanHrDriftPct:
      meanHrDriftPct != null ? Math.round(meanHrDriftPct * 10) / 10 : null,
    meanPaceAtHrMinPerKm:
      meanPaceAtHrMinPerKm != null
        ? Math.round(meanPaceAtHrMinPerKm * 100) / 100
        : null,
    meanLatePaceDecayPct:
      meanLatePaceDecayPct != null
        ? Math.round(meanLatePaceDecayPct * 10) / 10
        : null,
    aerobicEfficiencyScore:
      aerobicEfficiencyScore != null
        ? Math.round(aerobicEfficiencyScore * 10) / 10
        : null,
    lateRunResistanceScore:
      lateRunResistanceScore != null
        ? Math.round(lateRunResistanceScore * 10) / 10
        : null,
    confidence: Math.round(confidence * 100) / 100,
  }
}
