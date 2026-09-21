import { revalidatePath, revalidateTag } from 'next/cache'
import { queueGoogleCalendarSync } from '@/lib/google-calendar-sync'
import { revalidateAthletePlanSurfaces, cacheTags } from '@/lib/cache-tags'
import { prisma } from '@/lib/prisma'
import { CoachAthleteLinkStatus } from '@prisma/client'

async function revalidateCoachCachesForAthlete(athleteId: string) {
  const [athlete, links] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { coachId: true },
    }),
    prisma.coachAthleteLink.findMany({
      where: { athleteId, status: CoachAthleteLinkStatus.ACCEPTED },
      select: { coachProfile: { select: { userId: true } } },
    }),
  ])
  const coachIds = new Set<string>()
  if (athlete?.coachId) coachIds.add(athlete.coachId)
  for (const link of links) {
    if (link.coachProfile.userId) coachIds.add(link.coachProfile.userId)
  }
  for (const coachUserId of coachIds) {
    revalidateTag(cacheTags.coachHome(coachUserId))
    revalidateTag(cacheTags.coachRoster(coachUserId))
  }
}

export async function onTrainingCalendarDataChanged(athleteId: string) {
  revalidateAthletePlanSurfaces(athleteId)
  await revalidateCoachCachesForAthlete(athleteId)
  revalidatePath('/settings/preferences')
  await queueGoogleCalendarSync(athleteId)
}

export async function onRacesCalendarDataChanged(athleteId: string) {
  revalidateAthletePlanSurfaces(athleteId)
  await revalidateCoachCachesForAthlete(athleteId)
  revalidatePath('/settings/preferences')
  revalidatePath('/season')
  await queueGoogleCalendarSync(athleteId)
}
