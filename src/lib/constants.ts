import {
  WorkoutStatus,
  WorkoutType,
  RaceType,
  RacePriority,
  RaceIntent,
  RaceOutcome,
  UserRole,
  AthleteLogType,
} from '@prisma/client'

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  RUN: 'Run',
  BIKE: 'Bike',
  SWIM: 'Swim',
  STRENGTH: 'Strength',
  HYROX: 'HYROX',
  TRIATHLON: 'Triathlon',
  RECOVERY: 'Recovery',
  REST: 'Rest',
}

export const WORKOUT_STATUS_LABELS: Record<WorkoutStatus, string> = {
  PLANNED: 'Planned',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
}

export const ATHLETE_LOG_TYPE_LABELS: Record<AthleteLogType, string> = {
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
  ADJUSTED: 'Adjusted',
  RESCHEDULED: 'Rescheduled',
}

export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  MARATHON: 'Marathon',
  HALF_MARATHON: 'Half Marathon',
  HYROX: 'HYROX',
  TRIATHLON: 'Triathlon',
  CYCLING: 'Cycling Event',
  OTHER: 'Other',
}

export const RACE_PRIORITY_LABELS: Record<RacePriority, string> = {
  A: 'Goal',
  B: 'Important',
  C: 'Training',
}

export const RACE_INTENT_LABELS: Record<RaceIntent, string> = {
  PLANNED: 'Planned',
  WATCHING: 'Watching',
}

export const RACE_OUTCOME_LABELS: Record<RaceOutcome, string> = {
  FINISHED: 'Finished',
  DID_NOT_START: 'Did not start',
  DNF: 'DNF',
  DISMISSED: 'Skipped log',
}

export const RACE_TYPE_DISTANCE_LABELS: Record<RaceType, string> = {
  MARATHON: '42.2 km',
  HALF_MARATHON: '21.1 km',
  HYROX: 'HYROX',
  TRIATHLON: 'Triathlon',
  CYCLING: 'Cycling',
  OTHER: 'Race',
}

export const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  RUN: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  BIKE: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  SWIM: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  STRENGTH: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  HYROX: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  TRIATHLON: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  RECOVERY: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  REST: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
}

export const STATUS_COLORS: Record<WorkoutStatus, string> = {
  PLANNED: 'border-l-emerald-500',
  COMPLETED: 'border-l-green-500',
  SKIPPED: 'border-l-red-500',
}

export const SPORT_ROW_ORDER: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.TRIATHLON,
  WorkoutType.STRENGTH,
  WorkoutType.HYROX,
  WorkoutType.RECOVERY,
  WorkoutType.REST,
]

export { UserRole, WorkoutType, WorkoutStatus, RaceType, RacePriority, RaceIntent, RaceOutcome, AthleteLogType }
