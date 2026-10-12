import { WorkoutType } from '@prisma/client'
import {
  METERS_PER_100_YARDS,
  METERS_PER_MILE,
} from '@/lib/units/convert'
import {
  DEFAULT_SWIM_DISTANCE_UNIT,
  DEFAULT_UNIT_SYSTEM,
  type SplitUnitPrefs,
} from '@/lib/units/types'

/**
 * Auto-split length for stream-derived laps when Strava has no manual laps.
 * Run/bike: 1 km or 1 mi. Swim: 100 m or 100 yd.
 * Only used when building new caches (import / missing cache) — never rewrite existing.
 */
export function splitIntervalMeters(
  sport: WorkoutType,
  prefs: SplitUnitPrefs = {},
): number {
  const unitSystem = prefs.unitSystem ?? DEFAULT_UNIT_SYSTEM
  const swimUnit = prefs.swimDistanceUnit ?? DEFAULT_SWIM_DISTANCE_UNIT

  if (sport === WorkoutType.SWIM) {
    return swimUnit === 'YARDS' ? METERS_PER_100_YARDS : 100
  }

  return unitSystem === 'IMPERIAL' ? METERS_PER_MILE : 1000
}
