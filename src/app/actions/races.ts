'use server'

import { prisma } from '@/lib/prisma'
import {
  requireSession,
  resolveAthleteId,
  isCoach,
  isAthleteRole,
  coachCanAccessAthlete,
} from '@/lib/session'
import type { SeasonRace } from '@/lib/season-races'

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
  resultNotes: true,
  stravaActivityUrl: true,
  stravaActivityName: true,
  legs: { orderBy: { sortOrder: 'asc' as const } },
  athleteId: true,
} as const

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

  const { athleteId: _athleteId, ...rest } = race
  return rest as SeasonRace
}
