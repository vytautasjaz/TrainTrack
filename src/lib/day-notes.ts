import { DayNoteStatus } from '@prisma/client'

export function isDayNoteUnavailable(status: DayNoteStatus): boolean {
  return status === DayNoteStatus.BUSY
}

export function getDayNoteDisplayText(note: DayNoteData): string {
  const text = note.notes?.trim()
  if (text) return text
  if (isDayNoteUnavailable(note.status)) return 'Unavailable'
  return ''
}

export type DayNoteData = {
  status: DayNoteStatus
  notes: string | null
}
