import { SessionType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import {
  bikeSpeedZoneForKind,
  estimateDistanceKmFromBikeSpeed,
  estimateDurationMinFromBikeSpeed,
} from '@/lib/athlete-preferences'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { createBlock, createSegment, emptyStructure, newBlockId } from '@/lib/workout-builder/utils'

export type BikeEnvironment = 'outdoor' | 'indoor'

export type BikeWorkoutKind =
  | 'EASY'
  | 'RECOVERY'
  | 'ENDURANCE'
  | 'LONG'
  | 'TEMPO'
  | 'SWEET_SPOT'
  | 'THRESHOLD'
  | 'VO2'
  | 'SPRINT'
  | 'HILLS'
  | 'RACE'
  | 'CUSTOM'

export type BikePrimaryMetric = 'duration' | 'distance'

export const BIKE_WORKOUT_KINDS: {
  id: BikeWorkoutKind
  label: string
  sessionType: SessionType
  /** Expand Workout Details by default */
  expandDetails: boolean
}[] = [
  { id: 'EASY', label: 'Easy Ride', sessionType: SessionType.EASY_RUN, expandDetails: false },
  { id: 'RECOVERY', label: 'Recovery Ride', sessionType: SessionType.RECOVERY_RUN, expandDetails: false },
  { id: 'ENDURANCE', label: 'Endurance Ride', sessionType: SessionType.EASY_RUN, expandDetails: false },
  { id: 'LONG', label: 'Long Ride', sessionType: SessionType.LONG_RUN, expandDetails: false },
  { id: 'TEMPO', label: 'Tempo Ride', sessionType: SessionType.TEMPO, expandDetails: true },
  { id: 'SWEET_SPOT', label: 'Sweet Spot', sessionType: SessionType.TEMPO, expandDetails: true },
  { id: 'THRESHOLD', label: 'Threshold Intervals', sessionType: SessionType.THRESHOLD, expandDetails: true },
  { id: 'VO2', label: 'VO₂ Max', sessionType: SessionType.VO2_MAX, expandDetails: true },
  { id: 'SPRINT', label: 'Sprint Intervals', sessionType: SessionType.INTERVALS, expandDetails: true },
  { id: 'HILLS', label: 'Hill Repeats', sessionType: SessionType.HILL_REPEATS, expandDetails: true },
  { id: 'RACE', label: 'Race Simulation', sessionType: SessionType.RACE_PACE, expandDetails: true },
  { id: 'CUSTOM', label: 'Custom', sessionType: SessionType.CUSTOM, expandDetails: false },
]

export function bikeKindLabel(kind: BikeWorkoutKind): string {
  return BIKE_WORKOUT_KINDS.find((k) => k.id === kind)?.label ?? 'Custom'
}

export function bikeKindMeta(kind: BikeWorkoutKind) {
  return BIKE_WORKOUT_KINDS.find((k) => k.id === kind) ?? BIKE_WORKOUT_KINDS[BIKE_WORKOUT_KINDS.length - 1]!
}

export function autoBikeTitle(environment: BikeEnvironment, kind: BikeWorkoutKind): string {
  const label = bikeKindLabel(kind)
  if (environment === 'indoor') return `Indoor ${label}`
  return label
}

export function formatBikeDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours <= 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function formatBikeDistance(km: number, approximate = false): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km'
  const rounded = Math.round(km * 10) / 10
  return approximate ? `~ ${rounded} km` : `${rounded} km`
}

export function autoBikeSubtitle(kind: BikeWorkoutKind, durationMin: number, distanceKm: number): string {
  switch (kind) {
    case 'EASY':
    case 'ENDURANCE':
      return durationMin > 0 ? `${formatBikeDuration(durationMin)} Zone 2` : 'Zone 2'
    case 'RECOVERY':
      return durationMin > 0 ? `${formatBikeDuration(durationMin)} Recovery` : 'Recovery'
    case 'LONG':
      return distanceKm > 0
        ? `${Math.round(distanceKm)} km Endurance Ride`
        : durationMin > 0
          ? `${formatBikeDuration(durationMin)} Endurance`
          : 'Endurance Ride'
    case 'TEMPO':
      return durationMin > 0 ? `${formatBikeDuration(durationMin)} Tempo` : 'Tempo'
    case 'SWEET_SPOT':
      return 'Sweet Spot intervals'
    case 'THRESHOLD':
      return '4 × 10 min @ Threshold'
    case 'VO2':
      return '6 × 3 min VO₂ Max'
    case 'SPRINT':
      return '8 × 30 sec Sprints'
    case 'HILLS':
      return '6 × Hill repeats'
    case 'RACE':
      return durationMin > 0 ? `${formatBikeDuration(durationMin)} Race pace` : 'Race Simulation'
    case 'CUSTOM':
    default:
      if (durationMin > 0 && distanceKm > 0) {
        return `${formatBikeDuration(durationMin)} · ${formatBikeDistance(distanceKm)}`
      }
      if (durationMin > 0) return formatBikeDuration(durationMin)
      if (distanceKm > 0) return formatBikeDistance(distanceKm)
      return 'Custom ride'
  }
}

