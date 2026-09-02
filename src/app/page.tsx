import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { signInWithGoogle } from '@/app/actions/auth'
import { HomeAuthForms } from '@/components/auth/home-auth-forms'
import { nextAuthErrorMessage } from '@/lib/auth-form-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainTrackAppIcon } from '@/components/brand/traintrack-logo'
import {
  getCoachInviteCookie,
  resolveCoachInvite,
} from '@/lib/coach-invite'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; invite?: string }>
}) {
  let session = null
  try {
    session = await getSession()
  } catch {
    // Misconfigured auth (e.g. missing AUTH_SECRET) must not crash the sign-in page.
  }
  if (session) {
    if (session.needsOnboarding) redirect('/onboarding')
    redirect('/dashboard')
  }

  const params = searchParams ? await searchParams : {}
  const authError = params.error

  const inviteFromQuery = params.invite ? await resolveCoachInvite(params.invite) : null
  const inviteCookieCode = inviteFromQuery?.code ?? (await getCoachInviteCookie())
  const invite = inviteFromQuery ?? (inviteCookieCode ? await resolveCoachInvite(inviteCookieCode) : null)

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8 sm:px-6">
      <div className="mb-8 w-full max-w-md text-center">
        <TrainTrackAppIcon
          className="mx-auto mb-4 h-14 w-14 sm:mb-5 sm:h-16 sm:w-16"
          aria-label="TrainTrack"
        />
        <h1 className="traintrack-wordmark text-3xl tracking-[0.075em] sm:text-4xl">
          TRAINTRACK
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:mt-3">
          Plan training, log workouts, and track progress — built for coaches and athletes.
        </p>
      </div>

      <Card className="w-full max-w-md border border-border">
        <CardHeader className="space-y-1.5 px-5 pb-4 pt-5 text-center">
          <CardTitle className="text-lg leading-tight">
            {invite ? 'Create your athlete account' : 'Sign in'}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {invite
              ? `${invite.coachName} invited you to TrainTrack. Create an account, then you’ll be asked to connect with them.`
              : 'One account — Google or email. Choose Athlete or Coach after you sign in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-0">
          {invite ? (
            <p className="rounded-[6px] border border-brand/25 bg-brand-soft/40 px-3 py-2 text-center text-xs leading-relaxed text-foreground">
              Invite from <span className="font-semibold">{invite.coachName}</span>
            </p>
          ) : null}

          {authError ? (
            <p className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
              {nextAuthErrorMessage(authError)}
            </p>
          ) : null}

          <div className="grid gap-2">
            {googleEnabled ? (
              <form action={signInWithGoogle}>
                <Button type="submit" variant="outline" className="w-full">
                  Continue with Google
                </Button>
              </form>
            ) : (
              <Button type="button" variant="outline" className="w-full" disabled>
                Continue with Google
              </Button>
            )}
          </div>

          <div className="relative py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or email</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </div>

          <HomeAuthForms
            inviteOpen={Boolean(invite)}
            registerButtonLabel={invite ? 'Create athlete account' : 'Create account'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
