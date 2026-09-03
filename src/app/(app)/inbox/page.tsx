import { redirect } from 'next/navigation'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { getSession, getCoachAthletes, isCoachView, resolveAthleteId } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import {
  listAthleteInboxThreads,
  listCoachInboxThreads,
  serializeInboxThread,
  toCoachingThreadView,
  INBOX_LIST_MAX,
  getOrCreateAthleteGeneralChatThread,
} from '@/lib/coaching-inbox'
import { InboxClient } from '@/components/inbox/inbox-client'
import { getPendingCoachRequests } from '@/lib/queries'
import { isPushConfigured } from '@/lib/push-notifications'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

async function getCoachParticipant(coachUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: coachUserId },
    select: { name: true, image: true },
  })
  return {
    name: user?.name ?? 'Coach',
    avatarUrl: user?.image ?? null,
  }
}

async function getAthleteInboxParticipants(athleteId: string) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      name: true,
      avatarUrl: true,
      coachId: true,
      coachLinks: {
        where: { status: CoachAthleteLinkStatus.ACCEPTED },
        take: 1,
        select: {
          coachProfile: {
            select: { user: { select: { name: true, image: true } } },
          },
        },
      },
    },
  })
  if (!athlete) return null

  const linkedCoach = athlete.coachLinks[0]?.coachProfile.user
  let coach = linkedCoach
    ? { name: linkedCoach.name, avatarUrl: linkedCoach.image }
    : null

  if (!coach && athlete.coachId) {
    const legacyCoach = await prisma.user.findUnique({
      where: { id: athlete.coachId },
      select: { name: true, image: true },
    })
    if (legacyCoach) {
      coach = { name: legacyCoach.name, avatarUrl: legacyCoach.image }
    }
  }

  return {
    athlete: { name: athlete.name, avatarUrl: athlete.avatarUrl ?? null },
    coach: coach ?? { name: 'Coach', avatarUrl: null },
  }
}

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
    const [threadsRaw, pendingCoach, coachParticipant, coachAthletes] = await Promise.all([
      listCoachInboxThreads(session.userId, { filter: 'all', take: INBOX_LIST_MAX }),
      getPendingCoachRequests(session.userId),
      getCoachParticipant(session.userId),
      getCoachAthletes(session.userId),
    ])

    return (
      <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
        <div className="tt-dashboard-content min-w-0 max-w-full space-y-5">
          <PageHeader className="tt-inbox-page-header">
            <div className="min-w-0">
              <PageHeaderEyebrow className="hidden lg:block">Messages</PageHeaderEyebrow>
              <PageHeaderTitle className="tt-inbox-page-title">
                Inbox<span className="tt-inbox-title-dot">.</span>
              </PageHeaderTitle>
              <PageHeaderDescription className="hidden max-w-lg lg:block">
                Workout asks, feedback, and race threads with your athletes.
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <InboxClient
            role="coach"
            threads={mapThreads(threadsRaw, 'coach')}
            pushConfigured={pushConfigured}
            coachParticipant={coachParticipant}
            coachAthletes={coachAthletes.map((a) => ({
              id: a.id,
              name: a.name,
              avatarUrl: a.avatarUrl ?? null,
            }))}
            coachingCode={pendingCoach.coachingCode}
            coachingRequests={pendingCoach.requests.map((link) => ({
              id: link.id,
              createdAt: link.createdAt.toISOString(),
              athlete: {
                id: link.athlete.id,
                name: link.athlete.name,
                avatarUrl: link.athlete.avatarUrl,
              },
            }))}
          />
        </div>
      </div>
    )
  }

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  await getOrCreateAthleteGeneralChatThread(athleteId)
  const [threadsRaw, participants] = await Promise.all([
    listAthleteInboxThreads(athleteId, { filter: 'all', take: INBOX_LIST_MAX }),
    getAthleteInboxParticipants(athleteId),
  ])
  if (!participants) redirect('/')

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content min-w-0 max-w-full space-y-5">
        <PageHeader className="tt-inbox-page-header">
          <div className="min-w-0">
            <PageHeaderEyebrow className="hidden lg:block">Messages</PageHeaderEyebrow>
            <PageHeaderTitle className="tt-inbox-page-title">
              Inbox<span className="tt-inbox-title-dot">.</span>
            </PageHeaderTitle>
            <PageHeaderDescription className="hidden max-w-lg lg:block">
              Ask your coach about workouts, share feedback, and follow up on races.
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <InboxClient
          role="athlete"
          threads={mapThreads(threadsRaw, 'athlete')}
          pushConfigured={pushConfigured}
          coachParticipant={participants.coach}
          athleteParticipant={participants.athlete}
        />
      </div>
    </div>
  )
}
