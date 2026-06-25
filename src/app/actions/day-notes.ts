'use server'

import { revalidatePath } from 'next/cache'
import { DayNoteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireSession } from '@/lib/session'

async function resolveDayNoteAthleteId(formData: FormData) {
  const session = await requireSession()
  const formAthleteId = (formData.get('athleteId') as string | null)?.trim() || null

  if (session.role === 'ATHLETE') {
    if (!session.athleteId) throw new Error('No athlete profile')
    if (formAthleteId && formAthleteId !== session.athleteId) {
      throw new Error('Forbidden')
    }
    return session.athleteId
  }

  if (session.role === 'COACH') {
    const athleteId = formAthleteId ?? session.athleteId
    if (!athleteId) throw new Error('Athlete required')

    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, coachId: session.userId },
    })
    if (!athlete) throw new Error('Athlete not found')
    return athleteId
  }

  throw new Error('Unauthorized')
}

export async function upsertDayNote(formData: FormData) {
  const athleteId = await resolveDayNoteAthleteId(formData)
  const date = formData.get('date') as string
  const status = formData.get('status') as DayNoteStatus
  const notesRaw = (formData.get('notes') as string)?.trim()
  const notes = notesRaw || null

  if (!date || !status) throw new Error('Date and status are required')

  await prisma.dayNote.upsert({
    where: { athleteId_date: { athleteId, date: parseDateOnly(date) } },
    create: { athleteId, date: parseDateOnly(date), status, notes },
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
