import { NextResponse } from 'next/server'
import { getSession, isCoachView, resolveAthleteId } from '@/lib/session'
import { getAthleteInboxUnreadCount, getCoachInboxUnreadCount } from '@/lib/coaching-inbox'
import { getPendingCoachRequestCount } from '@/lib/queries'
import { jsonError } from '@/lib/api-response'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isCoachView(session)) {
      const [inboxCount, pendingCount] = await Promise.all([
        getCoachInboxUnreadCount(session.userId),
        getPendingCoachRequestCount(session.userId),
      ])
      return NextResponse.json({ count: inboxCount + pendingCount })
    }

    const athleteId = await resolveAthleteId(session)
    if (!athleteId) return NextResponse.json({ count: 0 })
    const count = await getAthleteInboxUnreadCount(athleteId)
    return NextResponse.json({ count })
  } catch (error) {
    return jsonError(error, 500, 'Could not load inbox count')
  }
}
