export type DayIntentStatus = 'available' | 'busy' | 'self_planned' | 'needs_coach'

export const DAY_INTENT_OPTIONS = [
  {
    value: 'needs_coach' as const,
    label: 'Need a workout',
    description: 'Ask coach to assign something for this day',
  },
  {
    value: 'available' as const,
    label: 'Available to train',
    description: 'Open for coach to schedule',
  },
  {
    value: 'self_planned' as const,
    label: 'Training on my own',
    description: 'Already have my own plan for this day',
  },
  {
    value: 'busy' as const,
    label: 'Unavailable',
    description: 'Rest day, travel, or other commitment',
  },
]

export type DayIntent = {
  id: string
  date: string
  status: DayIntentStatus
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type UpsertDayIntentInput = {
  date: string
  status: DayIntentStatus
  notes?: string
}

export function getDayIntentLabel(status: DayIntentStatus): string {
  return DAY_INTENT_OPTIONS.find((option) => option.value === status)?.label ?? status
}
