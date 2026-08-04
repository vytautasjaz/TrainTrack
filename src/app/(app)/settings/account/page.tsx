import { redirect } from 'next/navigation'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountProfileSection } from '@/components/settings/account-profile-section'
import { getSession, isCoach } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import {
  linkGoogleAccount,
  linkStravaAccount,
  respondCoachRequest,
  setPassword,
  unlinkProvider,
} from '@/app/actions/auth'
import Link from 'next/link'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
const stravaEnabled = Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)

export default async function AccountSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      email: true,
      name: true,
      passwordHash: true,
      roles: true,
      accounts: { select: { provider: true, providerAccountId: true } },
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
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const providers = new Set(user.accounts.map((a) => a.provider))
  const hasGoogle = providers.has('google')
  const hasStrava = providers.has('strava')
  const hasPassword = Boolean(user.passwordHash)

  const stravaSummary =
    session.hasAthlete && session.athleteId
      ? await getStravaConnectionSummary(session.userId, session.athleteId)
      : null

  const displayName = user.athleteProfile?.name ?? user.name

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Account"
        description="Profile, sign-in methods, and coach connections."
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
      />

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Sign-in methods</SectionTitle>
          <Caption>Link providers or set a password so you can always get back in.</Caption>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Google</p>
              <Caption>{hasGoogle ? 'Linked' : 'Not linked'}</Caption>
            </div>
            {googleEnabled ? (
              hasGoogle ? (
                <form action={unlinkProvider}>
                  <input type="hidden" name="provider" value="google" />
                  <Button type="submit" variant="outline" size="sm">
                    Unlink
                  </Button>
                </form>
              ) : (
                <form action={linkGoogleAccount}>
                  <Button type="submit" variant="outline" size="sm">
                    Link Google
                  </Button>
                </form>
              )
            ) : (
              <Caption>Not configured</Caption>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Strava</p>
              <Caption>
                {hasStrava ? 'Linked for sign-in' : 'Not linked'}
                {session.hasAthlete ? (
                  <>
                    {' '}
                    ·{' '}
                    <Link href="/settings/preferences#integrations" className="underline">
                      activity sync
                    </Link>
                  </>
                ) : null}
              </Caption>
            </div>
            {stravaEnabled ? (
              hasStrava ? (
                <form action={unlinkProvider}>
                  <input type="hidden" name="provider" value="strava" />
                  <Button type="submit" variant="outline" size="sm">
                    Unlink
                  </Button>
                </form>
              ) : (
                <form action={linkStravaAccount}>
                  <Button type="submit" variant="outline" size="sm">
                    Link Strava
                  </Button>
                </form>
              )
            ) : (
              <Caption>Not configured</Caption>
            )}
          </div>

          <div className="rounded-[6px] border border-border/60 px-3 py-2.5">
            <p className="text-sm font-medium">
              Email password {hasPassword ? '(set)' : '(not set)'}
            </p>
            <Caption className="mb-2">
              {hasPassword ? 'Change your password' : 'Add a password for email sign-in'}
            </Caption>
            <form action={setPassword} className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                name="password"
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="sm:flex-1"
              />
              <Button type="submit" variant="secondary" size="sm">
                {hasPassword ? 'Update password' : 'Set password'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {(session.hasCoach || isCoach(session)) && user.coachProfile ? (
        <section id="pending-requests" className="card-elevated scroll-mt-24 space-y-4 p-5">
          <div>
            <SectionTitle>Pending athlete requests</SectionTitle>
            <Caption>
              Share your code{' '}
              <span className="font-semibold text-foreground">
                {user.coachProfile.coachingCode}
              </span>{' '}
              with athletes.
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
      ) : null}
    </div>
  )
}
