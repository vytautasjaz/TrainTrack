'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { parseDateOnly, toDateKey } from '@/lib/dates'
import {
  athleteOwnedByCoachWhere,
  isCoachView,
  requireSession,
  resolveAthleteId,
} from '@/lib/session'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const RECENT_EVENTS_TAKE = 25

export type CoachRecentSeasonEvent = {
  id: string
  title: string
  notes: string | null
  startDate: string
  endDate: string
  athleteId: string
  athleteName: string
}

async function requireAthleteId() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  return athleteId
}

function parseTitle(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Title is required')
  }
  const title = raw.trim()
  if (title.length > 120) throw new Error('Title is too long')
  return title
}

function parseNotes(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  return raw.trim().slice(0, 500)
}

/** Parse YYYY-MM-DD; if end is missing or before start, clamp to a valid range. */
function parseEventDateRange(
  startRaw: FormDataEntryValue | null,
  endRaw: FormDataEntryValue | null,
): { startDate: Date; endDate: Date } {
  if (typeof startRaw !== 'string' || !DATE_RE.test(startRaw)) {
    throw new Error('Start date is required')
  }
  const startDate = parseDateOnly(startRaw)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid start date')
  }

  let endDate =
    typeof endRaw === 'string' && DATE_RE.test(endRaw)
      ? parseDateOnly(endRaw)
      : startDate
  if (Number.isNaN(endDate.getTime())) {
    endDate = startDate
  }
  // Reversed range → swap so the span stays valid
  if (endDate.getTime() < startDate.getTime()) {
    return { startDate: endDate, endDate: startDate }
  }
  return { startDate, endDate }
}

/** Recent season events across the coach roster — for Add event “Reuse from…”. */
export async function listCoachRecentSeasonEvents(): Promise<CoachRecentSeasonEvent[]> {
  const session = await requireSession()
  if (!isCoachView(session)) return []

  const rows = await prisma.seasonEvent.findMany({
    where: { athlete: athleteOwnedByCoachWhere(session.userId) },
    orderBy: [{ updatedAt: 'desc' }, { startDate: 'desc' }],
    take: RECENT_EVENTS_TAKE,
    select: {
      id: true,
      title: true,
      notes: true,
      startDate: true,
      endDate: true,
      athleteId: true,
      athlete: { select: { name: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    startDate: toDateKey(row.startDate),
    endDate: toDateKey(row.endDate),
    athleteId: row.athleteId,
    athleteName: row.athlete.name,
  }))
}

export async function createSeasonEvent(formData: FormData) {
  const athleteId = await requireAthleteId()
  const title = parseTitle(formData.get('title'))
  const notes = parseNotes(formData.get('notes'))
  const { startDate, endDate } = parseEventDateRange(
    formData.get('startDate'),
    formData.get('endDate'),
  )

  await prisma.seasonEvent.create({
    data: { athleteId, title, notes, startDate, endDate },
  })
  revalidatePath('/season')
  revalidatePath('/training')
}

export async function updateSeasonEvent(formData: FormData) {
  const athleteId = await requireAthleteId()
  const id = formData.get('id') as string
  const existing = await prisma.seasonEvent.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!existing) throw new Error('Event not found')

  const title = parseTitle(formData.get('title'))
  const notes = parseNotes(formData.get('notes'))
  const { startDate, endDate } = parseEventDateRange(
    formData.get('startDate'),
    formData.get('endDate'),
  )

  await prisma.seasonEvent.update({
    where: { id },
    data: { title, notes, startDate, endDate },
  })
  revalidatePath('/season')
  revalidatePath('/training')
}

export async function deleteSeasonEvent(formData: FormData) {
  const athleteId = await requireAthleteId()
  const id = formData.get('id') as string
  const existing = await prisma.seasonEvent.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!existing) throw new Error('Event not found')
  await prisma.seasonEvent.delete({ where: { id } })
  revalidatePath('/season')
  revalidatePath('/training')
}
