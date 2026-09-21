'use server'

import { prisma } from '@/lib/prisma'
import {
  requireSession,
  resolveAthleteId,
  isCoach,
  isCoachView,
  isAthleteRole,
  coachCanAccessAthlete,
  athleteOwnedByCoachWhere,
} from '@/lib/session'
import { toDateKey } from '@/lib/dates'
import type { SeasonRace } from '@/lib/season-races'
import type { RaceLegView } from '@/lib/race-legs'
import { readPreparationBlocks } from '@/lib/race-preparation'
import type {
  RaceCourseType,
  RacePriority,
  RaceType,
  HyroxDivision,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'

const RECENT_RACES_TAKE = 25

const SEASON_RACE_SELECT = {
  id: true,
  name: true,
  date: true,
  location: true,
  type: true,
  sport: true,
  courseType: true,
  triathlonDistance: true,
  hyroxDivision: true,
  customDistanceKm: true,
  priority: true,
  intent: true,
  goal: true,
  url: true,
  coverImageUrl: true,
  preparationWeeks: true,
  preparationBlocks: true,
  outcome: true,
  resultTime: true,
  resultPlace: true,
  resultPlaceGender: true,
  resultPlaceAg: true,
  resultNotes: true,
  stravaActivityUrl: true,
  stravaActivityName: true,
  legs: { orderBy: { sortOrder: 'asc' as const } },
  athleteId: true,
} as const

export type CoachRecentRace = {
  id: string
  name: string
  date: string
  location: string | null
  type: RaceType
  sport: WorkoutType
  courseType: RaceCourseType | null
  triathlonDistance: TriathlonDistance | null
  hyroxDivision: HyroxDivision | null
  customDistanceKm: number | null
  priority: RacePriority
  goal: string | null
  url: string | null
  preparationWeeks: number | null
  athleteId: string
  athleteName: string
  legs: RaceLegView[]
}

/** Recent races across the coach roster — for Add race “Reuse from…”. */
export async function listCoachRecentRaces(): Promise<CoachRecentRace[]> {
  const session = await requireSession()
  if (!isCoachView(session)) return []

  const rows = await prisma.race.findMany({
    where: {
      resultsLogOnly: false,
      athlete: athleteOwnedByCoachWhere(session.userId),
    },
    orderBy: [{ updatedAt: 'desc' }, { date: 'desc' }],
    take: RECENT_RACES_TAKE,
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      type: true,
      sport: true,
      courseType: true,
      triathlonDistance: true,
      hyroxDivision: true,
      customDistanceKm: true,
      priority: true,
      goal: true,
      url: true,
      preparationWeeks: true,
      athleteId: true,
      athlete: { select: { name: true } },
      legs: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          kind: true,
          sortOrder: true,
          plannedTime: true,
          plannedNotes: true,
          plannedDistanceKm: true,
          resultTime: true,
          stravaActivityId: true,
          stravaActivityUrl: true,
          stravaActivityName: true,
          actualDistanceKm: true,
          actualDurationMin: true,
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: toDateKey(row.date),
    location: row.location,
    type: row.type,
    sport: row.sport,
    courseType: row.courseType,
    triathlonDistance: row.triathlonDistance,
    hyroxDivision: row.hyroxDivision,
    customDistanceKm: row.customDistanceKm,
    priority: row.priority,
    goal: row.goal,
    url: row.url,
    preparationWeeks: row.preparationWeeks,
    athleteId: row.athleteId,
    athleteName: row.athlete.name,
    legs: row.legs,
  }))
}

/** Full race detail for the shared RaceDetailSheet (Races + Training). */
export async function getSeasonRaceDetail(
  raceId: string,
): Promise<SeasonRace | null> {
  const session = await requireSession()
  if (!raceId.trim()) return null

  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: SEASON_RACE_SELECT,
  })
  if (!race) return null

  let allowed = false
  if (isAthleteRole(session) && session.hasAthlete) {
    const ownId = await resolveAthleteId(session)
    if (ownId && race.athleteId === ownId) allowed = true
  }
  if (!allowed && isCoach(session)) {
    allowed = await coachCanAccessAthlete(session.userId, race.athleteId)
  }
  if (!allowed) return null

  const { athleteId: _, ...rest } = race
  return {
    ...rest,
    preparationBlocks: readPreparationBlocks(rest.preparationBlocks),
  } as SeasonRace
}

