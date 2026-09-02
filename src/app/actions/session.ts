'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireSession, isCoach, requireCoachOwnsAthlete, VIEW_MODE_COOKIE } from '@/lib/session'
import { safeRedirectPath } from '@/lib/safe-redirect'

export async function switchAthlete(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session) || session.viewMode !== 'coach') {
    throw new Error('Coach only')
  }

  const athleteId = formData.get('athleteId') as string
  const redirectTo = safeRedirectPath(formData.get('redirectTo') as string | null, '/training')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect(redirectTo)
}

/** Update selected athlete cookie without navigation (e.g. library schedule modal). */
export async function persistCoachSelectedAthlete(athleteId: string) {
  const session = await requireSession()
  if (!isCoach(session) || session.viewMode !== 'coach') {
    throw new Error('Coach only')
  }

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
}

export async function switchViewMode(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete || !session.hasCoach) {
    throw new Error('Both athlete and coach profiles required')
  }

  const mode = formData.get('mode') as string
  if (mode !== 'athlete' && mode !== 'coach') {
    throw new Error('Invalid view mode')
  }

  const cookieStore = await cookies()
  cookieStore.set(VIEW_MODE_COOKIE, mode, { path: '/', maxAge: 60 * 60 * 24 * 365 })

  if (mode === 'coach') {
    const currentAthlete = cookieStore.get('tt_athlete')?.value
    const { getCoachAthletes, coachCanAccessAthlete } = await import('@/lib/session')
    const allowed = currentAthlete
      ? await coachCanAccessAthlete(session.userId, currentAthlete)
      : false
    if (!allowed) {
      const athletes = await getCoachAthletes(session.userId)
      const next = athletes.find((a) => a.status === 'ACTIVE') ?? athletes[0]
      if (next) cookieStore.set('tt_athlete', next.id, { path: '/' })
      else cookieStore.delete('tt_athlete')
    }
  }

  redirect('/dashboard')
}
