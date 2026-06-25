import { SessionType, WorkoutType } from '@prisma/client'
import { createBlock, emptyStructure } from './utils'
import type { WorkoutStructure } from './types'

type PresetConfig = {
  title: string
  sportType: WorkoutType
  structure: WorkoutStructure
}

export function buildPreset(sessionType: SessionType): PresetConfig {
  const structure = emptyStructure()

  switch (sessionType) {
    case 'EASY_RUN':
      structure.mainSet = [
        createBlock('CONTINUOUS', 0),
      ]
      structure.mainSet[0].time = 60
      structure.mainSet[0].targets = [{ type: 'rpe', value: 'Easy' }]
      return { title: 'Easy Run', sportType: WorkoutType.RUN, structure }

    case 'RECOVERY_RUN':
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].time = 40
      structure.mainSet[0].targets = [{ type: 'rpe', value: 'Very easy' }]
      return { title: 'Recovery Run', sportType: WorkoutType.RECOVERY, structure }

    case 'LONG_RUN':
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].durationType = 'distance'
      structure.mainSet[0].distance = 18
      structure.mainSet[0].distanceUnit = 'km'
      structure.mainSet[0].targets = [{ type: 'pace', value: 'Easy' }]
      return { title: 'Long Run', sportType: WorkoutType.RUN, structure }

    case 'TEMPO':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].time = 25
      structure.mainSet[0].targets = [{ type: 'pace', value: 'Tempo' }]
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Tempo Run', sportType: WorkoutType.RUN, structure }

    case 'THRESHOLD':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].time = 20
      structure.mainSet[0].targets = [{ type: 'heartRateZone', value: 'Zone 4' }]
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Threshold', sportType: WorkoutType.RUN, structure }

    case 'VO2_MAX':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('INTERVAL', 0)]
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'VO2 Max Intervals', sportType: WorkoutType.RUN, structure }

    case 'INTERVALS':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('INTERVAL', 0)]
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Intervals', sportType: WorkoutType.RUN, structure }

    case 'FARTLEK':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 10
      structure.mainSet = [
        createBlock('FREE_TEXT', 0),
      ]
      structure.mainSet[0].text = 'Alternate 3 min hard / 2 min easy for 30 min'
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Fartlek', sportType: WorkoutType.RUN, structure }

    case 'RACE_PACE':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].durationType = 'distance'
      structure.mainSet[0].distance = 8
      structure.mainSet[0].targets = [{ type: 'pace', value: 'Race pace' }]
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Race Pace', sportType: WorkoutType.RUN, structure }

    case 'HILL_REPEATS':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 15
      structure.mainSet = [createBlock('REPETITION', 0)]
      structure.mainSet[0].repetitions = 8
      structure.mainSet[0].work = {
        mode: 'time',
        value: 60,
        unit: 'sec',
        description: 'hill',
      }
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'Hill Repeats', sportType: WorkoutType.RUN, structure }

    case 'BRICK':
      structure.mainSet = [
        createBlock('CONTINUOUS', 0),
        createBlock('CONTINUOUS', 1),
      ]
      structure.mainSet[0].durationType = 'distance'
      structure.mainSet[0].distance = 40
      structure.mainSet[0].distanceUnit = 'km'
      structure.mainSet[0].targets = [{ type: 'power', value: 'Bike steady' }]
      structure.mainSet[1].durationType = 'distance'
      structure.mainSet[1].distance = 5
      structure.mainSet[1].distanceUnit = 'km'
      structure.mainSet[1].targets = [{ type: 'pace', value: 'Run off bike' }]
      return { title: 'Brick', sportType: WorkoutType.BIKE, structure }

    case 'STRENGTH':
      structure.mainSet = [createBlock('FREE_TEXT', 0)]
      structure.mainSet[0].text = 'Strength session — add exercises and sets'
      return { title: 'Strength', sportType: WorkoutType.STRENGTH, structure }

    case 'CROSS_TRAINING':
      structure.mainSet = [createBlock('CONTINUOUS', 0)]
      structure.mainSet[0].time = 45
      structure.mainSet[0].targets = [{ type: 'rpe', value: 'Moderate' }]
      return { title: 'Cross Training', sportType: WorkoutType.RECOVERY, structure }

    case 'HYROX':
      structure.warmup = [createBlock('CONTINUOUS', 0)]
      structure.warmup[0].time = 10
      structure.mainSet = [createBlock('FREE_TEXT', 0)]
      structure.mainSet[0].text = 'HYROX simulation — add stations and efforts'
      structure.cooldown = [createBlock('CONTINUOUS', 0)]
      structure.cooldown[0].time = 10
      return { title: 'HYROX Session', sportType: WorkoutType.HYROX, structure }

    case 'CUSTOM':
    default:
      return { title: '', sportType: WorkoutType.RUN, structure }
  }
}
