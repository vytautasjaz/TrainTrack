import type { IntensityBand } from '@/lib/training-load/workout-load/types'
import {
  CV_FACTOR,
  HILL_MUSCULAR_FACTOR,
  INTENSITY_FACTOR,
  LOAD_MODEL_VERSION,
  MECHANICAL_INTENSITY,
  MUSCULAR_FACTOR,
  REFERENCE_CV_MINUTES,
  REFERENCE_MECHANICAL_KM,
  REFERENCE_QUALITY_MINUTES,
  REFERENCE_TSS,
  clamp,
  recoveryWeightsForSport,
  round0,
  round1,
} from '@/lib/training-load/workout-load/coefficients'
import { extractRawFeatures } from '@/lib/training-load/workout-load/extract-features'
import type {
  AthleteLoadProfile,
  LoadCategory,
  RawWorkoutFeatures,
  TerrainKind,
  WorkoutLoad,
  WorkoutLoadInput,
} from '@/lib/training-load/workout-load/types'

const BANDS: IntensityBand[] = [
  'RECOVERY',
  'EASY',
  'STEADY',
  'TEMPO',
  'THRESHOLD',
  'HM_PACE',
  'MARATHON_PACE',
  'VO2',
  'SPEED',
  'SPRINT',
]

function minutesByBand(raw: RawWorkoutFeatures): Record<IntensityBand, number> {
  return {
    RECOVERY: raw.recoveryMin,
    EASY: raw.easyMin,
    STEADY: raw.steadyMin,
    TEMPO: raw.tempoMin,
    THRESHOLD: raw.thresholdMin,
    HM_PACE: raw.hmPaceMin,
    MARATHON_PACE: raw.marathonPaceMin,
    VO2: raw.vo2Min,
    SPEED: raw.speedMin,
    SPRINT: raw.sprintMin,
  }
}

function kmByBand(raw: RawWorkoutFeatures): Record<IntensityBand, number> {
  const raceTotal = raw.hmPaceMin + raw.marathonPaceMin
  const hmShare = raceTotal > 0 ? raw.hmPaceMin / raceTotal : 0.5
  const speedTotal = raw.speedMin + raw.sprintMin
  const speedShare = speedTotal > 0 ? raw.speedMin / speedTotal : 1
  return {
    RECOVERY: raw.recoveryKm,
    EASY: raw.easyKm,
    STEADY: raw.steadyKm,
    TEMPO: raw.tempoKm,
    THRESHOLD: raw.thresholdKm,
    HM_PACE: raw.racePaceKm * hmShare,
    MARATHON_PACE: raw.racePaceKm * (1 - hmShare),
    VO2: raw.vo2Km,
    SPEED: raw.speedKm * speedShare,
    SPRINT: raw.speedKm * (1 - speedShare),
  }
}

export function calculateTSS(raw: RawWorkoutFeatures): number {
  let tss = 0
  const mins = minutesByBand(raw)
  for (const band of BANDS) {
    const hours = mins[band] / 60
    if (hours <= 0) continue
    const ifactor = INTENSITY_FACTOR[band]
    tss += hours * ifactor * ifactor * 100
  }
  return round1(tss)
}

export function calculateCardiovascularLoad(
  raw: RawWorkoutFeatures,
  athlete?: AthleteLoadProfile | null,
): { load: number; raw: number } {
  const mins = minutesByBand(raw)
  let structureCV = 0
  for (const band of BANDS) {
    structureCV += mins[band] * CV_FACTOR[band]
  }

  let cv = structureCV
  const resting = athlete?.restingHr
  const threshold = athlete?.thresholdHr
  const avg = athlete?.avgHr
  if (
    resting != null &&
    threshold != null &&
    avg != null &&
    threshold > resting &&
    avg > 0
  ) {
    const hrIntensity = clamp((avg - resting) / (threshold - resting), 0, 1.2)
    const hrBasedCV = raw.durationMin * hrIntensity
    cv = 0.7 * structureCV + 0.3 * hrBasedCV
  }

  const load = clamp((cv / REFERENCE_CV_MINUTES) * 100, 0, 100)
  return { load: round0(load), raw: round1(cv) }
}

