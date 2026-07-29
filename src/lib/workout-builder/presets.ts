import { SessionType, WorkoutType } from '@prisma/client'
import { createSmartBlock } from './smart-blocks'
import { emptyStructure } from './utils'
import { getSessionTypeLabel } from './session-modes'
import type { WorkoutStructure } from './types'

type PresetConfig = {
  title: string
  sportType: WorkoutType
  structure: WorkoutStructure
}

/** Build a sport-aware starter structure. Never force RUN when called for BIKE. */
export function buildPreset(
  sessionType: SessionType,
  sportType: WorkoutType = WorkoutType.RUN,
): PresetConfig {
  const structure = emptyStructure()
  const title = getSessionTypeLabel(sessionType, sportType)

  const mapSessionToSmart = (): Parameters<typeof createSmartBlock>[0] | null => {
    switch (sessionType) {
      case 'EASY_RUN':
        return 'EASY_RUN'
      case 'RECOVERY_RUN':
        return 'RECOVERY'
      case 'LONG_RUN':
        return 'EASY_RUN'
      case 'TEMPO':
        return 'TEMPO'
      case 'THRESHOLD':
        return 'THRESHOLD'
      case 'VO2_MAX':
        return 'VO2_MAX'
      case 'INTERVALS':
        return 'VO2_MAX'
      case 'RACE_PACE':
        return 'RACE_PACE'
      case 'HILL_REPEATS':
        return 'HILL_REPEATS'
      default:
        return null
    }
  }

  const smartKind = mapSessionToSmart()
  if (smartKind) {
    if (sessionType === 'LONG_RUN') {
      const block = createSmartBlock('EASY_RUN', 0, sportType)
      if (sportType === WorkoutType.BIKE) {
        block.time = 180
      } else {
        block.durationType = 'distance'
        block.distance = 20
        block.distanceUnit = 'km'
      }
      structure.mainSet = [block]
    } else if (
      sessionType === 'THRESHOLD' ||
      sessionType === 'VO2_MAX' ||
      sessionType === 'INTERVALS' ||
      sessionType === 'HILL_REPEATS' ||
      sessionType === 'TEMPO' ||
      sessionType === 'RACE_PACE'
    ) {
      structure.warmup = [createSmartBlock('WARM_UP', 0, sportType)]
      structure.mainSet = [createSmartBlock(smartKind, 0, sportType)]
      structure.cooldown = [createSmartBlock('COOL_DOWN', 0, sportType)]
    } else {
      structure.mainSet = [createSmartBlock(smartKind, 0, sportType)]
    }
    return { title, sportType, structure }
  }

  switch (sessionType) {
    case 'FARTLEK':
      structure.warmup = [createSmartBlock('WARM_UP', 0, sportType)]
      structure.mainSet = [createSmartBlock('COACH_NOTES', 0, sportType)]
      structure.mainSet[0]!.text = 'Alternate 3 min hard / 2 min easy for 30 min'
      structure.cooldown = [createSmartBlock('COOL_DOWN', 0, sportType)]
      return { title, sportType, structure }

    case 'BRICK':
      structure.mainSet = [
        createSmartBlock('EASY_RUN', 0, WorkoutType.BIKE),
        createSmartBlock('EASY_RUN', 1, WorkoutType.RUN),
      ]
      structure.mainSet[0]!.targets = [{ type: 'power', value: 'Bike steady' }]
      structure.mainSet[1]!.durationType = 'distance'
      structure.mainSet[1]!.distance = 5
      structure.mainSet[1]!.distanceUnit = 'km'
      structure.mainSet[1]!.targets = [{ type: 'pace', value: 'Run off bike' }]
      return { title, sportType: WorkoutType.BIKE, structure }

    case 'STRENGTH':
      structure.mainSet = [createSmartBlock('COACH_NOTES', 0, sportType)]
      structure.mainSet[0]!.text = 'Strength session — add exercises and sets'
      return { title, sportType: WorkoutType.STRENGTH, structure }

    case 'CROSS_TRAINING':
      structure.mainSet = [createSmartBlock('EASY_RUN', 0, sportType)]
      structure.mainSet[0]!.durationType = 'time'
      structure.mainSet[0]!.time = 45
      structure.mainSet[0]!.targets = [{ type: 'rpe', value: 'Moderate' }]
      return { title, sportType: WorkoutType.RECOVERY, structure }

    case 'HYROX':
      structure.warmup = [createSmartBlock('WARM_UP', 0, sportType)]
      structure.mainSet = [createSmartBlock('COACH_NOTES', 0, sportType)]
      structure.mainSet[0]!.text = 'HYROX simulation — add stations and efforts'
      structure.cooldown = [createSmartBlock('COOL_DOWN', 0, sportType)]
      return { title, sportType: WorkoutType.HYROX, structure }

    case 'CUSTOM':
    default:
      return { title: title || '', sportType, structure: emptyStructure() }
  }
}
