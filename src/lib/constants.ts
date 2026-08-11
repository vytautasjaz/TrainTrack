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
  FIVE_K: '5 km',
  TEN_K: '10 km',
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
  FIVE_K: '5 km',
  TEN_K: '10 km',
  HYROX: 'HYROX',
  TRIATHLON: 'Triathlon',
  CYCLING: 'Cycling',
  OTHER: 'Race',
}

export const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  RUN: 'bg-[var(--color-sport-run-bg)] text-[var(--color-sport-run)]',
  BIKE: 'bg-[var(--color-sport-bike-bg)] text-[var(--color-sport-bike)]',
  SWIM: 'bg-[var(--color-sport-swim-bg)] text-[var(--color-sport-swim)]',
  STRENGTH: 'bg-[var(--color-sport-strength-bg)] text-[var(--color-sport-strength)]',
  HYROX: 'bg-[var(--color-sport-hyrox-bg)] text-[var(--color-sport-hyrox)]',
  TRIATHLON: 'bg-[var(--color-sport-tri-bg)] text-[var(--color-sport-tri)]',
  RECOVERY: 'bg-[var(--color-sport-recovery-bg)] text-[var(--color-sport-recovery)]',
  REST: 'bg-[var(--color-sport-rest-bg)] text-[var(--color-sport-rest)]',
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
