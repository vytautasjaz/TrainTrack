import { WorkoutType } from '@prisma/client'
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
      return '3:45/km'
    case 'heartRate':
      return '165-175 bpm'
    case 'heartRateZone':
      return 'Z4'
    case 'cadence':
      return '90 rpm'
    case 'rpe':
      return 'Easy'
    default:
      return ''
  }
}

export function primaryTarget(block: { targets?: Target[] }, sport: WorkoutType): Target {
  const existing = block.targets?.[0]
  if (existing) return existing
  return { type: defaultIntensityTargetType(sport), value: '' }
}

export function recoveryTarget(
  targets: Target[] | undefined,
  sport: WorkoutType = 'RUN' as WorkoutType,
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

export function formatIntensityDisplay(target: Target, sport: WorkoutType): string {
  const value = target.value?.trim()
  if (target.type === 'rpe' && value) return value
  if (!value) return targetTypeLabel(target.type)
  if (target.type === 'power' && /^\d+$/.test(value)) return `${value}W`
  if (target.type === 'powerZone') {
    const pct = value.replace(/%/g, '').replace(/\s*ftp/i, '').trim()
    if (/^\d+(\.\d+)?$/.test(pct)) return `${pct}% FTP`
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
