import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import { getSessionTypeLabel } from './session-modes'
import { createBlock, newBlockId } from './utils'
import type { WorkoutBlock, WorkoutStructure } from './types'

export const DEFAULT_WU_CD_KM = 3

export function createDefaultWarmupBlock(): WorkoutBlock {
  return {
    id: newBlockId(),
    order: 0,
    type: 'CONTINUOUS',
    durationType: 'distance',
    distance: DEFAULT_WU_CD_KM,
    distanceUnit: 'km',
    targets: [{ type: 'rpe', value: 'Easy' }],
  }
}

export function createDefaultCooldownBlock(): WorkoutBlock {
  return {
    id: newBlockId(),
    order: 0,
    type: 'CONTINUOUS',
    durationType: 'distance',
    distance: DEFAULT_WU_CD_KM,
    distanceUnit: 'km',
    targets: [{ type: 'rpe', value: 'Easy' }],
  }
}

export function defaultWorkoutTitle(
  sessionType: SessionType,
  sportType: WorkoutType = SportEnum.RUN,
): string {
  return getSessionTypeLabel(sessionType, sportType)
}

/** @deprecated use defaultWorkoutTitle */
export function defaultTitleForSession(sessionType: SessionType): string {
  return defaultWorkoutTitle(sessionType, SportEnum.RUN)
}

export function isDefaultWorkoutTitle(
  title: string,
  sessionType: SessionType,
  sportType: WorkoutType,
): boolean {
  return title.trim() === defaultWorkoutTitle(sessionType, sportType)
}

export function createDefaultStructuredWorkout(sessionType: SessionType): WorkoutStructure {
  const structure: WorkoutStructure = {
    warmup: [createDefaultWarmupBlock()],
    mainSet: [],
    cooldown: [createDefaultCooldownBlock()],
  }

  if (
    sessionType === 'INTERVALS' ||
    sessionType === 'VO2_MAX' ||
    sessionType === 'HILL_REPEATS'
  ) {
    structure.mainSet = [createBlock('INTERVAL', 0)]
  } else if (sessionType === 'TEMPO' || sessionType === 'THRESHOLD' || sessionType === 'RACE_PACE') {
    const block = createBlock('CONTINUOUS', 0)
    block.durationType = 'distance'
    block.distance = 5
    block.targets = [{ type: 'pace', value: sessionType === 'TEMPO' ? 'Tempo' : 'Threshold' }]
    structure.mainSet = [block]
  } else if (sessionType === 'FARTLEK') {
    structure.mainSet = [
      createBlock('FREE_TEXT', 0),
    ]
    structure.mainSet[0].text = 'Alternate hard / easy efforts'
  } else if (sessionType === 'BRICK') {
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
  }

  return structure
}
