import type { AthletePreferences } from '@/lib/athlete-preferences'

/** Who a reusable training plan is written for (catalog metadata + estimate defaults). */
export const TRAINING_PLAN_ATHLETE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'elite',
] as const

export type TrainingPlanAthleteLevel =
  (typeof TRAINING_PLAN_ATHLETE_LEVELS)[number]

export const TRAINING_PLAN_ATHLETE_LEVEL_LABELS: Record<
  TrainingPlanAthleteLevel,
  string
> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
}

export function parseTrainingPlanAthleteLevel(
  raw: string | null | undefined,
): TrainingPlanAthleteLevel | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return (TRAINING_PLAN_ATHLETE_LEVELS as readonly string[]).includes(v)
    ? (v as TrainingPlanAthleteLevel)
    : null
}

/**
 * Default run paces (min/km), bike speeds (km/h), FTP, and swim CSS for each
 * athlete level — used for approximate distance/time on the plan canvas when
 * no specific athlete is linked.
 */
export const TRAINING_PLAN_LEVEL_PREFERENCES: Record<
  TrainingPlanAthleteLevel,
  AthletePreferences
> = {
  beginner: {
    paceRecoveryMinPerKm: 7.0,
    paceEasyMinPerKm: 6.5,
    paceTempoMinPerKm: 5.75,
    paceThresholdMinPerKm: 5.333,
    paceVo2MaxMinPerKm: 4.667,
    bikeSpeedRecoveryKph: 20,
    bikeSpeedEasyKph: 24,
    bikeSpeedTempoKph: 27,
    bikeSpeedThresholdKph: 29,
    bikeSpeedVo2MaxKph: 32,
    bikeFtpWatts: 180,
    swimCssSecPer100m: 105,
  },
  intermediate: {
    paceRecoveryMinPerKm: 6.5,
    paceEasyMinPerKm: 5.75,
    paceTempoMinPerKm: 5.0,
    paceThresholdMinPerKm: 4.5,
    paceVo2MaxMinPerKm: 3.75,
    bikeSpeedRecoveryKph: 22,
    bikeSpeedEasyKph: 26,
    bikeSpeedTempoKph: 30,
    bikeSpeedThresholdKph: 32,
    bikeSpeedVo2MaxKph: 35,
    bikeFtpWatts: 220,
    swimCssSecPer100m: 95,
  },
  advanced: {
    paceRecoveryMinPerKm: 5.75,
    paceEasyMinPerKm: 5.25,
    paceTempoMinPerKm: 4.5,
    paceThresholdMinPerKm: 4.0,
    paceVo2MaxMinPerKm: 3.333,
    bikeSpeedRecoveryKph: 24,
    bikeSpeedEasyKph: 28,
    bikeSpeedTempoKph: 32,
    bikeSpeedThresholdKph: 35,
    bikeSpeedVo2MaxKph: 40,
    bikeFtpWatts: 280,
    swimCssSecPer100m: 85,
  },
  elite: {
    paceRecoveryMinPerKm: 5.25,
    paceEasyMinPerKm: 4.75,
    paceTempoMinPerKm: 4.083,
    paceThresholdMinPerKm: 3.583,
    paceVo2MaxMinPerKm: 3.0,
    bikeSpeedRecoveryKph: 26,
    bikeSpeedEasyKph: 30,
    bikeSpeedTempoKph: 34,
    bikeSpeedThresholdKph: 38,
    bikeSpeedVo2MaxKph: 44,
    bikeFtpWatts: 320,
    swimCssSecPer100m: 78,
  },
}

export function preferencesForTrainingPlanLevel(
  level: string | null | undefined,
): AthletePreferences | null {
  const parsed = parseTrainingPlanAthleteLevel(level)
  if (!parsed) return null
  return { ...TRAINING_PLAN_LEVEL_PREFERENCES[parsed] }
}
