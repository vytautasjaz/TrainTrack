'use server'

import {
  RaceIntent,
  RaceLegKind,
  RaceOutcome,
  RacePriority,
  RaceType,
  TriathlonDistance,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import {
  resolveRaceType,
  resolveWorkoutSport,
  type RaceFormSportId,
  type RunDistancePreset,
} from '@/lib/race-form'
import { defaultSportForRaceType } from '@/lib/races'
import { raceUsesLegs, triathlonLegsCreateData } from '@/lib/race-legs'
import { RACE_RESULT_OUTCOMES, serializeRaceResult, type RaceResultRow } from '@/lib/race-results'
import {
  requireSession,
  resolveAthleteId,
  isCoach,
  athleteOwnedByCoachWhere,
  coachCanAccessAthlete,
} from '@/lib/session'

async function requireResultsAthleteId(): Promise<string> {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  if (isCoach(session)) {
    const allowed = await coachCanAccessAthlete(session.userId, athleteId)
    if (!allowed) throw new Error('Athlete not found')
  }
  return athleteId
}

export async function getAthleteRaceResults(athleteId: string): Promise<RaceResultRow[]> {
  const rows = await prisma.race.findMany({
    where: {
      athleteId,
      outcome: { in: RACE_RESULT_OUTCOMES },
    },
    orderBy: [{ date: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      type: true,
      sport: true,
      triathlonDistance: true,
      customDistanceKm: true,
      priority: true,
      outcome: true,
      resultTime: true,
      resultNotes: true,
      resultsLogOnly: true,
      legs: {
        select: {
          kind: true,
          resultTime: true,
          actualDurationMin: true,
        },
      },
    },
  })

  return rows
    .map((row) => serializeRaceResult(row))
    .filter((row): row is RaceResultRow => row != null)
}

function parseSportId(raw: string): RaceFormSportId {
  const allowed: RaceFormSportId[] = ['RUN', 'BIKE', 'TRIATHLON', 'HYROX', 'SWIM', 'OTHER']
  if ((allowed as string[]).includes(raw)) return raw as RaceFormSportId
  return 'RUN'
}

/** Manually log a past race result into the athlete's results database. */
export async function createManualRaceResult(formData: FormData): Promise<void> {
  const athleteId = await requireResultsAthleteId()

  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Race name is required.')
  if (name.length > 160) throw new Error('Race name is too long.')

  const dateRaw = String(formData.get('date') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    throw new Error('Pick a race date.')
  }
  const date = parseDateOnly(dateRaw)

  const sportId = parseSportId(String(formData.get('sportId') ?? 'RUN'))
  const distanceRaw = String(formData.get('distance') ?? '').trim()

  let runDistance: RunDistancePreset | null = null
  let triDistance: TriathlonDistance | null = null
  if (sportId === 'RUN') {
    runDistance = (['FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON', 'CUSTOM'] as const).includes(
      distanceRaw as RunDistancePreset,
    )
      ? (distanceRaw as RunDistancePreset)
      : 'CUSTOM'
  } else if (sportId === 'TRIATHLON') {
    triDistance = (Object.values(TriathlonDistance) as string[]).includes(distanceRaw)
      ? (distanceRaw as TriathlonDistance)
      : TriathlonDistance.OLYMPIC
  } else if (sportId === 'BIKE' || sportId === 'SWIM' || sportId === 'OTHER') {
    runDistance = 'CUSTOM'
  }

  const raceType = resolveRaceType({ sportId, runDistance, triDistance })
  const sport = resolveWorkoutSport(sportId) || defaultSportForRaceType(raceType)

  const customRaw = String(formData.get('customDistanceKm') ?? '').trim()
  let customDistanceKm: number | null = null
  if (customRaw) {
    const parsed = parseFloat(customRaw.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Custom distance must be a positive number (km).')
    }
    customDistanceKm = parsed
  }

  const outcomeRaw = String(formData.get('outcome') ?? RaceOutcome.FINISHED)
  const outcome = RACE_RESULT_OUTCOMES.includes(outcomeRaw as RaceOutcome)
    ? (outcomeRaw as RaceOutcome)
    : RaceOutcome.FINISHED

  const resultTime =
    outcome === RaceOutcome.FINISHED || outcome === RaceOutcome.DNF
      ? String(formData.get('resultTime') ?? '').trim() || null
      : null

  const location = String(formData.get('location') ?? '').trim() || null
  const resultNotes = String(formData.get('resultNotes') ?? '').trim() || null

  const swimTime =
    outcome === RaceOutcome.FINISHED || outcome === RaceOutcome.DNF
      ? String(formData.get('swimTime') ?? '').trim() || null
      : null
  const bikeTime =
    outcome === RaceOutcome.FINISHED || outcome === RaceOutcome.DNF
      ? String(formData.get('bikeTime') ?? '').trim() || null
      : null
  const runTime =
    outcome === RaceOutcome.FINISHED || outcome === RaceOutcome.DNF
      ? String(formData.get('runTime') ?? '').trim() || null
      : null

  await prisma.race.create({
    data: {
      athleteId,
      name,
      date,
      location,
      type: raceType,
      sport,
      triathlonDistance: raceType === RaceType.TRIATHLON ? triDistance : null,
      customDistanceKm,
      priority: RacePriority.C,
      intent: RaceIntent.PLANNED,
      outcome,
      resultTime,
      resultNotes,
      resultLoggedAt: new Date(),
      resultsLogOnly: true,
      ...(raceUsesLegs(raceType)
        ? {
            legs: {
              create: triathlonLegsCreateData().map((leg) => {
                let legResult: string | null = null
                if (leg.kind === RaceLegKind.SWIM) legResult = swimTime
                else if (leg.kind === RaceLegKind.BIKE) legResult = bikeTime
                else if (leg.kind === RaceLegKind.RUN) legResult = runTime
                return { ...leg, resultTime: legResult }
              }),
            },
          }
        : {}),
    },
  })

  revalidatePath('/results')
  revalidatePath('/season')
  revalidatePath('/dashboard')
}

export async function deleteRaceResult(raceId: string): Promise<void> {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const race = isCoach(session)
    ? await prisma.race.findFirst({
        where: { id: raceId, athlete: athleteOwnedByCoachWhere(session.userId) },
        select: { id: true, resultsLogOnly: true },
      })
    : await prisma.race.findFirst({
        where: { id: raceId, athleteId },
        select: { id: true, resultsLogOnly: true },
      })

  if (!race) throw new Error('Race not found')

  // Only allow deleting results-log-only entries from this screen;
  // season races should be edited/deleted from season plan.
  if (!race.resultsLogOnly) {
    throw new Error('Season-plan races are managed from Season plan.')
  }

  await prisma.race.delete({ where: { id: race.id } })
  revalidatePath('/results')
  revalidatePath('/season')
}
