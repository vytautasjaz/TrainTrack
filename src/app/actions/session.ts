'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession, isCoach, requireCoachOwnsAthlete } from '@/lib/session'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { setDemoSession as setDemo } from '@/app/actions/auth'

export async function switchUser(formData: FormData) {
  if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_DEMO_LOGIN !== '1') {
    throw new Error('Demo switch disabled')
  }
  const userId = formData.get('userId') as string
  const cookieStore = await cookies()
  cookieStore.set('tt_user', userId, { path: '/' })
  cookieStore.delete('tt_athlete')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteProfile: true,
      coachProfile: { select: { id: true } },
    },
  })
  if (user?.athleteProfile?.id) {
    cookieStore.set('tt_athlete', user.athleteProfile.id, { path: '/' })
  } else if (user?.coachProfile) {
    const { getCoachAthletes } = await import('@/lib/session')
    const athletes = await getCoachAthletes(userId)
    const active = athletes.find((a) => a.status === 'ACTIVE') ?? athletes[0]
    if (active) cookieStore.set('tt_athlete', active.id, { path: '/' })
  }

  redirect('/dashboard')
}

export async function switchAthlete(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const redirectTo = safeRedirectPath(formData.get('redirectTo') as string | null, '/training')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect(redirectTo)
}

export async function setDemoSession(userId: string, athleteId?: string) {
  return setDemo(userId, athleteId)
}
