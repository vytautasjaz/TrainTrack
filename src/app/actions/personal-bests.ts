'use server'

import { PersonalBestMetric, RaceOutcome } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  buildPersonalBestSuggestion,
  matchPersonalBestPreset,
  parsePersonalBestDateText,
  parsePersonalBestMetric,
  parsePersonalBestSport,
  parsePersonalBestValue,
  PERSONAL_BEST_PRESETS,
  type PersonalBestRecord,
  type PersonalBestSuggestion,
} from '@/lib/personal-bests'
import { requireSession, resolveAthleteId, isCoach, athleteOwnedByCoachWhere } from '@/lib/session'

async function requireOwnOrCoachAthleteId(athleteId?: string | null) {
  const session = await requireSession()
  const resolved = athleteId ?? (await resolveAthleteId(session))
  if (!resolved) throw new Error('No athlete selected')

  if (isCoach(session)) {
    const ok = await prisma.athlete.findFirst({
      where: { id: resolved, ...athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (!ok && !(session.hasAthlete && session.athleteId === resolved)) {
      throw new Error('Athlete not found')
    }
  } else if (!session.hasAthlete || session.athleteId !== resolved) {
    const own = await prisma.athlete.findFirst({
      where: { id: resolved, userId: session.userId },
      select: { id: true },
    })
    if (!own) throw new Error('Athlete not found')
  }

  return resolved
}

function revalidatePbPaths() {
  revalidatePath('/results')
  revalidatePath('/dashboard')
  revalidatePath('/season')
}

export async function getAthletePersonalBests(
  athleteId: string,
): Promise<PersonalBestRecord[]> {
  return prisma.personalBest.findMany({
    where: { athleteId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      sport: true,
      presetKey: true,
      metric: true,
      value: true,
      dateText: true,
      event: true,
      raceId: true,
      sortOrder: true,
    },
  })
}

export async function evaluatePersonalBestSuggestionForRace(
  raceId: string,
): Promise<PersonalBestSuggestion | null> {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: {
      id: true,
      name: true,
      date: true,
      type: true,
      sport: true,
      customDistanceKm: true,
      triathlonDistance: true,
      outcome: true,
      resultTime: true,
      athleteId: true,
    },
  })
  if (!race || race.outcome !== RaceOutcome.FINISHED) return null

  const matched = matchPersonalBestPreset(race)
  if (!matched) return null

  const existing = await prisma.personalBest.findFirst({
    where: {
      athleteId: race.athleteId,
      presetKey: matched.key,
    },
    select: { id: true, value: true, event: true, metric: true },
  })

  return buildPersonalBestSuggestion({ race, existing })
}

export async function confirmPersonalBest(formData: FormData): Promise<void> {
  const presetKey = String(formData.get('presetKey') ?? '').trim()
  const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === presetKey)
  if (!preset) throw new Error('Unknown personal best type.')

  const timeRaw = String(formData.get('time') ?? '').trim()
  const value = parsePersonalBestValue(timeRaw, PersonalBestMetric.TIME)
  if (value == null || value <= 0) {
    throw new Error('Enter a valid finish time (m:ss or h:mm:ss).')
  }

  const dateText = parsePersonalBestDateText(String(formData.get('date') ?? ''))
  const event = String(formData.get('event') ?? '').trim() || null
  if (event && event.length > 200) throw new Error('Event name is too long.')

  const raceIdRaw = String(formData.get('raceId') ?? '').trim()
  const raceId = raceIdRaw || null
  const existingId = String(formData.get('personalBestId') ?? '').trim() || null

  let athleteId: string
  if (raceId) {
    const race = await prisma.race.findUnique({
      where: { id: raceId },
      select: { athleteId: true },
    })
    if (!race) throw new Error('Race not found.')
    athleteId = await requireOwnOrCoachAthleteId(race.athleteId)
  } else {
    athleteId = await requireOwnOrCoachAthleteId()
  }

  if (existingId) {
    const owned = await prisma.personalBest.findFirst({
      where: { id: existingId, athleteId },
      select: { id: true },
    })
    if (!owned) throw new Error('Personal best not found.')
    await prisma.personalBest.update({
      where: { id: existingId },
      data: {
        value,
        dateText,
        event,
        raceId,
        metric: PersonalBestMetric.TIME,
        name: preset.name,
        sport: preset.sport,
        presetKey: preset.key,
      },
    })
  } else {
    const maxSort = await prisma.personalBest.aggregate({
      where: { athleteId },
      _max: { sortOrder: true },
    })
    await prisma.personalBest.create({
      data: {
        athleteId,
        name: preset.name,
        sport: preset.sport,
        presetKey: preset.key,
        metric: PersonalBestMetric.TIME,
        value,
        dateText,
        event,
        raceId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    })
  }

  revalidatePbPaths()
}

export async function addPersonalBestFromPreset(presetKey: string): Promise<void> {
  const athleteId = await requireOwnOrCoachAthleteId()
  const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === presetKey)
  if (!preset) throw new Error('Unknown preset.')

  const existing = await prisma.personalBest.findFirst({
    where: { athleteId, presetKey: preset.key },
    select: { id: true },
  })
  if (existing) throw new Error(`${preset.name} is already on your list.`)

  const maxSort = await prisma.personalBest.aggregate({
    where: { athleteId },
    _max: { sortOrder: true },
  })

  await prisma.personalBest.create({
    data: {
      athleteId,
      name: preset.name,
      sport: preset.sport,
      presetKey: preset.key,
      metric: preset.metric,
      value: 0,
      dateText: null,
      event: null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })

  revalidatePbPaths()
}

export async function addCustomPersonalBest(formData: FormData): Promise<void> {
  const athleteId = await requireOwnOrCoachAthleteId()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Name is required.')
  if (name.length > 80) throw new Error('Name is too long.')

  const sport = parsePersonalBestSport(String(formData.get('sport') ?? ''))
  if (!sport) throw new Error('Pick a sport.')

  const metric =
    parsePersonalBestMetric(String(formData.get('metric') ?? '')) ?? PersonalBestMetric.TIME

  const maxSort = await prisma.personalBest.aggregate({
    where: { athleteId },
    _max: { sortOrder: true },
  })

  await prisma.personalBest.create({
    data: {
      athleteId,
      name,
      sport,
      presetKey: null,
      metric,
      value: 0,
      dateText: null,
      event: null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })

  revalidatePbPaths()
}

export async function deletePersonalBest(id: string): Promise<void> {
  const athleteId = await requireOwnOrCoachAthleteId()
  await prisma.personalBest.deleteMany({ where: { id, athleteId } })
  revalidatePbPaths()
}

/** Save all editable fields from the profile table. */
export async function updatePersonalBestsFromProfile(formData: FormData): Promise<void> {
  const athleteId = await requireOwnOrCoachAthleteId()
  const ids = formData.getAll('id').map(String)

  for (const id of ids) {
    const owned = await prisma.personalBest.findFirst({
      where: { id, athleteId },
      select: { id: true, metric: true, name: true },
    })
    if (!owned) continue

    const name = String(formData.get(`${id}_name`) ?? '').trim()
    if (!name) throw new Error('Each personal best needs a name.')
    if (name.length > 80) throw new Error(`Name too long: ${name}`)

    const metric =
      parsePersonalBestMetric(String(formData.get(`${id}_metric`) ?? '')) ?? owned.metric
    const sport =
      parsePersonalBestSport(String(formData.get(`${id}_sport`) ?? '')) ?? undefined

    const valueRaw = String(formData.get(`${id}_value`) ?? '').trim()
    let value = 0
    if (valueRaw) {
      const parsed = parsePersonalBestValue(valueRaw, metric)
      if (parsed == null) {
        throw new Error(`Invalid result for ${name}.`)
      }
      value = parsed
    }

    let dateText: string | null = null
    try {
      dateText = parsePersonalBestDateText(String(formData.get(`${id}_date`) ?? ''))
    } catch (err) {
      throw new Error(err instanceof Error ? `${name}: ${err.message}` : `Invalid date for ${name}.`)
    }

    const event = String(formData.get(`${id}_event`) ?? '').trim() || null
    if (event && event.length > 200) throw new Error(`Event too long for ${name}.`)

    await prisma.personalBest.update({
      where: { id },
      data: {
        name,
        ...(sport ? { sport } : {}),
        metric,
        value,
        dateText,
        event,
      },
    })
  }

  revalidatePbPaths()
}
