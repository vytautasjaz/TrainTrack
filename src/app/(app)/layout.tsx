import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getSession, isAdminOnly } from '@/lib/session'
import { isAdminInternalAppPath } from '@/lib/admin-internal-paths'
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

  const pathname = (await headers()).get('x-pathname') ?? ''
  const allowAdminInternal = isAdminInternalAppPath(pathname)

  // Pure admin accounts use the admin shell, not athlete/coach chrome —
  // except design/system tools linked from Admin → Tools.
  if (isAdminOnly(session) && !allowAdminInternal) {
    redirect('/admin')
  }

  // Skip onboarding / invite resume for admin-only design tool visits.
  if (isAdminOnly(session) && allowAdminInternal) {
    return <AppShell>{children}</AppShell>
  }

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