function terrainKind(raw: RawWorkoutFeatures, athlete?: AthleteLoadProfile | null): TerrainKind {
  if (athlete?.terrain) return athlete.terrain
  const distM = Math.max(1, raw.distanceKm * 1000)
  const gain = raw.elevationGainM
  const ratio = gain / distM
  if (ratio >= 0.04) return 'VERY_HILLY'
  if (ratio >= 0.025) return 'HILLY'
  if (ratio >= 0.012) return 'ROLLING'
  return 'FLAT'
}

export function calculateMechanicalLoad(
  raw: RawWorkoutFeatures,
  athlete?: AthleteLoadProfile | null,
): { load: number; raw: number } {
  const kms = kmByBand(raw)
  let base = 0
  for (const band of BANDS) {
    base += kms[band] * MECHANICAL_INTENSITY[band]
  }

  const distM = Math.max(1, raw.distanceKm * 1000)
  const elevFactor = clamp(
    1 +
      (raw.elevationGainM / distM) * 2 +
      (raw.elevationLossM / distM) * 2,
    1,
    1.25,
  )
  const downhillFactor =
    1 +
    Math.min(
      raw.distanceKm > 0 ? raw.elevationLossM / raw.distanceKm / 100 : 0,
      0.2,
    )
  const terrain = raw.terrainFactor || 1
  const surface = raw.surfaceFactor || 1
  const accelerationLoad =
    raw.accelerations * 0.25 + raw.hillRepetitions * 0.5

  const mechanicalRaw =
    base * surface * terrain * elevFactor * downhillFactor + accelerationLoad

  const ref =
    athlete?.referenceMechanicalDistanceKm &&
    athlete.referenceMechanicalDistanceKm > 0
      ? athlete.referenceMechanicalDistanceKm
      : REFERENCE_MECHANICAL_KM

  const load = clamp((mechanicalRaw / ref) * 100, 0, 100)
  return { load: round0(load), raw: round1(mechanicalRaw) }
}

function durationMuscularFactor(durationMin: number): number {
  if (durationMin <= 75) return 1
  if (durationMin <= 120) return 1.05
  if (durationMin <= 150) return 1.1
  return 1.15
}

export function calculateMuscularLoad(
  raw: RawWorkoutFeatures,
  athlete?: AthleteLoadProfile | null,
): { load: number; raw: number } {
  const mins = minutesByBand(raw)
  let base = 0
  for (const band of BANDS) {
    base += mins[band] * MUSCULAR_FACTOR[band]
  }

  const terrain = terrainKind(raw, athlete)
  base *= HILL_MUSCULAR_FACTOR[terrain]
  base *= durationMuscularFactor(raw.durationMin)
  base += raw.strengthVolume * 0.5
  base += raw.jumps * 0.3
  base += raw.hillRepetitions * 1.2

  // Normalize vs ~90 min easy muscular stress (~40.5 raw).
  const load = clamp((base / 55) * 100, 0, 100)
  return { load: round0(load), raw: round1(base) }
}

export function calculateQualityLoad(
  raw: RawWorkoutFeatures,
): { load: number; raw: number } {
  const qualityStress =
    raw.tempoMin * 0.5 +
    raw.hmPaceMin * 0.8 +
    raw.marathonPaceMin * 0.7 +
    raw.thresholdMin * 1.0 +
    raw.vo2Min * 1.25 +
    raw.speedMin * 1.3 +
    raw.sprintMin * 1.5

  let qualityLoad = clamp(
    (qualityStress / REFERENCE_QUALITY_MINUTES) * 100,
    0,
    100,
  )

  const qualityMinutes =
    raw.tempoMin +
    raw.hmPaceMin +
    raw.marathonPaceMin +
    raw.thresholdMin +
    raw.vo2Min +
    raw.speedMin +
    raw.sprintMin
  const qualityRatio =
    raw.durationMin > 0 ? clamp(qualityMinutes / raw.durationMin, 0, 1) : 0
  qualityLoad *= 0.7 + 0.3 * qualityRatio

  if (raw.raceSpecific && qualityMinutes > 0) {
    qualityLoad *= 1.1
  }

  return {
    load: round0(clamp(qualityLoad, 0, 100)),
    raw: round1(qualityStress),
  }
}

