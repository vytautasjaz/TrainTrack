import { DayNoteStatus } from '@prisma/client'

export type DayNoteKind = 'athlete' | 'coach'

export type DayNoteData = {
  status: DayNoteStatus
  athleteNotes: string | null
  /** Present when viewer is the athlete (author). */
  athleteNotesPrivate?: boolean
  coachNotes: string | null
  /** Present when viewer is the coach (author). */
  coachNotesPrivate?: boolean
}

export type DayNoteViewer = 'athlete' | 'coach'

export function isDayNoteUnavailable(status: DayNoteStatus): boolean {
  return status === DayNoteStatus.BUSY
}

export function getDayNoteKindText(
  note: DayNoteData,
  kind: DayNoteKind,
): string {
  const text =
    kind === 'athlete' ? note.athleteNotes?.trim() : note.coachNotes?.trim()
  return text || ''
}

export function getDayNoteDisplayText(note: DayNoteData): string {
  const athlete = note.athleteNotes?.trim()
  if (athlete) return athlete
  const coach = note.coachNotes?.trim()
  if (coach) return coach
  if (isDayNoteUnavailable(note.status)) return 'Unavailable'
  return ''
}

/** True when the viewer should see anything in the Notes row for this day. */
export function dayNoteHasVisibleContent(note: DayNoteData | null | undefined): boolean {
  if (!note) return false
  if (isDayNoteUnavailable(note.status)) return true
  if (note.athleteNotes?.trim()) return true
  if (note.coachNotes?.trim()) return true
  return false
}

export function dayNoteKindHasContent(
  note: DayNoteData | null | undefined,
  kind: DayNoteKind,
): boolean {
  if (!note) return false
  if (kind === 'athlete') {
    return Boolean(note.athleteNotes?.trim()) || isDayNoteUnavailable(note.status)
  }
  return Boolean(note.coachNotes?.trim())
}

type RawDayNote = {
  status: DayNoteStatus
  athleteNotes: string | null
  athleteNotesPrivate: boolean
  coachNotes: string | null
  coachNotesPrivate: boolean
}

/**
 * Strip the other party's private notes before sending to the client.
 * Authors still see their own private text + private flag.
 */
export function redactDayNoteForViewer(
  note: RawDayNote,
  viewer: DayNoteViewer,
): DayNoteData {
  const athletePrivate = Boolean(note.athleteNotesPrivate)
  const coachPrivate = Boolean(note.coachNotesPrivate)

  if (viewer === 'coach') {
    return {
      status: note.status,
      athleteNotes: athletePrivate ? null : note.athleteNotes,
      coachNotes: note.coachNotes,
      coachNotesPrivate: coachPrivate,
    }
  }

  return {
    status: note.status,
    athleteNotes: note.athleteNotes,
    athleteNotesPrivate: athletePrivate,
    coachNotes: coachPrivate ? null : note.coachNotes,
  }
}

export function toDayNoteData(note: RawDayNote): DayNoteData {
  return {
    status: note.status,
    athleteNotes: note.athleteNotes,
    athleteNotesPrivate: note.athleteNotesPrivate,
    coachNotes: note.coachNotes,
    coachNotesPrivate: note.coachNotesPrivate,
  }
}
