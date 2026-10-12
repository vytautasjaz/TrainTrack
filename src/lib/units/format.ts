import type { SwimDistanceUnit, UnitSystem } from '@/lib/units/types'
import {
  DEFAULT_SWIM_DISTANCE_UNIT,
  DEFAULT_UNIT_SYSTEM,
} from '@/lib/units/types'
import {
  kmToMi,
  kphToMph,
  minPerKmToMinPerMi,
  mToFt,
  mToYd,
  pacePer100mToPer100yd,
} from '@/lib/units/convert'

function formatClockPace(minPerUnit: number): string {
  if (!Number.isFinite(minPerUnit) || minPerUnit <= 0) return ''
  const totalSecs = Math.round(minPerUnit * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatQuantity(n: number, decimals: number): string {
  if (decimals <= 0) return String(Math.round(n))
  const fixed = n.toFixed(decimals)
  return fixed.replace(/\.?0+$/, '')
}

/** Format stored km for display. Swim meters should use formatSwimMeters. */
export function formatDistanceKm(
  km: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): string {
  if (km == null || km <= 0) return '—'
  if (system === 'IMPERIAL') {
    const mi = kmToMi(km)
    return `${mi % 1 === 0 ? mi : formatQuantity(mi, 1)} mi`
  }
  return `${km % 1 === 0 ? km : formatQuantity(km, 1)} km`
}

/** Numeric distance only (no unit suffix) — for metric cards / slots. */
export function formatDistanceValue(
  km: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): { value: string; unit: string } | null {
  if (km == null || km <= 0) return null
  if (system === 'IMPERIAL') {
    const mi = kmToMi(km)
    return {
      value: mi % 1 === 0 ? String(mi) : formatQuantity(mi, 1),
      unit: 'mi',
    }
  }
  return {
    value: km % 1 === 0 ? String(km) : formatQuantity(km, 1),
    unit: 'km',
  }
}

/** Pace from stored min/km. Swim /100m stays metric via formatSwimPace. */
export function formatPace(
  minPerKm: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
  opts?: { withUnit?: boolean },
): string {
  if (minPerKm == null || minPerKm <= 0) return ''
  const withUnit = opts?.withUnit !== false
  if (system === 'IMPERIAL') {
    const clock = formatClockPace(minPerKmToMinPerMi(minPerKm))
    return withUnit ? `${clock}/mi` : clock
  }
  const clock = formatClockPace(minPerKm)
  return withUnit ? `${clock}/km` : clock
}

export function formatPaceUnit(system: UnitSystem = DEFAULT_UNIT_SYSTEM): string {
  return system === 'IMPERIAL' ? '/mi' : '/km'
}

export function formatSpeedKph(
  kph: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
  opts?: { withUnit?: boolean },
): string {
  if (kph == null || !Number.isFinite(kph) || kph <= 0) return ''
  const withUnit = opts?.withUnit !== false
  if (system === 'IMPERIAL') {
    const mph = kphToMph(kph)
    const value = mph >= 10 ? mph.toFixed(1) : formatQuantity(mph, 2)
    return withUnit ? `${value} mph` : value
  }
  const value = kph >= 10 ? kph.toFixed(1) : formatQuantity(kph, 2)
  return withUnit ? `${value} km/h` : value
}

export function formatSpeedUnit(system: UnitSystem = DEFAULT_UNIT_SYSTEM): string {
  return system === 'IMPERIAL' ? 'mph' : 'km/h'
}

export function formatElevationM(
  meters: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): string {
  if (meters == null || !Number.isFinite(meters) || meters < 1) return '—'
  if (system === 'IMPERIAL') {
    return `${Math.round(mToFt(meters))} ft`
  }
  return `${Math.round(meters)} m`
}

export function formatElevationValue(
  meters: number | null | undefined,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): { value: string; unit: string } | null {
  if (meters == null || !Number.isFinite(meters) || meters < 1) return null
  if (system === 'IMPERIAL') {
    return { value: String(Math.round(mToFt(meters))), unit: 'ft' }
  }
  return { value: String(Math.round(meters)), unit: 'm' }
}

/** Format stored swim meters for display (m or yd). */
export function formatSwimMeters(
  meters: number | null | undefined,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string {
  if (meters == null || meters <= 0) return '—'
  if (swimUnit === 'YARDS') {
    return `${Math.round(mToYd(meters))} yd`
  }
  return `${Math.round(meters)} m`
}

export function formatSwimDistanceValue(
  meters: number | null | undefined,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): { value: string; unit: string } | null {
  if (meters == null || meters <= 0) return null
  if (swimUnit === 'YARDS') {
    return { value: String(Math.round(mToYd(meters))), unit: 'yd' }
  }
  return { value: String(Math.round(meters)), unit: 'm' }
}

/** Clock pace for swim from stored min-per-100m (or sec/100m / 60). */
export function formatSwimPace(
  minPer100m: number | null | undefined,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
  opts?: { withUnit?: boolean },
): string {
  if (minPer100m == null || minPer100m <= 0) return ''
  const withUnit = opts?.withUnit !== false
  const pace =
    swimUnit === 'YARDS' ? pacePer100mToPer100yd(minPer100m) : minPer100m
  const clock = formatClockPace(pace)
  if (!clock) return ''
  return withUnit ? `${clock}${formatSwimPaceUnit(swimUnit)}` : clock
}

export function formatSwimPaceUnit(
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string {
  return swimUnit === 'YARDS' ? '/100yd' : '/100m'
}
