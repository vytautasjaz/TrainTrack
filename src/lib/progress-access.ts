import { redirect } from 'next/navigation'
import {
  getSession,
  resolveAthleteId,
  isCoachView,
  coachCanAccessAthlete,
} from '@/lib/session'

/** Shared gate for `/progress` and subpages. */
export async function requireProgressAthlete() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  if (isCoachView(session)) {
    const allowed = await coachCanAccessAthlete(session.userId, athleteId)
    if (!allowed) redirect('/dashboard')
  }

  return { session, athleteId }
}
