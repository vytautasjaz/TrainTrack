import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AuthEmailPanel } from '@/components/auth/auth-email-panel'
import { AuthMarketingAside } from '@/components/auth/auth-marketing-aside'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'
import { nextAuthErrorMessage } from '@/lib/auth-form-errors'
import {
  coachInvitePath,
  resolveCoachInvite,
  getCoachInviteCookie,
} from '@/lib/coach-invite'
import {
  parseAthleteClaimToken,
  resolveAthleteClaim,
  getAthleteClaimCookie,
  athleteClaimPath,
} from '@/lib/athlete-claim'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; invite?: string; claim?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const authError = params.error

  let session = null
  try {
    session = await getSession()
  } catch {
    // Misconfigured auth (e.g. missing AUTH_SECRET) must not crash the sign-in page.
  }

  // Claim deep-link (logged out or in)
  if (params.claim && parseAthleteClaimToken(params.claim)) {
    redirect(`/claim/${encodeURIComponent(parseAthleteClaimToken(params.claim)!)}`)
  }

  // Invite deep-link: middleware seeds the cookie from ?invite=; signed-in users resume join.
  const inviteFromQuery = params.invite ? await resolveCoachInvite(params.invite) : null

  if (session) {
    if (inviteFromQuery) {
      redirect(coachInvitePath(inviteFromQuery.code))
    }
    const inviteCookie = await getCoachInviteCookie()
    if (inviteCookie) {
      const invite = await resolveCoachInvite(inviteCookie)
      if (invite) redirect(coachInvitePath(invite.code))
    }
    const claimToken = await getAthleteClaimCookie()
    if (claimToken) {
      const claim = await resolveAthleteClaim(claimToken)
      if (claim && !claim.alreadyClaimed) {
        redirect(`${athleteClaimPath(claimToken)}/accept`)
      }
    }
    if (session.needsOnboarding) redirect('/onboarding')
    redirect('/dashboard')
  }

  const invite = inviteFromQuery
  const claimToken = await getAthleteClaimCookie()
  const claim = claimToken ? await resolveAthleteClaim(claimToken) : null

  return (
    <div className="auth-page min-h-dvh">
      <div className="auth-page-pattern absolute inset-0" aria-hidden />
      <div className="auth-page-grid mx-auto grid min-h-dvh w-full max-w-[1200px] lg:grid-cols-[1.05fr_0.95fr]">
        <AuthMarketingAside />

        <div className="flex flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mb-6 lg:hidden">
            <TrainTrackLogo markClassName="h-10 w-10" wordmarkClassName="text-[1.15rem]" />
          </div>
          <div className="auth-card w-full max-w-[420px] rounded-[16px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-6 shadow-[0_12px_40px_rgb(17_17_17_/0.06)] sm:p-7">
            {authError ? (
              <p className="mb-4 rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
                {nextAuthErrorMessage(authError)}
              </p>
            ) : null}

            <AuthEmailPanel
              initialMode={invite || claim ? 'register' : 'sign-in'}
              registerButtonLabel={
                claim ? 'Create account & take over profile' : invite ? 'Create athlete account' : 'Create account'
              }
              googleEnabled={googleEnabled}
              inviteCode={invite?.code ?? null}
              inviteCoachName={invite?.coachName ?? null}
              claimCoachName={claim?.coachName ?? null}
              claimAthleteName={claim?.athleteName ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