/** Rough km estimate from minutes for card secondary metric. */
export function estimateBikeKmFromMinutes(
  minutes: number,
  kind: BikeWorkoutKind,
  preferences?: AthletePreferences | null,
): number {
  if (minutes <= 0) return 0
  const zoneKey = bikeSpeedZoneForKind(kind)
  const preferredSpeed = preferences?.[zoneKey]
  const fallbackSpeed =
    kind === 'RECOVERY' ? 22 : kind === 'LONG' || kind === 'ENDURANCE' ? 28 : kind === 'EASY' ? 26 : 30
  return estimateDistanceKmFromBikeSpeed(minutes, preferredSpeed && preferredSpeed > 0 ? preferredSpeed : fallbackSpeed)
}

export function estimateBikeMinutesFromKm(
  km: number,
  kind: BikeWorkoutKind,
  preferences?: AthletePreferences | null,
): number {
  if (km <= 0) return 0
  const zoneKey = bikeSpeedZoneForKind(kind)
  const preferredSpeed = preferences?.[zoneKey]
  const fallbackSpeed =
    kind === 'RECOVERY' ? 22 : kind === 'LONG' || kind === 'ENDURANCE' ? 28 : kind === 'EASY' ? 26 : 30
  return estimateDurationMinFromBikeSpeed(km, preferredSpeed && preferredSpeed > 0 ? preferredSpeed : fallbackSpeed)
}

export type BikeWorkoutDefaults = {
  durationMin: number
  distanceKm: number
  primaryMetric: BikePrimaryMetric
  structure: WorkoutStructure
}

function continuousTime(
  minutes: number,
  target: string,
  order: number,
): ReturnType<typeof createBlock> {
  const block = createBlock('CONTINUOUS', order, 'BIKE')
  block.durationType = 'time'
  block.time = minutes
  block.targets = [{ type: 'powerZone', value: target }]
  return block
}

