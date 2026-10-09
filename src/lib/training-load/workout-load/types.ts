import type { SessionType, WorkoutType } from '@prisma/client'
import type { WorkoutStructure } from '@/lib/workout-builder/types'

/** Planning intensity bands used by the v1 load model. */
export type IntensityBand =
  | 'RECOVERY'
  | 'EASY'
  | 'STEADY'
  | 'TEMPO'
  | 'THRESHOLD'
  | 'HM_PACE'
  | 'MARATHON_PACE'
  | 'VO2'
  | 'SPEED'
  | 'SPRINT'

export type SurfaceKind =
  | 'SOFT'
  | 'TRAIL'
  | 'TRACK'
  | 'ROAD'
  | 'CONCRETE'
  | 'TREADMILL'

export type TerrainKind = 'FLAT' | 'ROLLING' | 'HILLY' | 'VERY_HILLY'

export type LoadCategory =
  | 'VERY_LOW'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'VERY_HIGH'

export type RawWorkoutFeatures = {
  durationMin: number
  distanceKm: number

  easyMin: number
  recoveryMin: number
  steadyMin: number
  tempoMin: number
  thresholdMin: number
  vo2Min: number
  speedMin: number
  sprintMin: number
  racePaceMin: number
  /** Marathon-pace minutes (subset of race-pace for quality scoring). */
  marathonPaceMin: number
  hmPaceMin: number

  easyKm: number
  recoveryKm: number
  steadyKm: number
  tempoKm: number
  thresholdKm: number
  vo2Km: number
  speedKm: number
  racePaceKm: number

  elevationGainM: number
  elevationLossM: number

  repetitions: number
  accelerations: number
  strides: number
  hillRepetitions: number

  strengthVolume: number
  jumps: number

  surfaceFactor: number
  terrainFactor: number

  sport: WorkoutType
  sessionType: SessionType
  raceSpecific: boolean
}

export type WorkoutLoad = {
  /** Quantitative training stress (additive). */
  tss: number

  /** Derived dimensions, normalized 0–100 planning scores. */
  cardiovascularLoad: number
  muscularLoad: number
  mechanicalLoad: number
  qualityLoad: number

  /** Composite recovery requirement, 0–100. */
  recoveryDemand: number

  loadCategory: LoadCategory
  isQualitySession: boolean
  isHighLoad: boolean

  /** Raw values retained for calibration / weekly aggregation. */
  rawCardiovascularLoad: number
  rawMuscularLoad: number
  rawMechanicalLoad: number
  rawQualityLoad: number

  loadModelVersion: 'v1'
  features: RawWorkoutFeatures
}

export type AthleteLoadProfile = {
  restingHr?: number | null
  thresholdHr?: number | null
  /** Completed-workout average HR when available. */
  avgHr?: number | null
  surface?: SurfaceKind | null
  terrain?: TerrainKind | null
  elevationGainM?: number | null
  elevationLossM?: number | null
  /** Athlete baseline for relative mechanical normalization (weekly raw). */
  typicalWeeklyMechanicalRaw?: number | null
  /** Reference distance (km) for mechanical normalization; default 25. */
  referenceMechanicalDistanceKm?: number | null
}

export type WorkoutLoadInput = {
  structure?: WorkoutStructure | null
  sport: WorkoutType
  sessionType: SessionType
  plannedDurationMin?: number | null
  plannedDistanceKm?: number | null
  tags?: string[] | null
  title?: string | null
  athlete?: AthleteLoadProfile | null
}

export type RecoveryWeights = {
  tss: number
  cardiovascular: number
  muscular: number
  mechanical: number
  quality: number
}
