'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  parsePaceMinPerKm,
  type AthletePreferences,
  pickAthletePreferences,
} from '@/lib/athlete-preferences'
import { requireSession, requireAthleteSession, resolveAthleteId } from '@/lib/session'

async function requireAthleteForPreferences() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  return { session, athleteId }
}

function parseHrValue(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = parseInt(raw, 10)
  if (Number.isNaN(value) || value <= 0) return null
  return value
}

export async function updatePaceZones(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

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

  await prisma.athlete.update({
    where: { id: athleteId },
    data,
  })

  revalidatePath('/settings/preferences')
}

export async function updateHrZones(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

  const data: Record<string, number | null> = {}
  for (const { key, name } of HR_ZONE_FIELDS) {
    data[key] = parseHrValue(formData.get(name))
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data,
  })

  revalidatePath('/settings/preferences')
}

export async function updateAthleteName(formData: FormData) {
  const session = await requireAthleteSession()
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) throw new Error('Name is required.')
  if (name.length > 120) throw new Error('Name is too long.')

  await prisma.athlete.update({
    where: { id: session.athleteId },
    data: { name },
  })

  await prisma.user.update({
    where: { id: session.userId },
    data: { name },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
}

export async function getAthletePreferences(athleteId: string): Promise<AthletePreferences | null> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
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
  return pickAthletePreferences(athlete)
}
