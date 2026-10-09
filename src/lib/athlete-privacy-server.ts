import { prisma } from '@/lib/prisma'
import {
  normalizeAthletePrivacyPrefs,
  type NormalizedAthletePrivacyPrefs,
} from '@/lib/athlete-privacy'

export async function fetchAthletePrivacyPrefs(
  athleteId: string,
): Promise<NormalizedAthletePrivacyPrefs> {
  const row = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { privacyPrefs: true },
  })
  return normalizeAthletePrivacyPrefs(row?.privacyPrefs)
}

export async function fetchAthletePrivacyPrefsMap(
  athleteIds: string[],
): Promise<Map<string, NormalizedAthletePrivacyPrefs>> {
  const unique = [...new Set(athleteIds.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const rows = await prisma.athlete.findMany({
    where: { id: { in: unique } },
    select: { id: true, privacyPrefs: true },
  })
  return new Map(
    rows.map((row) => [row.id, normalizeAthletePrivacyPrefs(row.privacyPrefs)]),
  )
}
