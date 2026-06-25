import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'

/** Session types that only need distance, duration, and coach notes. */
export const SIMPLE_SESSION_TYPES: SessionType[] = [
  'EASY_RUN',
  'RECOVERY_RUN',
  'LONG_RUN',
  'CROSS_TRAINING',
]

export function isSimpleSessionType(sessionType: SessionType): boolean {
  return SIMPLE_SESSION_TYPES.includes(sessionType)
}

const ENDURANCE_SESSION_TYPES: SessionType[] = [
  'EASY_RUN',
  'RECOVERY_RUN',
  'LONG_RUN',
  'INTERVALS',
  'VO2_MAX',
  'TEMPO',
  'THRESHOLD',
  'HILL_REPEATS',
  'FARTLEK',
  'RACE_PACE',
  'CUSTOM',
]

/** @deprecated use ENDURANCE_SESSION_TYPES via sessionTypesForSport */
export const RUN_SESSION_TYPES: SessionType[] = ENDURANCE_SESSION_TYPES

export function getSessionTypeLabel(
  sessionType: SessionType,
  sportType: WorkoutType = SportEnum.RUN,
): string {
  const sportLabel = WORKOUT_TYPE_LABELS[sportType]

  switch (sessionType) {
    case 'EASY_RUN':
      return sportType === SportEnum.RUN ? 'Easy Run' : 'Easy'
    case 'RECOVERY_RUN':
      return sportType === SportEnum.RUN ? 'Recovery Run' : 'Recovery'
    case 'LONG_RUN':
      return sportType === SportEnum.RUN ? 'Long Run' : `Long ${sportLabel}`
    case 'INTERVALS':
      return 'Intervals'
    case 'VO2_MAX':
      return 'VO2 Max'
    case 'TEMPO':
      return 'Tempo'
    case 'THRESHOLD':
      return 'Threshold'
    case 'FARTLEK':
      return 'Fartlek'
    case 'RACE_PACE':
      return 'Race Pace'
    case 'HILL_REPEATS':
      return 'Hill Repeats'
    case 'BRICK':
      return 'Brick'
    case 'STRENGTH':
      return 'Strength'
    case 'CROSS_TRAINING':
      return 'Cross Training'
    case 'HYROX':
      return 'HYROX'
    case 'CUSTOM':
      return 'Custom'
    default:
      return sessionType
  }
}

export function sessionTypesForSport(sportType: WorkoutType): SessionType[] {
  switch (sportType) {
    case SportEnum.RUN:
      return [...ENDURANCE_SESSION_TYPES, 'BRICK']
    case SportEnum.BIKE:
      return [...ENDURANCE_SESSION_TYPES.filter((t) => t !== 'FARTLEK'), 'BRICK']
    case SportEnum.SWIM:
      return ENDURANCE_SESSION_TYPES.filter((t) => t !== 'FARTLEK')
    case SportEnum.TRIATHLON:
      return [
        ...ENDURANCE_SESSION_TYPES.filter((t) => t !== 'FARTLEK'),
        'BRICK',
        'STRENGTH',
        'CROSS_TRAINING',
        'CUSTOM',
      ]
    case SportEnum.STRENGTH:
      return ['STRENGTH', 'CROSS_TRAINING', 'CUSTOM']
    case SportEnum.HYROX:
      return ['HYROX', 'INTERVALS', 'STRENGTH', 'CROSS_TRAINING', 'CUSTOM']
    case SportEnum.RECOVERY:
    case SportEnum.REST:
      return ['RECOVERY_RUN', 'CROSS_TRAINING', 'CUSTOM']
    default:
      return ENDURANCE_SESSION_TYPES
  }
}
