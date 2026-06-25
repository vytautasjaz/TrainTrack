export type Exercise = {
  name: string
  sets?: number
  reps?: number
  weight?: number
}

export const WORKOUT_TYPES = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'brick', label: 'Brick' },
  { value: 'gym', label: 'Gym' },
  { value: 'hyrox', label: 'Hyrox' },
] as const

export type WorkoutType = (typeof WORKOUT_TYPES)[number]['value']

export type EnduranceSport = 'running' | 'cycling' | 'swimming'

export const ENDURANCE_SPORTS = [
  { value: 'running' as const, label: 'Running' },
  { value: 'cycling' as const, label: 'Cycling' },
  { value: 'swimming' as const, label: 'Swimming' },
]

export type EnduranceDetails = {
  distanceKm?: number
  durationMin?: number
}

export type BrickSegment = {
  sport: EnduranceSport
  details?: EnduranceDetails
}

export type WorkoutExecutionStatus = 'completed' | 'partial' | 'skipped'

export type WorkoutExecution = {
  status: WorkoutExecutionStatus
  feedback?: string
  feelRating?: 1 | 2 | 3 | 4 | 5
  actualEndurance?: EnduranceDetails
  actualExercises?: Exercise[]
  loggedAt?: string
}

export type Workout = {
  id: string
  date: string
  type?: WorkoutType
  title: string
  notes?: string
  endurance?: EnduranceDetails
  brick?: BrickSegment[]
  exercises?: Exercise[]
  execution?: WorkoutExecution
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type CreateWorkoutInput = {
  date: string
  type: WorkoutType
  title: string
  notes?: string
  endurance?: EnduranceDetails
  brick?: BrickSegment[]
  exercises?: Exercise[]
}

export type UpdateWorkoutExecutionInput = {
  status: WorkoutExecutionStatus
  feedback?: string
  feelRating?: 1 | 2 | 3 | 4 | 5
  actualEndurance?: EnduranceDetails
  actualExercises?: Exercise[]
}

export function isEnduranceType(type: WorkoutType): type is EnduranceSport {
  return type === 'running' || type === 'cycling' || type === 'swimming'
}

export function usesExercises(type: WorkoutType): boolean {
  return type === 'gym' || type === 'hyrox'
}

export type CalendarWorkoutDot = {
  id: string
  type: WorkoutType
  executionStatus?: WorkoutExecutionStatus | 'planned'
}

export function getWorkoutTypeLabel(type?: WorkoutType): string {
  if (!type) return 'Workout'
  return WORKOUT_TYPES.find((t) => t.value === type)?.label ?? type
}