export function buildBikeWorkoutDefaults(kind: BikeWorkoutKind): BikeWorkoutDefaults {
  const structure = emptyStructure()

  switch (kind) {
    case 'EASY':
      structure.mainSet = [continuousTime(60, 'Z2', 0)]
      return {
        durationMin: 60,
        distanceKm: estimateBikeKmFromMinutes(60, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'ENDURANCE':
      structure.mainSet = [continuousTime(120, 'Z2', 0)]
      return {
        durationMin: 120,
        distanceKm: estimateBikeKmFromMinutes(120, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'RECOVERY':
      structure.mainSet = [continuousTime(45, 'Z1', 0)]
      return {
        durationMin: 45,
        distanceKm: estimateBikeKmFromMinutes(45, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'LONG':
      structure.mainSet = [continuousTime(180, 'Z2', 0)]
      return {
        durationMin: 180,
        distanceKm: estimateBikeKmFromMinutes(180, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'TEMPO':
      structure.warmup = [continuousTime(15, 'Z2', 0)]
      structure.mainSet = [continuousTime(40, 'Tempo', 0)]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 65,
        distanceKm: estimateBikeKmFromMinutes(65, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'SWEET_SPOT':
      structure.warmup = [continuousTime(15, 'Z2', 0)]
      structure.mainSet = [
        {
          id: newBlockId(),
          order: 0,
          type: 'INTERVAL',
          repetitions: 3,
          work: createSegment({ mode: 'time', value: 12, unit: 'min' }),
          recovery: createSegment({ mode: 'time', value: 4, unit: 'min', description: 'easy' }),
          targets: [{ type: 'powerZone', value: 'Sweet Spot' }],
        },
      ]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 73,
        distanceKm: estimateBikeKmFromMinutes(73, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'THRESHOLD':
      structure.warmup = [continuousTime(20, 'Z2', 0)]
      structure.mainSet = [
        {
          id: newBlockId(),
          order: 0,
          type: 'INTERVAL',
          repetitions: 4,
          work: createSegment({ mode: 'time', value: 10, unit: 'min' }),
          recovery: createSegment({ mode: 'time', value: 2, unit: 'min', description: 'easy' }),
          targets: [{ type: 'powerZone', value: 'Threshold' }],
        },
      ]
      structure.cooldown = [continuousTime(15, 'Z2', 0)]
      return {
        durationMin: 120,
        distanceKm: estimateBikeKmFromMinutes(120, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'VO2':
      structure.warmup = [continuousTime(15, 'Z2', 0)]
      structure.mainSet = [
        {
          id: newBlockId(),
          order: 0,
          type: 'INTERVAL',
          repetitions: 6,
          work: createSegment({ mode: 'time', value: 3, unit: 'min' }),
          recovery: createSegment({ mode: 'time', value: 3, unit: 'min', description: 'easy' }),
          targets: [{ type: 'powerZone', value: 'VO2' }],
        },
      ]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 61,
        distanceKm: estimateBikeKmFromMinutes(61, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'SPRINT':
      structure.warmup = [continuousTime(20, 'Z2', 0)]
      structure.mainSet = [
        {
          id: newBlockId(),
          order: 0,
          type: 'INTERVAL',
          repetitions: 8,
          work: createSegment({ mode: 'time', value: 30, unit: 'sec' }),
          recovery: createSegment({ mode: 'time', value: 2, unit: 'min', description: 'easy' }),
          targets: [{ type: 'powerZone', value: 'Sprint' }],
        },
      ]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 50,
        distanceKm: estimateBikeKmFromMinutes(50, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'HILLS':
      structure.warmup = [continuousTime(15, 'Z2', 0)]
      structure.mainSet = [
        {
          id: newBlockId(),
          order: 0,
          type: 'INTERVAL',
          repetitions: 6,
          work: createSegment({ mode: 'time', value: 4, unit: 'min' }),
          recovery: createSegment({ mode: 'time', value: 3, unit: 'min', description: 'easy' }),
          targets: [{ type: 'powerZone', value: 'Hills' }],
        },
      ]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 67,
        distanceKm: estimateBikeKmFromMinutes(67, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'RACE':
      structure.warmup = [continuousTime(20, 'Z2', 0)]
      structure.mainSet = [continuousTime(60, 'Race', 0)]
      structure.cooldown = [continuousTime(10, 'Z2', 0)]
      return {
        durationMin: 90,
        distanceKm: estimateBikeKmFromMinutes(90, kind),
        primaryMetric: 'duration',
        structure,
      }
    case 'CUSTOM':
    default:
      structure.mainSet = [continuousTime(60, 'Z2', 0)]
      return {
        durationMin: 60,
        distanceKm: estimateBikeKmFromMinutes(60, 'CUSTOM'),
        primaryMetric: 'duration',
        structure,
      }
  }
}

export const BIKE_ENV_TAG_INDOOR = 'environment:indoor'
export const BIKE_ENV_TAG_OUTDOOR = 'environment:outdoor'
export const BIKE_KIND_TAG_PREFIX = 'bikeKind:'
export const BIKE_PRIMARY_TAG_PREFIX = 'bikePrimary:'
export const BIKE_APPROX_DURATION_TAG = 'bikeApprox:duration'
export const BIKE_APPROX_DISTANCE_TAG = 'bikeApprox:distance'

export function bikeEnvironmentFromTags(tags: string[] | undefined): BikeEnvironment {
  if (tags?.includes(BIKE_ENV_TAG_INDOOR)) return 'indoor'
  return 'outdoor'
}

export function bikeKindFromTags(tags: string[] | undefined): BikeWorkoutKind | null {
  const tag = tags?.find((t) => t.startsWith(BIKE_KIND_TAG_PREFIX))
  if (!tag) return null
  const id = tag.slice(BIKE_KIND_TAG_PREFIX.length) as BikeWorkoutKind
  return BIKE_WORKOUT_KINDS.some((k) => k.id === id) ? id : null
}

export function bikePrimaryMetricFromTags(tags: string[] | undefined): BikePrimaryMetric | null {
  const tag = tags?.find((t) => t.startsWith(BIKE_PRIMARY_TAG_PREFIX))
  if (!tag) return null
  const value = tag.slice(BIKE_PRIMARY_TAG_PREFIX.length)
  return value === 'duration' || value === 'distance' ? value : null
}

export function bikeApproxMetricsFromTags(tags: string[] | undefined): {
  duration: boolean
  distance: boolean
} {
  return {
    duration: Boolean(tags?.includes(BIKE_APPROX_DURATION_TAG)),
    distance: Boolean(tags?.includes(BIKE_APPROX_DISTANCE_TAG)),
  }
}

export function bikeWorkoutTags(
  environment: BikeEnvironment,
  kind: BikeWorkoutKind,
  primaryMetric: BikePrimaryMetric,
  approx?: { duration?: boolean; distance?: boolean },
  durationUnit?: 'min' | 'hours',
): string[] {
  const tags = [
    environment === 'indoor' ? BIKE_ENV_TAG_INDOOR : BIKE_ENV_TAG_OUTDOOR,
    `${BIKE_KIND_TAG_PREFIX}${kind}`,
    `${BIKE_PRIMARY_TAG_PREFIX}${primaryMetric}`,
    `primaryMetric:${primaryMetric}`,
  ]
  if (durationUnit) tags.push(`durationUnit:${durationUnit}`)
  if (approx?.duration) tags.push(BIKE_APPROX_DURATION_TAG)
  if (approx?.distance) tags.push(BIKE_APPROX_DISTANCE_TAG)
  if (approx?.duration) tags.push('approx:duration')
  if (approx?.distance) tags.push('approx:distance')
  return tags
}
