import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { formatSwimPaceMinPer100m } from '@/lib/calculators/race-time'

/** Zone 3 = tempo pace in TrainTrack's five-zone pace model. */
export function getZone3RunPaceMinPerKm(preferences: AthletePreferences | null): number | null {
  return preferences?.paceTempoMinPerKm ?? null
}

/** Estimate swim Z3 pace (min/100 m) from run tempo pace. */
export function estimateSwimPaceFromRunZ3(paceTempoMinPerKm: number): number {
  return paceTempoMinPerKm / 2.5
}

/** Estimate bike Z3 speed (km/h) from run tempo pace. */
export function estimateBikeSpeedFromRunZ3(paceTempoMinPerKm: number): number {
  const runSpeedKmh = 60 / paceTempoMinPerKm
  return Math.round(runSpeedKmh * 2.8 * 10) / 10
}

export type CalculatorDefaults = {
  runningPace: string
  triathlonSwimPace: string
  triathlonT1: string
  triathlonBikeSpeed: string
  triathlonT2: string
  triathlonRunPace: string
}

export function buildCalculatorDefaults(
  preferences: AthletePreferences | null,
): CalculatorDefaults {
  const z3 = getZone3RunPaceMinPerKm(preferences)
  const runningPace = z3 != null ? formatPaceMinPerKm(z3) : '5:30'
  const triathlonRunPace = runningPace

  if (z3 == null) {
    return {
      runningPace,
      triathlonSwimPace: '2:00',
      triathlonT1: '3:00',
      triathlonBikeSpeed: '30',
      triathlonT2: '2:00',
      triathlonRunPace,
    }
  }

  return {
    runningPace,
    triathlonSwimPace: formatSwimPaceMinPer100m(estimateSwimPaceFromRunZ3(z3)),
    triathlonT1: '3:00',
    triathlonBikeSpeed: String(estimateBikeSpeedFromRunZ3(z3)),
    triathlonT2: '2:00',
    triathlonRunPace,
  }
}
