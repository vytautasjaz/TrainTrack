import type { WorkoutType } from '@prisma/client'
import type { WorkoutSectionType } from '@/lib/workout-builder/structure-v2'
import type { ExerciseSearchContext } from '@/lib/exercises/types'

export function searchContextForSection(
  sectionType: WorkoutSectionType | undefined,
  sportType?: WorkoutType,
): ExerciseSearchContext {
  switch (sectionType) {
    case 'STRENGTH':
      return 'STRENGTH'
    case 'HYROX_SIMULATION':
      return 'HYROX'
    case 'CONDITIONING':
    case 'FINISHER':
      return 'CONDITIONING'
    case 'CORE':
      return 'CORE'
    case 'RECOVERY':
    case 'COOLDOWN':
    case 'WARMUP':
      return 'MOBILITY'
    case 'MAIN_SET':
      if (sportType === 'HYROX') return 'HYROX'
      if (sportType === 'STRENGTH') return 'STRENGTH'
      if (sportType === 'RUN') return 'RUNNING'
      return 'GENERAL'
    default:
      if (sportType === 'HYROX') return 'HYROX'
      if (sportType === 'STRENGTH') return 'STRENGTH'
      if (sportType === 'RUN') return 'RUNNING'
      return 'GENERAL'
  }
}
