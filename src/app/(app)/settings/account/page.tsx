import { redirect } from 'next/navigation'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { AccountProfileSection } from '@/components/settings/account-profile-section'
import { CoachInviteAthleteSection } from '@/components/settings/coach-invite-athlete-section'
import { getSession, isCoach } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import { respondCoachRequest } from '@/app/actions/auth'

export default async function ProfileSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      coachProfile: {
        select: {
          coachingCode: true,
          links: {
            where: { status: CoachAthleteLinkStatus.PENDING },
            include: {
              athlete: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      athleteProfile: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          coachLinks: {
            where: {
              status: {
                in: [CoachAthleteLinkStatus.PENDING, CoachAthleteLinkStatus.ACCEPTED],
              },
            },
            include: {
              coachProfile: {
                select: {
                  coachingCode: true,
                  userId: true,
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const stravaSummary =
    session.hasAthlete && session.athleteId
      ? await getStravaConnectionSummary(session.userId, session.athleteId)
      : null

  const displayName = user.athleteProfile?.name ?? user.name

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        description="Your account identity, role, and coach connections."
      />

      <AccountProfileSection
        name={displayName}
        email={user.email}
        hasAthlete={session.hasAthlete}
        hasCoach={session.hasCoach}
        coachingCode={user.coachProfile?.coachingCode}
        avatarUrl={user.athleteProfile?.avatarUrl}
        stravaConnected={Boolean(stravaSummary)}
        coachLinks={user.athleteProfile?.coachLinks ?? []}
        currentUserId={user.id}
      />

      {(session.hasCoach || isCoach(session)) && user.coachProfile ? (
        <>
          <CoachInviteAthleteSection
            coachingCode={user.coachProfile.coachingCode}
            coachName={displayName}
          />
          <section id="pending-requests" className="card-elevated scroll-mt-24 space-y-4 p-5">
            <div>
              <SectionTitle variant="ui">Pending athlete requests</SectionTitle>
              <Caption>
                Athletes who entered your code{' '}
                <span className="font-semibold text-foreground">
                  {user.coachProfile.coachingCode}
                </span>{' '}
                manually.
              </Caption>
            </div>
            {user.coachProfile.links.length === 0 ? (
              <Caption>No pending requests.</Caption>
            ) : (
              <ul className="space-y-2">
                {user.coachProfile.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{link.athlete.name}</span>
                    <div className="flex gap-2">
                      <form action={respondCoachRequest}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <Button type="submit" size="sm">
                          Accept
                        </Button>
                      </form>
                      <form action={respondCoachRequest}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" size="sm" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
