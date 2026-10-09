'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  athletePrivacyPrefsToJson,
  normalizeAthletePrivacyPrefs,
  type AthletePrivacyPrefs,
  type NormalizedAthletePrivacyPrefs,
} from '@/lib/athlete-privacy'
import { requireSession, resolveAthleteId } from '@/lib/session'

async function requireOwnAthleteId() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')
  return { session, athleteId }
}

export async function getAthletePrivacyPrefs(): Promise<NormalizedAthletePrivacyPrefs> {
  const { athleteId } = await requireOwnAthleteId()
  const row = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { privacyPrefs: true },
  })
  return normalizeAthletePrivacyPrefs(row?.privacyPrefs)
}

export async function updateAthletePrivacyPrefs(
  next: AthletePrivacyPrefs,
): Promise<NormalizedAthletePrivacyPrefs> {
  const { athleteId } = await requireOwnAthleteId()
  const normalized = normalizeAthletePrivacyPrefs(next)
  await prisma.athlete.update({
    where: { id: athleteId },
    data: { privacyPrefs: athletePrivacyPrefsToJson(normalized) },
  })
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  return normalized
}
