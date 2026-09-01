import { WorkoutType } from '@prisma/client'
import { formatPaceMinPerKm, parsePaceMinPerKm } from '@/lib/athlete-preferences'
import type { Segment, SegmentUnit, Target, TargetType } from './types'
import { TARGET_TYPE_LABELS } from './types'

export function isBikeSport(sport: WorkoutType): boolean {
  return sport === WorkoutType.BIKE || sport === WorkoutType.TRIATHLON
}

export function defaultIntensityTargetType(sport: WorkoutType): TargetType {
  return isBikeSport(sport) ? 'power' : 'pace'
}

export function segmentModeForUnit(unit: SegmentUnit): 'time' | 'distance' {
  return unit === 'min' || unit === 'sec' ? 'time' : 'distance'
}

export function updateSegmentUnit(segment: Segment, unit: SegmentUnit): Segment {
  return { ...segment, unit, mode: segmentModeForUnit(unit) }
}

export function updateSegmentValue(segment: Segment, value: number): Segment {
  return { ...segment, value }
}

const RUN_TARGET_TYPES: TargetType[] = [
  'pace',
  'speed',
  'heartRate',
  'heartRateZone',
  'rpe',
  'power',
  'powerZone',
  'cadence',
]

const BIKE_TARGET_TYPES: TargetType[] = [
  'power',
  'powerZone',
  'speed',
  'pace',
  'heartRate',
  'heartRateZone',
  'rpe',
  'cadence',
]

/** Simplified intensity picker: Effort + Pace + HR (run) or Effort + Watts + % FTP (bike). */
export function simpleTargetTypesForSport(sport: WorkoutType): TargetType[] {
  return isBikeSport(sport) ? ['rpe', 'power', 'powerZone'] : ['rpe', 'pace', 'heartRate']
}

export function simpleTargetTypeLabel(type: TargetType): string {
  if (type === 'rpe') return 'Effort'
  if (type === 'power') return 'Watts'
  if (type === 'powerZone') return '% FTP'
  if (type === 'pace') return 'Pace'
  if (type === 'heartRate') return 'HR'
  if (type === 'heartRateZone') return 'Zone'
  return TARGET_TYPE_LABELS[type]
}

export function intensitySuggestions(type: TargetType, sport: WorkoutType): string[] {
  const zones = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
  if (type === 'rpe') {
    return [...zones, 'Easy', 'Recovery', 'Tempo', 'Threshold', 'Hard', 'Max']
  }
  if (type === 'pace') {
    return [...zones, 'Easy', 'Tempo', 'Threshold', '5:30', '4:30', '4:00', '3:45']
  }
  if (type === 'heartRate') {
    return [...zones, '120', '130', '140', '150', '160', '170', '180']
  }
  if (type === 'heartRateZone') {
    return zones
  }
  if (type === 'power') {
    return [...zones, 'Easy', 'Tempo', 'Threshold', '180', '200', '220', '250']
  }
  if (type === 'powerZone') {
    return ['55', '65', '75', '85', '90', '95', '100', '105', '120']
  }
  if (isBikeSport(sport) && type === 'speed') {
    return [...zones, '25', '28', '32', '35']
  }
  return zones
}

export function targetTypesForSport(sport: WorkoutType): TargetType[] {
  return isBikeSport(sport) ? BIKE_TARGET_TYPES : RUN_TARGET_TYPES
}

export function targetPlaceholder(type: TargetType, sport: WorkoutType): string {
  switch (type) {
    case 'power':
      return '250W'
    case 'powerZone':
      return '75'
    case 'speed':
      return isBikeSport(sport) ? '35 km/h' : '12 km/h'
    case 'pace':
      return '4:30'
    case 'heartRate':
      return '165'
    case 'heartRateZone':
      return 'Z3'
    case 'cadence':
      return '90 rpm'
    case 'rpe':
      return 'Easy'
    default:
      return ''
  }
}

/** Strip trailing /km so the field shows m:ss / mm:ss only. */
export function paceInputDisplayValue(value: string | undefined | null): string {
  return (value ?? '').replace(/\s*\/\s*km$/i, '').trim()
}

/**
 * Normalize pace on blur: "5:3", "5:30", "5:30/km" → "5:30/km".
 * Keywords / zones (Easy, Z2, …) are left unchanged.
 */
export function normalizePaceInputValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const looksLikeClock =
    /^\d{1,2}:\d{1,2}(?:\.\d{1,3})?(?:\s*\/\s*km)?$/i.test(trimmed) ||
    /\/\s*km$/i.test(trimmed)
  if (!looksLikeClock) return trimmed

  const parsed = parsePaceMinPerKm(trimmed)
  if (parsed == null) return trimmed
  return `${formatPaceMinPerKm(parsed)}/km`
}

export function primaryTarget(block: { targets?: Target[] }, sport: WorkoutType): Target {
  const existing = block.targets?.[0]
  if (existing) return existing
  return { type: defaultIntensityTargetType(sport), value: '' }
}

export function recoveryTarget(
  targets: Target[] | undefined,
  _sport: WorkoutType = 'RUN' as WorkoutType,
): Target {
  const existing = targets?.[1]
  if (existing) return existing
  return { type: 'rpe', value: 'Easy' }
}

export function setWorkTarget(
  targets: Target[] | undefined,
  work: Target,
  sport: WorkoutType,
): Target[] {
  return [work, recoveryTarget(targets, sport)]
}

export function setRecoveryTarget(
  targets: Target[] | undefined,
  recovery: Target,
  sport: WorkoutType,
): Target[] {
  return [primaryTarget({ targets }, sport), recovery]
}

export function formatIntensityDisplay(target: Target, _sport: WorkoutType): string {
  const value = target.value?.trim()
  if (target.type === 'rpe' && value) return value
  if (!value) return targetTypeLabel(target.type)
  if (target.type === 'power' && /^\d+$/.test(value)) return `${value}W`
  if (target.type === 'powerZone') {
    const pct = value.replace(/%/g, '').replace(/\s*ftp/i, '').trim()
    if (/^\d+(\.\d+)?$/.test(pct)) return `${pct}% FTP`
  }
  if (target.type === 'pace') {
    const clock = paceInputDisplayValue(value)
    if (/^\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(clock)) return `${clock}/km`
    return value
  }
  return `${targetTypeLabel(target.type)} ${value}`
}

export const RPE_PRESETS = ['Easy', 'Recovery', 'Moderate', 'Hard', 'Max'] as const

export const HR_ZONE_PRESETS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const

export const SEGMENT_UNIT_LABELS: Record<SegmentUnit, string> = {
  sec: 'sec',
  min: 'min',
  m: 'm',
  km: 'km',
}

export function setPrimaryTarget(
  block: { targets?: Target[] },
  target: Target,
): Target[] {
  const rest = (block.targets ?? []).slice(1)
  return target.value ? [target, ...rest] : rest.length > 0 ? rest : [target]
}

export function targetTypeLabel(type: TargetType): string {
  return TARGET_TYPE_LABELS[type]
}