export function calculateRecoveryDemand(args: {
  tss: number
  cardiovascularLoad: number
  muscularLoad: number
  mechanicalLoad: number
  qualityLoad: number
  sport: RawWorkoutFeatures['sport']
}): number {
  const weights = recoveryWeightsForSport(args.sport)
  const normalizedTss = clamp((args.tss / REFERENCE_TSS) * 100, 0, 150)
  const recoveryRaw =
    weights.tss * normalizedTss +
    weights.cardiovascular * args.cardiovascularLoad +
    weights.muscular * args.muscularLoad +
    weights.mechanical * args.mechanicalLoad +
    weights.quality * args.qualityLoad
  return round0(clamp(recoveryRaw, 0, 100))
}

export function loadCategoryFromRecovery(recoveryDemand: number): LoadCategory {
  if (recoveryDemand < 25) return 'VERY_LOW'
  if (recoveryDemand < 45) return 'LOW'
  if (recoveryDemand < 65) return 'MODERATE'
  if (recoveryDemand < 80) return 'HIGH'
  return 'VERY_HIGH'
}

export function isQualitySession(args: {
  qualityLoad: number
  features: RawWorkoutFeatures
}): boolean {
  if (args.qualityLoad >= 40) return true
  const f = args.features
  return (
    f.tempoMin +
      f.thresholdMin +
      f.hmPaceMin +
      f.marathonPaceMin +
      f.vo2Min +
      f.speedMin >
    0
  )
}

export function isHighLoadDay(args: {
  recoveryDemand: number
  mechanicalLoad: number
  qualityLoad: number
  tss: number
  athleteTypicalDailyTss?: number | null
}): boolean {
  const tssThreshold = args.athleteTypicalDailyTss
    ? args.athleteTypicalDailyTss * 1.15
    : 70
  return (
    args.tss >= tssThreshold ||
    args.mechanicalLoad >= 70 ||
    args.recoveryDemand >= 70 ||
    args.qualityLoad >= 70
  )
}

/**
 * Deterministic multidimensional load from workout structure + athlete profile.
 */
export function calculateWorkoutLoad(input: WorkoutLoadInput): WorkoutLoad {
  const features = extractRawFeatures(input)
  return calculateWorkoutLoadFromFeatures(features, input.athlete)
}

export function calculateWorkoutLoadFromFeatures(
  features: RawWorkoutFeatures,
  athlete?: AthleteLoadProfile | null,
): WorkoutLoad {
  const tss = calculateTSS(features)
  const cv = calculateCardiovascularLoad(features, athlete)
  const muscular = calculateMuscularLoad(features, athlete)
  const mechanical = calculateMechanicalLoad(features, athlete)
  const quality = calculateQualityLoad(features)
  const recoveryDemand = calculateRecoveryDemand({
    tss,
    cardiovascularLoad: cv.load,
    muscularLoad: muscular.load,
    mechanicalLoad: mechanical.load,
    qualityLoad: quality.load,
    sport: features.sport,
  })

  return {
    tss,
    cardiovascularLoad: cv.load,
    muscularLoad: muscular.load,
    mechanicalLoad: mechanical.load,
    qualityLoad: quality.load,
    recoveryDemand,
    loadCategory: loadCategoryFromRecovery(recoveryDemand),
    isQualitySession: isQualitySession({
      qualityLoad: quality.load,
      features,
    }),
    isHighLoad: isHighLoadDay({
      recoveryDemand,
      mechanicalLoad: mechanical.load,
      qualityLoad: quality.load,
      tss,
    }),
    rawCardiovascularLoad: cv.raw,
    rawMuscularLoad: muscular.raw,
    rawMechanicalLoad: mechanical.raw,
    rawQualityLoad: quality.raw,
    loadModelVersion: LOAD_MODEL_VERSION,
    features,
  }
}
