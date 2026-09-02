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
import type {
  RaceCourseType,
  RacePriority,
  RaceType,
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
  customDistanceKm: true,
  priority: true,
  intent: true,
  goal: true,
  url: true,
  preparationWeeks: true,
  outcome: true,
  resultTime: true,
  resultPlace: true,
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
  return rest as SeasonRace
}
