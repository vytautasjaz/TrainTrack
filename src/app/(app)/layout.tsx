import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getSession } from '@/lib/session'
import {
  clearCoachInviteCookie,
  coachInvitePath,
  getCoachInviteCookie,
  resolveCoachInvite,
} from '@/lib/coach-invite'
import {
  athleteClaimPath,
  clearAthleteClaimCookie,
  getAthleteClaimCookie,
  resolveAthleteClaim,
} from '@/lib/athlete-claim'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')

  let invite = null
  let claim = null
  let claimToken: string | null = null

  try {
    const inviteCode = await getCoachInviteCookie()
    invite = inviteCode ? await resolveCoachInvite(inviteCode) : null
    if (inviteCode && !invite) {
      await clearCoachInviteCookie()
    }
  } catch (err) {
    console.error('[app/layout] invite resume failed', err)
  }

  try {
    claimToken = await getAthleteClaimCookie()
    claim = claimToken ? await resolveAthleteClaim(claimToken) : null
    if (claimToken && (!claim || claim.alreadyClaimed)) {
      await clearAthleteClaimCookie()
      claim = null
      claimToken = null
    }
  } catch (err) {
    console.error('[app/layout] claim resume failed', err)
  }

  const hasPendingInvite =
    Boolean(invite && invite.coachUserId !== session.userId) ||
    Boolean(claim && !claim.alreadyClaimed && claim.coachUserId !== session.userId)

  // Resume invite/claim even if onboarding was previously skipped.
  if (session.needsOnboarding || (hasPendingInvite && !session.hasAthlete)) {
    redirect('/onboarding')
  }

  if (invite && invite.coachUserId !== session.userId && session.hasAthlete) {
    redirect(coachInvitePath(invite.code))
  }

  if (claim && !claim.alreadyClaimed && claim.coachUserId !== session.userId && claimToken) {
    redirect(`${athleteClaimPath(claimToken)}/accept`)
  }

  return <AppShell>{children}</AppShell>
}
