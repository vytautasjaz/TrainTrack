'use server'

import { requireSession, isCoachView, coachCanAccessAthlete } from '@/lib/session'
import { listAthleteFeedbackThreads } from '@/lib/coaching-inbox'
import { toUserMessage } from '@/lib/action-error'

export async function loadCoachRosterFeedbackPage(athleteId: string, cursor?: string) {
  try {
    const session = await requireSession()
    if (!isCoachView(session)) {
      return { ok: false as const, error: 'Coach access required', items: [], nextCursor: null }
    }
    if (!(await coachCanAccessAthlete(session.userId, athleteId))) {
      return { ok: false as const, error: 'Athlete not found', items: [], nextCursor: null }
    }

    const page = await listAthleteFeedbackThreads(athleteId, { cursor, take: 15 })
    return { ok: true as const, ...page }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserMessage(error, 'Could not load feedback'),
      items: [],
      nextCursor: null,
    }
  }
}