/** Athlete-only: update race feedback notes after the race (does not change outcome). */
export async function updateRaceFeedback(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete || isCoachView(session)) {
    throw new Error('Athlete only')
  }
  const raceId = String(formData.get('raceId') ?? '').trim()
  if (!raceId) throw new Error('Race required')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const race = await prisma.race.findFirst({
    where: { id: raceId, athleteId },
    select: { id: true, date: true, athleteId: true },
  })
  if (!race) throw new Error('Race not found')

  const { athleteCanLeaveRaceFeedback } = await import('@/lib/season-races')
  if (!athleteCanLeaveRaceFeedback(race, false)) {
    throw new Error('Feedback is available on or after race day')
  }

  const raw = formData.get('resultNotes')
  const resultNotes =
    typeof raw === 'string' && raw.trim() ? raw.trim() : null

  await prisma.race.update({
    where: { id: raceId },
    data: { resultNotes },
  })

  try {
    const { syncRaceFeedbackToThread } = await import('@/app/actions/coaching-inbox')
    await syncRaceFeedbackToThread({
      raceId,
      athleteId,
      resultNotes,
    })
  } catch {
    // Soft-fail: notes still saved on the race
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/dashboard')
  revalidatePath('/season')
  revalidatePath('/inbox')
  revalidatePath('/inbox', 'layout')
  revalidatePath('/', 'layout')
  revalidatePath(`/athletes/${race.athleteId}`)
}

export type CreateSeasonRacePlaceholderInput = {
  athleteId?: string
  name: string
  date: string
  type: RaceType
  sport?: WorkoutType
  priority?: RacePriority
  location?: string | null
  goal?: string | null
  /** Defaults to WATCHING — a light marker until promoted to Planned. */
  intent?: 'PLANNED' | 'WATCHING'
}

/** Lightweight race chip for Season Plan (name / date / type / priority). */
export async function createSeasonRacePlaceholder(
  input: CreateSeasonRacePlaceholderInput,
) {
  const session = await requireSession()
  const { RaceIntent, RacePriority, RaceType, HyroxDivision } = await import(
    '@prisma/client'
  )
  const { parseDateOnly } = await import('@/lib/dates')
  const { defaultSportForRaceType } = await import('@/lib/races')
  const {
    raceUsesLegs,
    triathlonLegsCreateData,
  } = await import('@/lib/race-legs')
  const { onRacesCalendarDataChanged } = await import(
    '@/lib/calendar-invalidation'
  )
  const { revalidatePath } = await import('next/cache')

  let athleteId = input.athleteId?.trim() || null
  if (isCoach(session) && athleteId) {
    const owned = await prisma.athlete.findFirst({
      where: { id: athleteId, ...athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (!owned) throw new Error('Athlete not found')
  } else if (isCoach(session)) {
    athleteId = await resolveAthleteId(session)
    if (athleteId) {
      const owned = await prisma.athlete.findFirst({
        where: { id: athleteId, ...athleteOwnedByCoachWhere(session.userId) },
        select: { id: true },
      })
      if (!owned) throw new Error('Athlete not found')
    }
  } else {
    athleteId = await resolveAthleteId(session)
  }
  if (!athleteId) throw new Error('No athlete selected')

  const name = input.name.trim()
  if (!name) throw new Error('Race name is required')
  const date = parseDateOnly(input.date)
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error('Pick a race date')
  }

  const type = input.type
  const sport = input.sport ?? defaultSportForRaceType(type)
  const intent =
    input.intent === 'PLANNED' ? RaceIntent.PLANNED : RaceIntent.WATCHING

  const { getNextWorkoutSortOrder } = await import('@/lib/workout-sort')
  const daySortOrder = await getNextWorkoutSortOrder(athleteId, date)

  const created = await prisma.race.create({
    data: {
      athleteId,
      name,
      date,
      location: input.location?.trim() || null,
      type,
      sport,
      priority: input.priority ?? RacePriority.C,
      intent,
      goal: input.goal?.trim() || null,
      hyroxDivision: type === RaceType.HYROX ? HyroxDivision.MEN : null,
      daySortOrder,
      ...(raceUsesLegs(type)
        ? { legs: { create: triathlonLegsCreateData() } }
        : {}),
    },
    select: { id: true },
  })

  revalidatePath('/season')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${athleteId}`)
  await onRacesCalendarDataChanged(athleteId)
  return created
}

