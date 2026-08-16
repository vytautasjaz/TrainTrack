'use server'

import { revalidatePath } from 'next/cache'
import { DayNoteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireSession, isCoachView, requireCoachOwnsAthlete } from '@/lib/session'
import type { DayNoteKind } from '@/lib/day-notes'

/**
 * Note kind follows the active workspace (view mode), not merely whether the
 * user has both roles. Dual-role users in athlete view write athlete notes;
 * in coach view they write coach notes.
 */
async function resolveDayNoteAthleteId(formData: FormData) {
  const session = await requireSession()
  const formAthleteId = (formData.get('athleteId') as string | null)?.trim() || null

  if (isCoachView(session)) {
    const athleteId = formAthleteId ?? session.athleteId
    if (!athleteId) throw new Error('Athlete required')
    await requireCoachOwnsAthlete(session.userId, athleteId)
    return { athleteId, kind: 'coach' as const }
  }

  if (session.hasAthlete && session.athleteId) {
    if (formAthleteId && formAthleteId !== session.athleteId) {
      throw new Error('Forbidden')
    }
    return { athleteId: session.athleteId, kind: 'athlete' as const }
  }

  throw new Error('Unauthorized')
}

function revalidateDayNotePaths() {
  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath('/plan')
}

function hasCoachNotes(row: { coachNotes: string | null } | null | undefined) {
  return Boolean(row?.coachNotes?.trim())
}

function hasAthleteContent(row: {
  athleteNotes: string | null
  status: DayNoteStatus
} | null | undefined) {
  return (
    Boolean(row?.athleteNotes?.trim()) || row?.status === DayNoteStatus.BUSY
  )
}

export async function upsertDayNote(formData: FormData) {
  const { athleteId, kind } = await resolveDayNoteAthleteId(formData)
  const date = formData.get('date') as string
  const notesRaw = (formData.get('notes') as string)?.trim()
  const notes = notesRaw || null
  const isPrivate = formData.get('notesPrivate') === 'true'
  const unavailable = formData.get('unavailable') === 'on'
  const noteKind: DayNoteKind = kind

  if (!date) throw new Error('Date is required')
  const parsedDate = parseDateOnly(date)

  const existing = await prisma.dayNote.findUnique({
    where: { athleteId_date: { athleteId, date: parsedDate } },
  })

  if (noteKind === 'athlete') {
    const status = unavailable ? DayNoteStatus.BUSY : DayNoteStatus.AVAILABLE
    const keepForCoach = hasCoachNotes(existing)

    if (!notes && !unavailable) {
      if (!keepForCoach) {
        await prisma.dayNote.deleteMany({
          where: { athleteId, date: parsedDate },
        })
      } else {
        await prisma.dayNote.update({
          where: { athleteId_date: { athleteId, date: parsedDate } },
          data: {
            athleteNotes: null,
            athleteNotesPrivate: false,
            status: DayNoteStatus.AVAILABLE,
          },
        })
      }
      revalidateDayNotePaths()
      return
    }

    await prisma.dayNote.upsert({
      where: { athleteId_date: { athleteId, date: parsedDate } },
      create: {
        athleteId,
        date: parsedDate,
        status,
        athleteNotes: notes,
        athleteNotesPrivate: isPrivate,
      },
      update: {
        status,
        athleteNotes: notes,
        athleteNotesPrivate: isPrivate,
      },
    })
    revalidateDayNotePaths()
    return
  }

  // Coach note
  if (!notes) {
    if (!hasAthleteContent(existing)) {
      await prisma.dayNote.deleteMany({
        where: { athleteId, date: parsedDate },
      })
    } else {
      await prisma.dayNote.update({
        where: { athleteId_date: { athleteId, date: parsedDate } },
        data: {
          coachNotes: null,
          coachNotesPrivate: false,
        },
      })
    }
    revalidateDayNotePaths()
    return
  }

  await prisma.dayNote.upsert({
    where: { athleteId_date: { athleteId, date: parsedDate } },
    create: {
      athleteId,
      date: parsedDate,
      status: DayNoteStatus.AVAILABLE,
      coachNotes: notes,
      coachNotesPrivate: isPrivate,
    },
    update: {
      coachNotes: notes,
      coachNotesPrivate: isPrivate,
    },
  })
  revalidateDayNotePaths()
}

/** Clears the current role's note fields; deletes the row when nothing remains. */
export async function deleteDayNote(formData: FormData) {
  const { athleteId, kind } = await resolveDayNoteAthleteId(formData)
  const date = formData.get('date') as string
  if (!date) throw new Error('Date is required')
  const parsedDate = parseDateOnly(date)

  const existing = await prisma.dayNote.findUnique({
    where: { athleteId_date: { athleteId, date: parsedDate } },
  })
  if (!existing) {
    revalidateDayNotePaths()
    return
  }

  if (kind === 'athlete') {
    if (hasCoachNotes(existing)) {
      await prisma.dayNote.update({
        where: { athleteId_date: { athleteId, date: parsedDate } },
        data: {
          athleteNotes: null,
          athleteNotesPrivate: false,
          status: DayNoteStatus.AVAILABLE,
        },
      })
    } else {
      await prisma.dayNote.delete({
        where: { athleteId_date: { athleteId, date: parsedDate } },
      })
    }
  } else if (hasAthleteContent(existing)) {
    await prisma.dayNote.update({
      where: { athleteId_date: { athleteId, date: parsedDate } },
      data: {
        coachNotes: null,
        coachNotesPrivate: false,
      },
    })
  } else {
    await prisma.dayNote.delete({
      where: { athleteId_date: { athleteId, date: parsedDate } },
    })
  }

  revalidateDayNotePaths()
}
