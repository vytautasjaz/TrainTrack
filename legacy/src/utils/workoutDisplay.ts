import type { CSSProperties } from 'react'
import type { EnduranceDetails, Workout, WorkoutExecutionStatus, WorkoutType } from '../types/workout'
import { getWorkoutTypeLabel, isEnduranceType } from '../types/workout'

function formatEndurance(details?: EnduranceDetails): string | null {
  if (!details) return null
  const parts: string[] = []
  if (details.distanceKm != null) parts.push(`${details.distanceKm} km`)
  if (details.durationMin != null) parts.push(`${details.durationMin} min`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function formatExerciseSummary(workout: Workout): string | null {
  if (!workout.exercises?.length) return null
  return workout.exercises
    .map((ex) => {
      const parts = [ex.name]
      if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`)
      else if (ex.sets) parts.push(`${ex.sets} sets`)
      if (ex.weight) parts.push(`${ex.weight}kg`)
      return parts.join(' · ')
    })
    .join(', ')
}

export function formatWorkoutSummary(workout: Workout): string | null {
  const type = workout.type

  if (type === 'brick' && workout.brick?.length) {
    return workout.brick
      .map((segment) => {
        const label = getWorkoutTypeLabel(segment.sport)
        const details = formatEndurance(segment.details)
        return details ? `${label}: ${details}` : label
      })
      .join(' → ')
  }

  if (type && isEnduranceType(type)) {
    return formatEndurance(workout.endurance)
  }

  return formatExerciseSummary(workout)
}

export const WORKOUT_COLOR_THEME: Record<
  WorkoutType,
  { dot: string; badgeBg: string; badgeText: string; border: string }
> = {
  running: { dot: '#f97316', badgeBg: '#ffedd5', badgeText: '#9a3412', border: '#fdba74' },
  cycling: { dot: '#0ea5e9', badgeBg: '#e0f2fe', badgeText: '#075985', border: '#7dd3fc' },
  swimming: { dot: '#06b6d4', badgeBg: '#cffafe', badgeText: '#155e75', border: '#67e8f9' },
  brick: { dot: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#5b21b6', border: '#c4b5fd' },
  gym: { dot: '#10b981', badgeBg: '#d1fae5', badgeText: '#065f46', border: '#6ee7b7' },
  hyrox: { dot: '#f43f5e', badgeBg: '#ffe4e6', badgeText: '#9f1239', border: '#fda4af' },
}

export function resolveWorkoutType(type?: WorkoutType): WorkoutType {
  return type ?? 'gym'
}

export function getWorkoutDotStyle(type: WorkoutType): CSSProperties {
  return { backgroundColor: WORKOUT_COLOR_THEME[type].dot }
}

const EXECUTION_STATUS_LABELS: Record<WorkoutExecutionStatus, string> = {
  completed: 'Completed',
  partial: 'Partially done',
  skipped: 'Skipped',
}

export function getExecutionStatusLabel(status: WorkoutExecutionStatus): string {
  return EXECUTION_STATUS_LABELS[status]
}

export function formatExecutionSummary(workout: Workout): string | null {
  if (!workout.execution) return null

  const parts: string[] = [getExecutionStatusLabel(workout.execution.status)]

  if (workout.execution.feelRating != null) {
    parts.push(`felt ${workout.execution.feelRating}/5`)
  }

  const actualEndurance = formatEndurance(workout.execution.actualEndurance)
  if (actualEndurance) {
    parts.push(`actual: ${actualEndurance}`)
  }

  return parts.join(' · ')
}

export function hasExecution(workout: Workout): boolean {
  return Boolean(workout.execution?.loggedAt)
}

export type DisplayExecutionStatus = WorkoutExecutionStatus | 'planned' | 'mixed'

export const EXECUTION_STATUS_THEME: Record<
  DisplayExecutionStatus,
  { bg: string; text: string; badgeBg: string; badgeText: string; border: string }
> = {
  planned: {
    bg: '#8bc34a',
    text: '#ffffff',
    badgeBg: '#f1f8e9',
    badgeText: '#558b2f',
    border: '#8bc34a',
  },
  completed: {
    bg: '#22c55e',
    text: '#ffffff',
    badgeBg: '#dcfce7',
    badgeText: '#166534',
    border: '#22c55e',
  },
  partial: {
    bg: '#f59e0b',
    text: '#ffffff',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    border: '#f59e0b',
  },
  skipped: {
    bg: '#ef4444',
    text: '#ffffff',
    badgeBg: '#fee2e2',
    badgeText: '#991b1b',
    border: '#ef4444',
  },
  mixed: {
    bg: '#94a3b8',
    text: '#ffffff',
    badgeBg: '#f1f5f9',
    badgeText: '#475569',
    border: '#94a3b8',
  },
}

export function getWorkoutDisplayStatus(workout: Workout): WorkoutExecutionStatus | 'planned' {
  if (!hasExecution(workout)) return 'planned'
  return workout.execution!.status
}

export function getDayDisplayStatus(dots: { executionStatus?: WorkoutExecutionStatus | 'planned' }[]): DisplayExecutionStatus {
  if (dots.length === 0) return 'planned'

  const statuses = dots.map((dot) => dot.executionStatus ?? 'planned')
  const unique = new Set(statuses)

  if (unique.size === 1) return [...unique][0] as DisplayExecutionStatus
  return 'mixed'
}

export function getExecutionStatusTheme(status: DisplayExecutionStatus) {
  return EXECUTION_STATUS_THEME[status]
}

export function getCalendarDotStyle(dot: {
  type: WorkoutType
  executionStatus?: WorkoutExecutionStatus | 'planned'
}): CSSProperties {
  const status = dot.executionStatus ?? 'planned'
  if (status === 'planned') {
    return getWorkoutDotStyle(dot.type)
  }
  return { backgroundColor: EXECUTION_STATUS_THEME[status].bg }
}

export function getDayCircleStyle(status: DisplayExecutionStatus): CSSProperties {
  const theme = EXECUTION_STATUS_THEME[status]
  return {
    backgroundColor: theme.bg,
    color: theme.text,
  }
}
