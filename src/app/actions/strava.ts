'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAthleteSession } from '@/lib/session'
import { syncStravaActivitiesForUser } from '@/lib/strava/sync'

export async function disconnectStrava() {
  const session = await requireAthleteSession()

  await prisma.stravaConnection.deleteMany({
    where: { userId: session.userId },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
}

export async function syncStravaActivities() {
  const session = await requireAthleteSession()
  const result = await syncStravaActivitiesForUser(session.userId, session.athleteId)

  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath('/settings/preferences')
  revalidatePath('/progress')

  return result
}
