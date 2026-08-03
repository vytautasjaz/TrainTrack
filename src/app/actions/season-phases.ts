'use server'

import { revalidatePath } from 'next/cache'
import { SeasonPhase, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireSession, resolveAthleteId } from '@/lib/session'
import { PLANNER_SPORTS } from '@/lib/season-planner'

const PHASES = new Set<string>(Object.values(SeasonPhase))
const SPORTS = new Set<string>(PLANNER_SPORTS)

async function requireAthleteId() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  return athleteId
}

function parsePhase(raw: FormDataEntryValue | null): SeasonPhase {
  if (typeof raw !== 'string' || !PHASES.has(raw)) {
    throw new Error('Invalid season phase')
  }
  return raw as SeasonPhase
}

function parseSport(raw: FormDataEntryValue | null): WorkoutType {
  if (typeof raw !== 'string' || !SPORTS.has(raw)) {
    throw new Error('Invalid sport for season phase')
  }
  return raw as WorkoutType
}

export async function createSeasonPhaseBlock(formData: FormData) {
  const athleteId = await requireAthleteId()
  const sport = parseSport(formData.get('sport'))
  const phase = parsePhase(formData.get('phase'))
  const startDate = parseDateOnly(formData.get('startDate') as string)
  const endDate = parseDateOnly(formData.get('endDate') as string)
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error('End date must be on or after start date')
  }
  const labelRaw = formData.get('label')
  const label =
    typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : null

  await prisma.seasonPhaseBlock.create({
    data: { athleteId, sport, phase, startDate, endDate, label },
  })
  revalidatePath('/races')
}

export async function updateSeasonPhaseBlock(formData: FormData) {
  const athleteId = await requireAthleteId()
  const id = formData.get('id') as string
  const existing = await prisma.seasonPhaseBlock.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!existing) throw new Error('Phase block not found')

  const sport = parseSport(formData.get('sport'))
  const phase = parsePhase(formData.get('phase'))
  const startDate = parseDateOnly(formData.get('startDate') as string)
  const endDate = parseDateOnly(formData.get('endDate') as string)
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error('End date must be on or after start date')
  }
  const labelRaw = formData.get('label')
  const label =
    typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : null

  await prisma.seasonPhaseBlock.update({
    where: { id },
    data: { sport, phase, startDate, endDate, label },
  })
  revalidatePath('/races')
}

export async function deleteSeasonPhaseBlock(formData: FormData) {
  const athleteId = await requireAthleteId()
  const id = formData.get('id') as string
  const existing = await prisma.seasonPhaseBlock.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!existing) throw new Error('Phase block not found')
  await prisma.seasonPhaseBlock.delete({ where: { id } })
  revalidatePath('/races')
}
