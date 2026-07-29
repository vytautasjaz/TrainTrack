import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from './session-modes'
import { createBlock, newBlockId } from './utils'
import { isBikeSport } from './target-helpers'
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

export function createDefaultWarmupBlockTime(minutes = 15): WorkoutBlock {
  return {
    id: newBlockId(),
    order: 0,
    type: 'CONTINUOUS',
    durationType: 'time',
    time: minutes,
    targets: [{ type: 'rpe', value: 'Easy' }],
  }
}

export function createDefaultCooldownBlockTime(minutes = 10): WorkoutBlock {
  return {
    id: newBlockId(),
    order: 0,
    type: 'CONTINUOUS',
    durationType: 'time',
    time: minutes,
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
  const sportLabel = WORKOUT_TYPE_LABELS[sportType]
  const typeLabel = getSessionTypeLabel(sessionType, sportType)
  return `${sportLabel} · ${typeLabel}`
}

export function shouldSyncWorkoutTitle(
  title: string,
  sessionType: SessionType,
  sportType: WorkoutType,
  customized: boolean,
): boolean {
  if (!customized) return true
  const trimmed = title.trim()
  if (!trimmed) return true
  return isDefaultWorkoutTitle(trimmed, sessionType, sportType)
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

export function createDefaultStructuredWorkout(
  sessionType: SessionType,
  sportType: WorkoutType = SportEnum.RUN,
): WorkoutStructure {
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
    structure.mainSet = [createBlock('INTERVAL', 0, sportType)]
  } else if (sessionType === 'TEMPO' || sessionType === 'THRESHOLD' || sessionType === 'RACE_PACE') {
    const block = createBlock('CONTINUOUS', 0, sportType)
    block.durationType = 'distance'
    block.distance = 5
    block.targets = isBikeSport(sportType)
      ? [{ type: 'power', value: sessionType === 'TEMPO' ? 'Tempo' : 'Threshold' }]
      : [{ type: 'pace', value: sessionType === 'TEMPO' ? 'Tempo' : 'Threshold' }]
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
