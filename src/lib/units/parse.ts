import type { UnitSystem } from '@/lib/units/types'
import { DEFAULT_UNIT_SYSTEM } from '@/lib/units/types'
import {
  miToKm,
  minPerMiToMinPerKm,
  mphToKph,
} from '@/lib/units/convert'

/** Parse "5:30", "5:30.5", or "5:30/km|/mi" into minutes per distance unit. */
function parseClockPace(input: string): number | null {
  const trimmed = input
    .trim()
    .replace(/\/\s*(km|mi|mile|miles)$/i, '')
    .trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1]!, 10)
    const secs = parseInt(colonMatch[2]!, 10)
    const frac = colonMatch[3]
      ? parseInt(colonMatch[3], 10) / 10 ** colonMatch[3].length
      : 0
    if (secs >= 60 || mins < 0) return null
    return mins + (secs + frac) / 60
  }

  const decimal = parseFloat(trimmed)
  if (!Number.isNaN(decimal) && decimal > 0) return decimal
  return null
}

/** Parse pace input in the active system → stored minutes per km. */
export function parsePaceToMinPerKm(
  input: string,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): number | null {
  const pace = parseClockPace(input)
  if (pace == null) return null
  return system === 'IMPERIAL' ? minPerMiToMinPerKm(pace) : pace
}

/** Parse bike speed in the active system → stored km/h. */
export function parseSpeedToKph(
  input: string,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): number | null {
  const trimmed = input
    .trim()
    .replace(/(km\/?h|kph|mph)$/i, '')
    .trim()
  if (!trimmed) return null
  const speed = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(speed) || speed <= 0) return null
  return system === 'IMPERIAL' ? mphToKph(speed) : speed
}

/** Parse distance in the active system → stored km. Swim meters stay meters elsewhere. */
export function parseDistanceToKm(
  input: string,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): number | null {
  const trimmed = input
    .trim()
    .replace(/\s*(km|mi|miles?|m)$/i, '')
    .trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return system === 'IMPERIAL' ? miToKm(n) : n
}
