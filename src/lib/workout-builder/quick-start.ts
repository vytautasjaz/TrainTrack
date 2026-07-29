import { SessionType, WorkoutType } from '@prisma/client'
import { buildPreset } from './presets'
import type { WorkoutStructure } from './types'

export type QuickStartOption = {
  sessionType: SessionType
  label: string
  icon: string
  description?: string
}

export const RUN_QUICK_START_OPTIONS: QuickStartOption[] = [
  { sessionType: 'EASY_RUN', label: 'Easy Run', icon: '🏃' },
  { sessionType: 'RECOVERY_RUN', label: 'Recovery', icon: '❤️' },
  { sessionType: 'THRESHOLD', label: 'Threshold', icon: '🔥' },
  { sessionType: 'TEMPO', label: 'Tempo', icon: '🚀' },
  { sessionType: 'VO2_MAX', label: 'VO₂ Max', icon: '⚡' },
  { sessionType: 'HILL_REPEATS', label: 'Hills', icon: '🏔' },
  { sessionType: 'LONG_RUN', label: 'Long Run', icon: '🏃' },
  { sessionType: 'RACE_PACE', label: 'Race Pace', icon: '🏁' },
  { sessionType: 'CUSTOM', label: 'Custom', icon: '🎲', description: 'Empty builder' },
]

export function sportSupportsQuickStart(sportType: WorkoutType): boolean {
  return (
    sportType === WorkoutType.RUN ||
    sportType === WorkoutType.BIKE ||
    sportType === WorkoutType.TRIATHLON
  )
}

export function getQuickStartOptionsForSport(sportType: WorkoutType): QuickStartOption[] {
  if (sportType === WorkoutType.BIKE) {
    return RUN_QUICK_START_OPTIONS.map((option) =>
      option.sessionType === 'LONG_RUN'
        ? { ...option, label: 'Long Ride' }
        : option.sessionType === 'EASY_RUN'
          ? { ...option, label: 'Easy Ride' }
          : option,
    )
  }
  return RUN_QUICK_START_OPTIONS
}

export function buildQuickStartPreset(
  sessionType: SessionType,
  sportType: WorkoutType = WorkoutType.RUN,
): {
  title: string
  structure: WorkoutStructure
  sessionType: SessionType
  sportType: WorkoutType
} {
  const preset = buildPreset(sessionType, sportType)
  return {
    title: preset.title,
    structure: preset.structure,
    sessionType,
    sportType,
  }
}
