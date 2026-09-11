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

import { putEventCoverFile } from '@/lib/event-cover-storage'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const RECENT_EVENTS_TAKE = 25
const EVENT_COVER_MAX_BYTES = 3 * 1024 * 1024
const EVENT_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Returns new URL, null to clear, or undefined when unchanged. */
async function resolveEventCoverUpdate(
  eventId: string,
  formData: FormData,
): Promise<string | null | undefined> {
  if (formData.get('clearCover') === '1') return null
  const file = formData.get('cover')
  if (!(file instanceof File) || file.size === 0) return undefined
  if (!EVENT_COVER_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, or WebP image for the cover.')
  }
  if (file.size > EVENT_COVER_MAX_BYTES) {
    throw new Error('Cover image must be 3 MB or smaller.')
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${eventId}.jpg`
  await putEventCoverFile(filename, buffer, 'image/jpeg')
  return `/uploads/event-covers/${filename}?v=${Date.now()}`
}

export type CoachRecentSeasonEvent = {
  id: string
  title: string
  notes: string | null
  startDate: string
  endDate: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
  location: string | null
  athleteId: string
  athleteName: string
}

async function requireAthleteContext() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  return { athleteId, isCoach: isCoachView(session) }
}

function parseIsPrivate(formData: FormData): boolean {
  return formData.get('isPrivate') === 'true'
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

function parseLocation(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  return raw.trim().slice(0, 120)
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function parseOptionalTime(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const clock = raw.trim().slice(0, 5)
  if (!TIME_RE.test(clock)) throw new Error('Time must be HH:mm')
  return clock
}

function parseAllDay(formData: FormData): boolean {
  return formData.get('allDay') !== 'false'
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
    where: {
      isPrivate: false,
      athlete: athleteOwnedByCoachWhere(session.userId),
    },
    orderBy: [{ updatedAt: 'desc' }, { startDate: 'desc' }],
    take: RECENT_EVENTS_TAKE,
    select: {
      id: true,
      title: true,
      notes: true,
      startDate: true,
      endDate: true,
      allDay: true,
      startTime: true,
      endTime: true,
      location: true,
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
    allDay: row.allDay,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    athleteId: row.athleteId,
    athleteName: row.athlete.name,
  }))
}

export async function createSeasonEvent(formData: FormData) {
  const { athleteId, isCoach } = await requireAthleteContext()
  const title = parseTitle(formData.get('title'))
  const notes = parseNotes(formData.get('notes'))
  const { startDate, endDate } = parseEventDateRange(
    formData.get('startDate'),
    formData.get('endDate'),
  )
  const isPrivate = isCoach ? false : parseIsPrivate(formData)
  const allDay = parseAllDay(formData)
  const location = parseLocation(formData.get('location'))
  const startTime = allDay ? null : parseOptionalTime(formData.get('startTime'))
  const endTime = allDay ? null : parseOptionalTime(formData.get('endTime'))

  const created = await prisma.seasonEvent.create({
    data: {
      athleteId,
      title,
      notes,
      startDate,
      endDate,
      isPrivate,
      allDay,
      startTime,
      endTime,
      location,
    },
    select: { id: true },
  })

  const coverUrl = await resolveEventCoverUpdate(created.id, formData)
  if (coverUrl) {
    await prisma.seasonEvent.update({
      where: { id: created.id },
      data: { coverImageUrl: coverUrl },
    })
  }

  revalidatePath('/season')
  revalidatePath('/training')
}

export async function updateSeasonEvent(formData: FormData) {
  const { athleteId, isCoach } = await requireAthleteContext()
  const id = formData.get('id') as string
  const existing = await prisma.seasonEvent.findFirst({
    where: { id, athleteId },
    select: { id: true, isPrivate: true },
  })
  if (!existing) throw new Error('Event not found')
  if (isCoach && existing.isPrivate) throw new Error('Event not found')

  const title = parseTitle(formData.get('title'))
  const notes = parseNotes(formData.get('notes'))
  const { startDate, endDate } = parseEventDateRange(
    formData.get('startDate'),
    formData.get('endDate'),
  )
  const isPrivate = isCoach ? existing.isPrivate : parseIsPrivate(formData)
  const allDay = parseAllDay(formData)
  const location = parseLocation(formData.get('location'))
  const startTime = allDay ? null : parseOptionalTime(formData.get('startTime'))
  const endTime = allDay ? null : parseOptionalTime(formData.get('endTime'))
  const coverUrl = await resolveEventCoverUpdate(id, formData)

  await prisma.seasonEvent.update({
    where: { id },
    data: {
      title,
      notes,
      startDate,
      endDate,
      isPrivate,
      allDay,
      startTime,
      endTime,
      location,
      ...(coverUrl !== undefined ? { coverImageUrl: coverUrl } : {}),
    },
  })
  revalidatePath('/season')
  revalidatePath('/training')
}

export async function deleteSeasonEvent(formData: FormData) {
  const { athleteId, isCoach } = await requireAthleteContext()
  const id = formData.get('id') as string
  const existing = await prisma.seasonEvent.findFirst({
    where: { id, athleteId },
    select: { id: true, isPrivate: true },
  })
  if (!existing) throw new Error('Event not found')
  if (isCoach && existing.isPrivate) throw new Error('Event not found')
  await prisma.seasonEvent.delete({ where: { id } })
  revalidatePath('/season')
  revalidatePath('/training')
}
