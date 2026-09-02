'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AthleteStatus, RaceOutcome, WorkoutType } from '@prisma/client'
import { format } from 'date-fns'
import { parseDateOnly, endOfWeekDateOnly, todayDateOnly, toDateKey } from '@/lib/dates'
import { prisma } from '@/lib/prisma'
import {
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  BIKE_SPEED_ZONE_FIELDS,
  BIKE_ZONE_ROWS,
  parsePaceMinPerKm,
  parseBikeSpeedKph,
  parseSwimCssSecPer100m,
  pickAthletePreferences,
  formatSwimCssSecPer100m,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import {
  displayPersonalBestDate,
  formatPersonalBestValue,
} from '@/lib/personal-bests'
import { isConfigurablePlanSport, parsePlanSportRows } from '@/lib/plan-sports'
import { RACE_OUTCOME_LABELS } from '@/lib/constants'
import { requireSession, isCoach, requireCoachOwnsAthlete, athleteOwnedByCoachWhere } from '@/lib/session'
import { daysUntil } from '@/lib/utils'
import { postCoachGeneralChatMessage } from '@/app/actions/coaching-inbox'

const VALID_STATUSES = new Set<string>(Object.values(AthleteStatus))

function raceResultLabel(outcome: RaceOutcome | null, resultTime: string | null): string | null {
  if (!outcome || outcome === 'DISMISSED') return null
  if (outcome === 'FINISHED') return resultTime || RACE_OUTCOME_LABELS.FINISHED
  return RACE_OUTCOME_LABELS[outcome]
}

function parseHrValue(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = parseInt(raw, 10)
  if (Number.isNaN(value) || value <= 0) return null
  return value
}

function revalidateAthletePaths(athleteId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/athletes')
  revalidatePath('/training')
  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/settings/preferences')
}

function splitAthleteName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? name, lastName: null as string | null }
  }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

const athletePreferencesSelect = {
  paceRecoveryMinPerKm: true,
  paceEasyMinPerKm: true,
  paceTempoMinPerKm: true,
  paceThresholdMinPerKm: true,
  paceVo2MaxMinPerKm: true,
  bikeSpeedRecoveryKph: true,
  bikeSpeedEasyKph: true,
  bikeSpeedTempoKph: true,
  bikeSpeedThresholdKph: true,
  bikeSpeedVo2MaxKph: true,
  bikeFtpWatts: true,
  swimCssSecPer100m: true,
  hrMax: true,
  hrResting: true,
  hrZone1Max: true,
  hrZone2Max: true,
  hrZone3Max: true,
  hrZone4Max: true,
} as const

export async function getAthleteCoachProfile(athleteId: string): Promise<{
  id: string
  name: string
  firstName: string
  lastName: string | null
  status: AthleteStatus
  avatarUrl: string | null
  trainingSince: string
  preferences: AthletePreferences
  planSportRows: WorkoutType[]
  stravaProfileUrl: string | null
  personalBests: Array<{
    id: string
    name: string
    valueLabel: string
    dateLabel: string
  }>
  upcomingRaces: Array<{
    id: string
    name: string
    dateLabel: string
    daysUntil: number
    location: string | null
  }>
  pastRaces: Array<{
    id: string
    name: string
    dateLabel: string
    location: string | null
    resultLabel: string | null
  }>
} | null> {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const today = todayDateOnly()

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, ...athleteOwnedByCoachWhere(session.userId) },
    select: {
      id: true,
      name: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
      planSportRows: true,
      ...athletePreferencesSelect,
      personalBests: {
        orderBy: { sortOrder: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          metric: true,
          value: true,
          dateText: true,
        },
      },
      races: {
        where: { intent: 'PLANNED', date: { gte: today } },
        orderBy: { date: 'asc' },
        take: 4,
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
        },
      },
      user: {
        select: {
          stravaConnection: {
            select: { stravaAthleteId: true },
          },
        },
      },
    },
  })
  if (!athlete) return null

  const pastRaceRows = await prisma.race.findMany({
    where: {
      athleteId: athlete.id,
      intent: 'PLANNED',
      date: { lt: today },
    },
    orderBy: { date: 'desc' },
    take: 6,
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      outcome: true,
      resultTime: true,
    },
  })

  const { firstName, lastName } = splitAthleteName(athlete.name)
  const stravaAthleteId = athlete.user?.stravaConnection?.stravaAthleteId

  return {
    id: athlete.id,
    name: athlete.name,
    firstName,
    lastName,
    status: athlete.status,
    avatarUrl: athlete.avatarUrl,
    trainingSince: format(athlete.createdAt, 'MMM yyyy'),
    planSportRows: athlete.planSportRows,
    preferences: pickAthletePreferences(athlete),
    stravaProfileUrl: stravaAthleteId
      ? `https://www.strava.com/athletes/${stravaAthleteId}`
      : null,
    personalBests: athlete.personalBests.map((pb) => ({
      id: pb.id,
      name: pb.name,
      valueLabel: formatPersonalBestValue(pb.value, pb.metric),
      dateLabel: displayPersonalBestDate(pb.dateText),
    })),
    upcomingRaces: athlete.races.map((race) => ({
      id: race.id,
      name: race.name,
      dateLabel: format(parseDateOnly(toDateKey(race.date)), 'MMM d, yyyy'),
      daysUntil: daysUntil(race.date),
      location: race.location,
    })),
    pastRaces: pastRaceRows.map((race) => ({
      id: race.id,
      name: race.name,
      dateLabel: format(parseDateOnly(toDateKey(race.date)), 'MMM d, yyyy'),
      location: race.location,
      resultLabel: raceResultLabel(race.outcome, race.resultTime),
    })),
  }
}

