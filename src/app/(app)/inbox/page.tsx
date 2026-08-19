import { redirect } from 'next/navigation'
import { getSession, isCoachView, resolveAthleteId } from '@/lib/session'
import {
  listAthleteInboxThreads,
  listCoachInboxThreads,
  serializeInboxThread,
  toCoachingThreadView,
  INBOX_LIST_MAX,
} from '@/lib/coaching-inbox'
import { InboxClient } from '@/components/inbox/inbox-client'
import { getPendingCoachRequests } from '@/lib/queries'
import { CoachPendingRequests } from '@/components/coach/coach-pending-requests'
import { isPushConfigured } from '@/lib/push-notifications'

function mapThreads(
  threadsRaw: Awaited<ReturnType<typeof listCoachInboxThreads>>,
  role: 'athlete' | 'coach',
) {
  return threadsRaw.map((t) => {
    const base = serializeInboxThread(t, role)
    return {
      ...base,
      workoutDetail: base.workoutDetail,
      messages: toCoachingThreadView(t).messages,
    }
  })
}

export default async function InboxPage() {
  const session = await getSession()
  if (!session) redirect('/')
  const pushConfigured = await isPushConfigured()

  const coach = isCoachView(session)

  if (coach) {
    const [threadsRaw, pendingCoach] = await Promise.all([
      listCoachInboxThreads(session.userId, { filter: 'all', take: INBOX_LIST_MAX }),
      getPendingCoachRequests(session.userId),
    ])

    return (
      <div className="min-w-0 max-w-full space-y-3">
        <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
        <InboxClient
          role="coach"
          threads={mapThreads(threadsRaw, 'coach')}
          pushConfigured={pushConfigured}
          pendingRequestsSlot={
            pendingCoach.coachingCode && pendingCoach.requests.length > 0 ? (
              <CoachPendingRequests
                coachingCode={pendingCoach.coachingCode}
                requests={pendingCoach.requests.map((link) => ({
                  id: link.id,
                  athlete: link.athlete,
                }))}
              />
            ) : null
          }
        />
      </div>
    )
  }

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const threadsRaw = await listAthleteInboxThreads(athleteId, { filter: 'all', take: INBOX_LIST_MAX })

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
      <InboxClient
        role="athlete"
        threads={mapThreads(threadsRaw, 'athlete')}
        pushConfigured={pushConfigured}
      />
    </div>
  )
}
