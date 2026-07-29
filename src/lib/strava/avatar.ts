import { prisma } from '@/lib/prisma'
import { getValidAccessToken, fetchStravaAthlete } from './client'
import { pickStravaAvatarUrl, type StravaAthleteSummary } from './types'

export async function applyStravaAvatarToAthlete(
  athleteId: string,
  athlete: StravaAthleteSummary,
): Promise<string | null> {
  const avatarUrl = pickStravaAvatarUrl(athlete)
  if (!avatarUrl) return null

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { avatarUrl },
  })
  return avatarUrl
}

/** Refresh avatar from Strava for the linked athlete user. */
export async function syncStravaAvatarForUser(userId: string, athleteId: string) {
  const accessToken = await getValidAccessToken(userId)
  const stravaAthlete = await fetchStravaAthlete(accessToken)
  return applyStravaAvatarToAthlete(athleteId, stravaAthlete)
}
