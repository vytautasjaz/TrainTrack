'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AthleteStatus, WorkoutType } from '@prisma/client'
import { endOfWeek } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  parsePaceMinPerKm,
  pickAthletePreferences,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { isConfigurablePlanSport, parsePlanSportRows } from '@/lib/plan-sports'
import { parseDateOnly } from '@/lib/dates'
import { requireSession } from '@/lib/session'

const VALID_STATUSES = new Set<string>(Object.values(AthleteStatus))

async function requireCoachOwnsAthlete(coachId: string, athleteId: string) {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId },
    select: { id: true },
  })
  if (!athlete) throw new Error('Athlete not found')
}

function parseHrValue(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = parseInt(raw, 10)
  if (Number.isNaN(value) || value <= 0) return null
  return value
}

function revalidateAthletePaths(athleteId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${athleteId}`)
}

export async function getAthleteCoachProfile(athleteId: string): Promise<{
  id: string
  name: string
  status: AthleteStatus
  preferences: AthletePreferences
  planSportRows: WorkoutType[]
} | null> {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: session.userId },
    select: {
      id: true,
      name: true,
      status: true,
      planSportRows: true,
      paceRecoveryMinPerKm: true,
      paceEasyMinPerKm: true,
      paceTempoMinPerKm: true,
      paceThresholdMinPerKm: true,
      paceVo2MaxMinPerKm: true,
      hrMax: true,
      hrResting: true,
      hrZone1Max: true,
      hrZone2Max: true,
      hrZone3Max: true,
      hrZone4Max: true,
    },
  })
  if (!athlete) return null

  return {
    id: athlete.id,
    name: athlete.name,
    status: athlete.status,
    planSportRows: athlete.planSportRows,
    preferences: pickAthletePreferences(athlete),
  }
}

export async function updateAthleteProfileByCoach(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const status = formData.get('status') as string
  const name = ((formData.get('name') as string) ?? '').trim()

  if (!athleteId || !VALID_STATUSES.has(status)) throw new Error('Invalid status')
  if (!name) throw new Error('Name is required.')
  if (name.length > 120) throw new Error('Name is too long.')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const planSportRows = parsePlanSportRows(formData.getAll('planSportRows'))
  if (planSportRows.length === 0) {
    throw new Error('Select at least one default sport row.')
  }

  const data: Record<string, string | number | null | AthleteStatus | WorkoutType[]> = {
    name,
    status: status as AthleteStatus,
    planSportRows,
  }

  for (const { key, name: fieldName } of PACE_ZONE_FIELDS) {
    const raw = formData.get(fieldName)
    if (typeof raw !== 'string' || !raw.trim()) {
      data[key] = null
      continue
    }
    const parsed = parsePaceMinPerKm(raw)
    if (parsed == null) {
      throw new Error(`Invalid pace for ${fieldName}. Use format like 5:30.`)
    }
    data[key] = parsed
  }

  for (const { key, name: fieldName } of HR_ZONE_FIELDS) {
    data[key] = parseHrValue(formData.get(fieldName))
  }

  const athlete = await prisma.athlete.update({
    where: { id: athleteId },
    data,
    select: { userId: true },
  })

  if (athlete.userId) {
    await prisma.user.update({
      where: { id: athlete.userId },
      data: { name },
    })
  }

  revalidateAthletePaths(athleteId)
}

export async function updateAthletePlanSportRows(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  if (!athleteId) throw new Error('Athlete required')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const planSportRows = parsePlanSportRows(formData.getAll('planSportRows'))
  if (planSportRows.length === 0) {
    throw new Error('Select at least one default sport row.')
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { planSportRows },
  })

  revalidateAthletePaths(athleteId)
}

export async function addExtraPlanSportRow(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const weekStartKey = formData.get('weekStart') as string
  const sport = formData.get('sport') as WorkoutType
  if (!athleteId || !weekStartKey || !isConfigurablePlanSport(sport)) {
    throw new Error('Invalid sport row')
  }

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const weekStart = parseDateOnly(weekStartKey)

  const athlete = await prisma.athlete.findUniqueOrThrow({
    where: { id: athleteId },
    select: { planSportRows: true },
  })

  if (athlete.planSportRows.includes(sport)) {
    await prisma.athleteWeekHiddenPlanSportRow.deleteMany({
      where: { athleteId, weekStart, sport },
    })
    revalidateAthletePaths(athleteId)
    return
  }

  await prisma.athleteWeekPlanSportRow.upsert({
    where: {
      athleteId_weekStart_sport: { athleteId, weekStart, sport },
    },
    create: { athleteId, weekStart, sport },
    update: {},
  })

  await prisma.athleteWeekHiddenPlanSportRow.deleteMany({
    where: { athleteId, weekStart, sport },
  })

  revalidateAthletePaths(athleteId)
}

export async function removeEmptyPlanSportRow(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const weekStartKey = formData.get('weekStart') as string
  const sport = formData.get('sport') as WorkoutType
  if (!athleteId || !weekStartKey || !isConfigurablePlanSport(sport)) {
    throw new Error('Invalid sport row')
  }

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const weekStart = parseDateOnly(weekStartKey)
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  const workoutCount = await prisma.workout.count({
    where: {
      athleteId,
      type: sport,
      date: { gte: weekStart, lte: weekEnd },
    },
  })
  if (workoutCount > 0) throw new Error('Cannot remove a sport row that has workouts this week')

  const extraRow = await prisma.athleteWeekPlanSportRow.findUnique({
    where: {
      athleteId_weekStart_sport: { athleteId, weekStart, sport },
    },
  })

  if (extraRow) {
    await prisma.athleteWeekPlanSportRow.delete({ where: { id: extraRow.id } })
  } else {
    const athlete = await prisma.athlete.findUniqueOrThrow({
      where: { id: athleteId },
      select: { planSportRows: true },
    })
    if (!athlete.planSportRows.includes(sport)) {
      throw new Error('Sport row cannot be removed')
    }

    await prisma.athleteWeekHiddenPlanSportRow.upsert({
      where: {
        athleteId_weekStart_sport: { athleteId, weekStart, sport },
      },
      create: { athleteId, weekStart, sport },
      update: {},
    })
  }

  revalidateAthletePaths(athleteId)
}

export async function selectAthleteForTraining(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  if (!athleteId) throw new Error('Athlete required')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect('/training')
}
