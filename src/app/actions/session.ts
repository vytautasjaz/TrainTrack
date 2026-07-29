'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { safeRedirectPath } from '@/lib/safe-redirect'

async function requireCoachOwnsAthlete(coachId: string, athleteId: string) {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId },
    select: { id: true },
  })
  if (!athlete) throw new Error('Athlete not found')
}

export async function switchUser(formData: FormData) {
  const userId = formData.get('userId') as string
  const cookieStore = await cookies()
  cookieStore.set('tt_user', userId, { path: '/' })
  cookieStore.delete('tt_athlete')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteProfile: true },
  })
  if (user?.athleteProfile?.id) {
    cookieStore.set('tt_athlete', user.athleteProfile.id, { path: '/' })
  }

  redirect('/dashboard')
}

export async function switchAthlete(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const redirectTo = safeRedirectPath(formData.get('redirectTo') as string | null, '/training')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect(redirectTo)
}

export async function setDemoSession(userId: string, athleteId?: string) {
  const cookieStore = await cookies()
  cookieStore.set('tt_user', userId, { path: '/' })
  if (athleteId) cookieStore.set('tt_athlete', athleteId, { path: '/' })
}
