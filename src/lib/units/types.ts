import type {
  SwimDistanceUnit as PrismaSwimDistanceUnit,
  UnitSystem as PrismaUnitSystem,
} from '@prisma/client'

export type UnitSystem = PrismaUnitSystem
export type SwimDistanceUnit = PrismaSwimDistanceUnit

export const DEFAULT_UNIT_SYSTEM: UnitSystem = 'METRIC'
export const DEFAULT_SWIM_DISTANCE_UNIT: SwimDistanceUnit = 'METERS'

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === 'METRIC' || value === 'IMPERIAL'
}

export function normalizeUnitSystem(value: unknown): UnitSystem {
  return isUnitSystem(value) ? value : DEFAULT_UNIT_SYSTEM
}

export function isSwimDistanceUnit(value: unknown): value is SwimDistanceUnit {
  return value === 'METERS' || value === 'YARDS'
}

export function normalizeSwimDistanceUnit(value: unknown): SwimDistanceUnit {
  return isSwimDistanceUnit(value) ? value : DEFAULT_SWIM_DISTANCE_UNIT
}

/** Prefs that affect auto-split length on Strava import. */
export type SplitUnitPrefs = {
  unitSystem?: UnitSystem | null
  swimDistanceUnit?: SwimDistanceUnit | null
}
