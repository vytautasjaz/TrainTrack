import type { SessionType, WorkoutType } from '@prisma/client'

export type BlockType =
  | 'CONTINUOUS'
  | 'INTERVAL'
  | 'REPETITION'
  | 'FREE_TEXT'
  | 'RECOVERY'
  | 'REST'

export type DurationMode = 'time' | 'distance'

export type SegmentUnit = 'sec' | 'min' | 'm' | 'km'

export type TargetType =
  | 'pace'
  | 'heartRate'
  | 'heartRateZone'
  | 'power'
  | 'powerZone'
  | 'cadence'
  | 'rpe'
  | 'speed'

export type WorkoutSection = 'warmup' | 'mainSet' | 'cooldown'

export type Segment = {
  mode: DurationMode
  value: number
  unit: SegmentUnit
  description?: string
}

export type Target = {
  type: TargetType
  min?: number
  max?: number
  value?: string
}

export type WorkoutBlock = {
  id: string
  order: number
  type: BlockType
  repetitions?: number
  work?: Segment
  recovery?: Segment
  durationType?: DurationMode
  time?: number
  distance?: number
  distanceUnit?: 'km' | 'm'
  targets?: Target[]
  notes?: string
  text?: string
}

export type WorkoutStructure = {
  warmup: WorkoutBlock[]
  mainSet: WorkoutBlock[]
  cooldown: WorkoutBlock[]
  coachNotes?: string
}

export type BuilderWorkout = {
  title: string
  sportType: WorkoutType
  sessionType: SessionType
  scheduledDate?: string
  tags: string[]
  estimatedDuration?: number
  structure: WorkoutStructure
}

export type BuilderMode = 'workout' | 'template'

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  CONTINUOUS: 'Continuous',
  INTERVAL: 'Interval',
  REPETITION: 'Repetition',
  FREE_TEXT: 'Free text',
  RECOVERY: 'Recovery',
  REST: 'Rest',
}

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  pace: 'Pace',
  heartRate: 'Heart rate',
  heartRateZone: 'HR zone',
  power: 'Power',
  powerZone: 'Power zone',
  cadence: 'Cadence',
  rpe: 'RPE',
  speed: 'Speed',
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  EASY_RUN: 'Easy Run',
  RECOVERY_RUN: 'Recovery Run',
  LONG_RUN: 'Long Run',
  TEMPO: 'Tempo',
  THRESHOLD: 'Threshold',
  VO2_MAX: 'VO2 Max Intervals',
  INTERVALS: 'Intervals',
  FARTLEK: 'Fartlek',
  RACE_PACE: 'Race Pace',
  HILL_REPEATS: 'Hill Repeats',
  BRICK: 'Brick Workout',
  STRENGTH: 'Strength',
  CROSS_TRAINING: 'Cross Training',
  HYROX: 'HYROX',
  CUSTOM: 'Custom',
}
