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
  type PersonalBestHistoryRecord,
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
  revalidatePath('/progress', 'layout')
  revalidatePath('/progress/results')
  revalidatePath('/dashboard')
  revalidatePath('/season')
}

type PbSnapshot = {
  id: string
  athleteId: string
  value: number
  metric: PersonalBestMetric
  dateText: string | null
  event: string | null
  raceId: string | null
}

/** True when result/date/event/race are unchanged (ignores format→parse float noise). */
function personalBestContentEqual(
  prev: Pick<PbSnapshot, 'value' | 'metric' | 'dateText' | 'event' | 'raceId'>,
  next: {
    value: number
    dateText: string | null
    event: string | null
    raceId?: string | null
  },
): boolean {
  if ((prev.dateText ?? null) !== (next.dateText ?? null)) return false
  if ((prev.event ?? null) !== (next.event ?? null)) return false
  if ((prev.raceId ?? null) !== (next.raceId ?? null)) return false
  // TIME is minutes; ~0.5s covers rounding from formatRaceTime → parseRaceTimeToMinutes.
  const eps = prev.metric === PersonalBestMetric.TIME ? 1 / 120 : 1e-6
  return Math.abs(prev.value - next.value) < eps
}

function shouldArchivePrevious(
  prev: PbSnapshot,
  next: {
    value: number
    dateText: string | null
    event: string | null
    raceId?: string | null
  },
): boolean {
  if (!(prev.value > 0)) return false
  return !personalBestContentEqual(prev, next)
}

async function archivePersonalBestSnapshot(prev: PbSnapshot) {
  await prisma.personalBestHistory.create({
    data: {
      personalBestId: prev.id,
      athleteId: prev.athleteId,
      value: prev.value,
      metric: prev.metric,
      dateText: prev.dateText,
      event: prev.event,
      raceId: prev.raceId,
    },
  })
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

export async function getAthletePersonalBestHistory(
  athleteId: string,
): Promise<PersonalBestHistoryRecord[]> {
  const rows = await prisma.personalBestHistory.findMany({
    where: { athleteId },
    orderBy: { supersededAt: 'desc' },
    select: {
      id: true,
      personalBestId: true,
      value: true,
      metric: true,
      dateText: true,
      event: true,
      raceId: true,
      supersededAt: true,
    },
  })
  return rows.map((row) => ({
    ...row,
    supersededAt: row.supersededAt.toISOString(),
  }))
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
      hyroxDivision: true,
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
      select: {
        id: true,
        athleteId: true,
        value: true,
        metric: true,
        dateText: true,
        event: true,
        raceId: true,
      },
    })
    if (!owned) throw new Error('Personal best not found.')
    const next = { value, dateText, event, raceId }
    if (shouldArchivePrevious(owned, next)) {
      await archivePersonalBestSnapshot(owned)
    }
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
    const byPreset = await prisma.personalBest.findFirst({
      where: { athleteId, presetKey: preset.key },
      select: {
        id: true,
        athleteId: true,
        value: true,
        metric: true,
        dateText: true,
        event: true,
        raceId: true,
      },
    })
    if (byPreset) {
      const next = { value, dateText, event, raceId }
      if (shouldArchivePrevious(byPreset, next)) {
        await archivePersonalBestSnapshot(byPreset)
      }
      await prisma.personalBest.update({
        where: { id: byPreset.id },
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

/**
 * Add a preset PB, or overwrite an existing one with a new result.
 * When overwriting a recorded value, the previous result is kept in history.
 */
export async function recordPersonalBestFromPreset(formData: FormData): Promise<void> {
  const athleteId = await requireOwnOrCoachAthleteId()
  const presetKey = String(formData.get('presetKey') ?? '').trim()
  const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === presetKey)
  if (!preset) throw new Error('Unknown preset.')

  const valueRaw = String(formData.get('value') ?? '').trim()
  const value = parsePersonalBestValue(valueRaw, preset.metric)
  if (value == null || value <= 0) {
    throw new Error(
      preset.metric === PersonalBestMetric.TIME
        ? 'Enter a valid finish time (m:ss or h:mm:ss).'
        : 'Enter a valid result.',
    )
  }

  let dateText: string | null = null
  try {
    dateText = parsePersonalBestDateText(String(formData.get('date') ?? ''))
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Invalid date.')
  }

  const event = String(formData.get('event') ?? '').trim() || null
  if (event && event.length > 200) throw new Error('Event name is too long.')

  const existing = await prisma.personalBest.findFirst({
    where: { athleteId, presetKey: preset.key },
    select: {
      id: true,
      athleteId: true,
      value: true,
      metric: true,
      dateText: true,
      event: true,
      raceId: true,
    },
  })

  if (existing) {
    const next = { value, dateText, event, raceId: null as string | null }
    if (shouldArchivePrevious(existing, next)) {
      await archivePersonalBestSnapshot(existing)
    }
    await prisma.personalBest.update({
      where: { id: existing.id },
      data: {
        name: preset.name,
        sport: preset.sport,
        metric: preset.metric,
        value,
        dateText,
        event,
        raceId: null,
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
        metric: preset.metric,
        value,
        dateText,
        event,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    })
  }

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
      select: {
        id: true,
        athleteId: true,
        metric: true,
        name: true,
        sport: true,
        value: true,
        dateText: true,
        event: true,
        raceId: true,
      },
    })
    if (!owned) continue

    const name = String(formData.get(`${id}_name`) ?? '').trim()
    if (!name) throw new Error('Each personal best needs a name.')
    if (name.length > 80) throw new Error(`Name too long: ${name}`)

    const metric =
      parsePersonalBestMetric(String(formData.get(`${id}_metric`) ?? '')) ?? owned.metric
    const sport =
      parsePersonalBestSport(String(formData.get(`${id}_sport`) ?? '')) ?? owned.sport

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

    const next = { value, dateText, event, raceId: owned.raceId }
    // No field edits → skip write and do not append history.
    if (
      name === owned.name &&
      metric === owned.metric &&
      sport === owned.sport &&
      personalBestContentEqual(owned, next)
    ) {
      continue
    }

    if (shouldArchivePrevious(owned, next)) {
      await archivePersonalBestSnapshot(owned)
    }

    await prisma.personalBest.update({
      where: { id },
      data: {
        name,
        sport,
        metric,
        value,
        dateText,
        event,
      },
    })
  }

  revalidatePbPaths()
}
