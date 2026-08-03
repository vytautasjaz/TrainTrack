'use server'

import { prisma } from '@/lib/prisma'
import { requireSession, resolveAthleteId } from '@/lib/session'
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

  if (session.role === 'ATHLETE') {
    const athleteId = await resolveAthleteId(session)
    if (!athleteId || race.athleteId !== athleteId) return null
  } else if (session.role === 'COACH') {
    const owned = await prisma.athlete.findFirst({
      where: { id: race.athleteId, coachId: session.userId },
      select: { id: true },
    })
    if (!owned) return null
  } else {
    return null
  }

  const { athleteId: _athleteId, ...rest } = race
  return rest as SeasonRace
}
