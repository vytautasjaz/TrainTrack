'use server'

import { revalidatePath } from 'next/cache'
import { DayNoteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireSession, isCoach, isAthleteRole, requireCoachOwnsAthlete } from '@/lib/session'

async function resolveDayNoteAthleteId(formData: FormData) {
  const session = await requireSession()
  const formAthleteId = (formData.get('athleteId') as string | null)?.trim() || null

  if (isAthleteRole(session) && session.hasAthlete && (!isCoach(session) || !formAthleteId)) {
    if (!session.athleteId) throw new Error('No athlete profile')
    if (formAthleteId && formAthleteId !== session.athleteId) {
      throw new Error('Forbidden')
    }
    return session.athleteId
  }

  if (isCoach(session)) {
    const athleteId = formAthleteId ?? session.athleteId
    if (!athleteId) throw new Error('Athlete required')
    await requireCoachOwnsAthlete(session.userId, athleteId)
    return athleteId
  }

  if (isAthleteRole(session) && session.hasAthlete) {
    if (!session.athleteId) throw new Error('No athlete profile')
    return session.athleteId
  }

  throw new Error('Unauthorized')
}

export async function upsertDayNote(formData: FormData) {
  const athleteId = await resolveDayNoteAthleteId(formData)
  const date = formData.get('date') as string
  const unavailable = formData.get('unavailable') === 'on'
  const notesRaw = (formData.get('notes') as string)?.trim()
  const notes = notesRaw || null

  if (!date) throw new Error('Date is required')

  const parsedDate = parseDateOnly(date)

  if (!notes && !unavailable) {
    await prisma.dayNote.deleteMany({
      where: { athleteId, date: parsedDate },
    })
    revalidatePath('/training')
    revalidatePath('/dashboard')
    revalidatePath('/plan')
    return
  }

  const status = unavailable ? DayNoteStatus.BUSY : DayNoteStatus.AVAILABLE

  await prisma.dayNote.upsert({
    where: { athleteId_date: { athleteId, date: parsedDate } },
    create: { athleteId, date: parsedDate, status, notes },
    update: { status, notes },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath('/plan')
}

export async function deleteDayNote(formData: FormData) {
  const athleteId = await resolveDayNoteAthleteId(formData)
  const date = formData.get('date') as string
  if (!date) throw new Error('Date is required')

  await prisma.dayNote.deleteMany({
    where: { athleteId, date: parseDateOnly(date) },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath('/plan')
}
