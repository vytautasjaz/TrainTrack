import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getSession, isAdminOnly } from '@/lib/session'
import { isAdminInternalAppPath } from '@/lib/admin-internal-paths'
import {
  clearCoachInviteCookie,
  coachInvitePath,
  COACH_INVITE_COOKIE,
  resolveCoachInvite,
} from '@/lib/coach-invite'
import {
  athleteClaimPath,
  clearAthleteClaimCookie,
  ATHLETE_CLAIM_COOKIE,
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

  // Only touch invite/claim tables when cookies are present (common path: none).
  const cookieStore = await cookies()
  const inviteCode = cookieStore.get(COACH_INVITE_COOKIE)?.value ?? null
  const claimToken = cookieStore.get(ATHLETE_CLAIM_COOKIE)?.value ?? null

  let invite = null
  let claim = null
  let claimTokenResolved: string | null = claimToken

  if (inviteCode || claimToken) {
    const [inviteResult, claimResult] = await Promise.all([
      inviteCode
        ? resolveCoachInvite(inviteCode).catch((err) => {
            console.error('[app/layout] invite resume failed', err)
            return null
          })
        : Promise.resolve(null),
      claimToken
        ? resolveAthleteClaim(claimToken).catch((err) => {
            console.error('[app/layout] claim resume failed', err)
            return null
          })
        : Promise.resolve(null),
    ])

    invite = inviteResult
    claim = claimResult

    if (inviteCode && !invite) {
      await clearCoachInviteCookie()
    }
    if (claimToken && (!claim || claim.alreadyClaimed)) {
      await clearAthleteClaimCookie()
      claim = null
      claimTokenResolved = null
    }
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

  if (
    claim &&
    !claim.alreadyClaimed &&
    claim.coachUserId !== session.userId &&
    claimTokenResolved
  ) {
    redirect(`${athleteClaimPath(claimTokenResolved)}/accept`)
  }

  return <AppShell>{children}</AppShell>
}
