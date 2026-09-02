import Link from 'next/link'
import { redirect } from 'next/navigation'
import { acceptAthleteClaim, declineAthleteClaim } from '@/app/actions/athlete-claim'
import { AthleteClaimAcceptForm } from '@/components/auth/athlete-claim-accept-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainTrackAppIcon } from '@/components/brand/traintrack-logo'
import { parseAthleteClaimToken, resolveAthleteClaim } from '@/lib/athlete-claim'
import { getSession } from '@/lib/session'

type ClaimAcceptPageProps = {
  params: Promise<{ token: string }>
}

export default async function AthleteClaimAcceptPage({ params }: ClaimAcceptPageProps) {
  const { token: rawToken } = await params
  const token = parseAthleteClaimToken(decodeURIComponent(rawToken))
  const claim = token ? await resolveAthleteClaim(token) : null

  if (!claim) {
    return (
      <ClaimShell>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Link not found</CardTitle>
          <CardDescription>
            This profile link is invalid or no longer available.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Go to TrainTrack</Link>
          </Button>
        </CardContent>
      </ClaimShell>
    )
  }

  if (claim.alreadyClaimed) {
    return (
      <ClaimShell>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Already connected</CardTitle>
          <CardDescription>
            {claim.athleteName}&apos;s profile already has an app account linked.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Go to TrainTrack</Link>
          </Button>
        </CardContent>
      </ClaimShell>
    )
  }

  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  if (session.needsOnboarding || (!session.hasAthlete && !session.hasCoach)) {
    redirect('/onboarding')
  }

  if (claim.coachUserId === session.userId) {
    redirect('/dashboard')
  }

  const existingAthlete = session.hasAthlete

  if (existingAthlete) {
    return (
      <ClaimShell>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Account already set up</CardTitle>
          <CardDescription>
            Your TrainTrack account already has a training profile. To take over{' '}
            {claim.athleteName}&apos;s plan, sign in with a different email or ask{' '}
            {claim.coachName} to transfer your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardContent>
      </ClaimShell>
    )
  }

  return (
    <ClaimShell>
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle className="text-xl">Take over your training profile?</CardTitle>
        <CardDescription>
          {claim.coachName} set up a profile for <strong>{claim.athleteName}</strong>. Accept to
          link it to your account — your plan, workouts, and history will be waiting for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AthleteClaimAcceptForm
          claimToken={claim.token}
          athleteName={claim.athleteName}
          coachName={claim.coachName}
          acceptAction={acceptAthleteClaim}
          declineAction={declineAthleteClaim}
        />
      </CardContent>
    </ClaimShell>
  )
}

function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8">
      <div className="mb-6 text-center">
        <TrainTrackAppIcon className="mx-auto mb-3 h-12 w-12" aria-label="TrainTrack" />
        <p className="traintrack-wordmark text-xl tracking-[0.075em]">TRAINTRACK</p>
      </div>
      <Card className="w-full max-w-md border border-border">{children}</Card>
    </div>
  )
}
