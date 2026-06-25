import { DayNoteStatus } from '@prisma/client'

export const DAY_NOTE_OPTIONS: {
  value: DayNoteStatus
  label: string
  description: string
}[] = [
  {
    value: DayNoteStatus.NEEDS_COACH,
    label: 'Need a workout',
    description: 'Ask coach to assign something for this day',
  },
  {
    value: DayNoteStatus.AVAILABLE,
    label: 'Available to train',
    description: 'Open for coach to schedule',
  },
  {
    value: DayNoteStatus.SELF_PLANNED,
    label: 'Training on my own',
    description: 'Already have my own plan for this day',
  },
  {
    value: DayNoteStatus.BUSY,
    label: 'Unavailable',
    description: 'Rest day, travel, or other commitment',
  },
]

export const DAY_NOTE_COLORS: Record<
  DayNoteStatus,
  { dot: string; text: string; bg: string }
> = {
  NEEDS_COACH: { dot: '#c0267a', text: '#9d1f63', bg: '#fdf2f8' },
  AVAILABLE: { dot: '#8bc34a', text: '#558b2f', bg: '#f1f8e9' },
  SELF_PLANNED: { dot: '#0ea5e9', text: '#075985', bg: '#e0f2fe' },
  BUSY: { dot: '#9ca3af', text: '#4b5563', bg: '#f3f4f6' },
}

export function getDayNoteLabel(status: DayNoteStatus): string {
  return DAY_NOTE_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export type DayNoteData = {
  status: DayNoteStatus
  notes: string | null
}
