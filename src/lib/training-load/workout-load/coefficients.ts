import type { WorkoutType } from '@prisma/client'
import type {
  IntensityBand,
  RecoveryWeights,
  SurfaceKind,
  TerrainKind,
} from '@/lib/training-load/workout-load/types'

export const LOAD_MODEL_VERSION = 'v1' as const

/** Planning IF used for structure-derived TSS (hours × IF² × 100). */
export const INTENSITY_FACTOR: Record<IntensityBand, number> = {
  RECOVERY: 0.5,
  EASY: 0.6,
  STEADY: 0.8,
  TEMPO: 1.0,
  THRESHOLD: 1.15,
  HM_PACE: 1.1,
  MARATHON_PACE: 0.9,
  VO2: 1.35,
  SPEED: 1.5,
  SPRINT: 1.75,
}

export const CV_FACTOR: Record<IntensityBand, number> = {
  RECOVERY: 0.4,
  EASY: 0.5,
  STEADY: 0.7,
  TEMPO: 0.9,
  MARATHON_PACE: 0.85,
  HM_PACE: 1.0,
  THRESHOLD: 1.05,
  VO2: 1.25,
  SPEED: 1.0,
  SPRINT: 0.8,
}

export const MECHANICAL_INTENSITY: Record<IntensityBand, number> = {
  RECOVERY: 0.9,
  EASY: 1.0,
  STEADY: 1.02,
  TEMPO: 1.05,
  MARATHON_PACE: 1.05,
  HM_PACE: 1.08,
  THRESHOLD: 1.1,
  VO2: 1.15,
  SPEED: 1.3,
  SPRINT: 1.5,
}

export const MUSCULAR_FACTOR: Record<IntensityBand, number> = {
  RECOVERY: 0.35,
  EASY: 0.45,
  STEADY: 0.6,
  TEMPO: 0.75,
  MARATHON_PACE: 0.8,
  HM_PACE: 0.85,
  THRESHOLD: 0.9,
  VO2: 1.05,
  SPEED: 1.2,
  SPRINT: 1.4,
}

export const TERRAIN_FACTOR: Record<TerrainKind, number> = {
  FLAT: 1.0,
  ROLLING: 1.05,
  HILLY: 1.12,
  VERY_HILLY: 1.2,
}

export const SURFACE_FACTOR: Record<SurfaceKind, number> = {
  SOFT: 0.9,
  TRAIL: 0.95,
  TRACK: 1.0,
  ROAD: 1.0,
  CONCRETE: 1.05,
  TREADMILL: 0.95,
}

export const HILL_MUSCULAR_FACTOR: Record<TerrainKind, number> = {
  FLAT: 1.0,
  ROLLING: 1.05,
  HILLY: 1.15,
  VERY_HILLY: 1.25,
}

export const REFERENCE_CV_MINUTES = 90
export const REFERENCE_MECHANICAL_KM = 25
export const REFERENCE_QUALITY_MINUTES = 45

/** TSS reference for recovery composite (≈ hard 90′ session). */
export const REFERENCE_TSS = 100

export const RUNNING_RECOVERY_WEIGHTS: RecoveryWeights = {
  tss: 0.3,
  cardiovascular: 0.2,
  muscular: 0.2,
  mechanical: 0.2,
  quality: 0.1,
}

export const CYCLING_RECOVERY_WEIGHTS: RecoveryWeights = {
  tss: 0.35,
  cardiovascular: 0.3,
  muscular: 0.2,
  mechanical: 0.05,
  quality: 0.1,
}

export const SWIMMING_RECOVERY_WEIGHTS: RecoveryWeights = {
  tss: 0.3,
  cardiovascular: 0.3,
  muscular: 0.25,
  mechanical: 0.05,
  quality: 0.1,
}

export const HYROX_RECOVERY_WEIGHTS: RecoveryWeights = {
  tss: 0.25,
  cardiovascular: 0.2,
  muscular: 0.3,
  mechanical: 0.15,
  quality: 0.1,
}

export const STRENGTH_RECOVERY_WEIGHTS: RecoveryWeights = {
  tss: 0.1,
  cardiovascular: 0.1,
  muscular: 0.55,
  mechanical: 0.15,
  quality: 0.1,
}

export function recoveryWeightsForSport(sport: WorkoutType): RecoveryWeights {
  switch (sport) {
    case 'BIKE':
      return CYCLING_RECOVERY_WEIGHTS
    case 'SWIM':
      return SWIMMING_RECOVERY_WEIGHTS
    case 'HYROX':
      return HYROX_RECOVERY_WEIGHTS
    case 'STRENGTH':
      return STRENGTH_RECOVERY_WEIGHTS
    default:
      return RUNNING_RECOVERY_WEIGHTS
  }
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round0(n: number): number {
  return Math.round(n)
}
