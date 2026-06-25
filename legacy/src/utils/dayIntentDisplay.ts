import type { CSSProperties } from 'react'
import type { DayIntentStatus } from '../types/dayIntent'

export const DAY_INTENT_COLORS: Record<
  DayIntentStatus,
  { dot: string; text: string; bg: string }
> = {
  needs_coach: { dot: '#c0267a', text: '#9d1f63', bg: '#fdf2f8' },
  available: { dot: '#8bc34a', text: '#558b2f', bg: '#f1f8e9' },
  self_planned: { dot: '#0ea5e9', text: '#075985', bg: '#e0f2fe' },
  busy: { dot: '#9ca3af', text: '#4b5563', bg: '#f3f4f6' },
}

export function getDayIntentDotStyle(status: DayIntentStatus): CSSProperties {
  return { backgroundColor: DAY_INTENT_COLORS[status].dot }
}

export function shouldCoachSchedule(status: DayIntentStatus): boolean {
  return status === 'needs_coach' || status === 'available'
}

export function shouldCoachSkip(status: DayIntentStatus): boolean {
  return status === 'busy' || status === 'self_planned'
}