export async function updateAthleteStatusByCoach(athleteId: string, status: AthleteStatus) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  if (!VALID_STATUSES.has(status)) throw new Error('Invalid status')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { status },
  })

  revalidateAthletePaths(athleteId)
  revalidatePath('/settings/preferences')
}

export async function updateAthleteProfileByCoach(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

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

export async function updateAthleteZonesByCoach(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  if (!athleteId) throw new Error('Athlete required')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const data: Record<string, number | null> = {}

  for (const { key, name } of PACE_ZONE_FIELDS) {
    const raw = formData.get(name)
    if (typeof raw !== 'string' || !raw.trim()) {
      data[key] = null
      continue
    }
    const parsed = parsePaceMinPerKm(raw)
    if (parsed == null) {
      throw new Error(`Invalid pace for ${name}. Use format like 5:30.`)
    }
    data[key] = parsed
  }

  for (const { key, name } of BIKE_SPEED_ZONE_FIELDS) {
    const raw = formData.get(name)
    if (typeof raw !== 'string' || !raw.trim()) {
      data[key] = null
      continue
    }
    const parsed = parseBikeSpeedKph(raw)
    if (parsed == null) {
      throw new Error(`Invalid bike speed for ${name}. Use value like 28.5.`)
    }
    data[key] = parsed
  }

  const ftpRaw = formData.get('bikeFtpWatts')
  let bikeFtpWatts: number | null = null
  if (typeof ftpRaw === 'string' && ftpRaw.trim()) {
    const parsed = parseInt(ftpRaw.trim(), 10)
    if (!Number.isFinite(parsed) || parsed < 50 || parsed > 600) {
      throw new Error('FTP must be between 50 and 600 watts.')
    }
    bikeFtpWatts = parsed
  }

  const swimRaw = formData.get('swimCss')
  let swimCssSecPer100m: number | null = null
  if (typeof swimRaw === 'string' && swimRaw.trim()) {
    const parsed = parseSwimCssSecPer100m(swimRaw)
    if (parsed == null || parsed < 40 || parsed > 300) {
      throw new Error('CSS must look like 1:35 (per 100m).')
    }
    swimCssSecPer100m = parsed
  }

  for (const { key, name } of HR_ZONE_FIELDS) {
    data[key] = parseHrValue(formData.get(name))
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { ...data, bikeFtpWatts, swimCssSecPer100m },
  })

  const coach = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  })
  const coachLabel = coach?.name?.trim().split(/\s+/)[0] ?? 'Your coach'

  await postCoachGeneralChatMessage(
    athleteId,
    `${coachLabel} updated your training zones. Review them in Settings → Preferences.`,
  )

  revalidateAthletePaths(athleteId)
  revalidatePath('/inbox')
}

export async function updateAthletePlanSportRows(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

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
  if (!isCoach(session)) throw new Error('Coach only')

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
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const weekStartKey = formData.get('weekStart') as string
  const sport = formData.get('sport') as WorkoutType
  if (!athleteId || !weekStartKey || !isConfigurablePlanSport(sport)) {
    throw new Error('Invalid sport row')
  }

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const weekStart = parseDateOnly(weekStartKey)
  const weekEnd = endOfWeekDateOnly(weekStart)

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
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  if (!athleteId) throw new Error('Athlete required')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect('/training')
}

export async function deleteManagedAthlete(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = String(formData.get('athleteId') ?? '').trim()
  if (!athleteId) throw new Error('Athlete required')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { userId: true },
  })
  if (!athlete) throw new Error('Athlete not found')
  if (athlete.userId) {
    throw new Error('Cannot delete an athlete who has linked their app account')
  }

  await prisma.athlete.delete({ where: { id: athleteId } })

  const cookieStore = await cookies()
  if (cookieStore.get('tt_athlete')?.value === athleteId) {
    cookieStore.delete('tt_athlete')
  }

  revalidatePath('/dashboard')
  revalidatePath('/athletes')
  revalidatePath('/training')
}
