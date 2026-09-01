import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { acceptCoachInvite, declineCoachInvite, startTraining } from '@/app/actions/auth'
import { CoachInviteAcceptForm } from '@/components/auth/coach-invite-accept-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainTrackAppIcon } from '@/components/brand/traintrack-logo'
import {
  parseCoachInviteCode,
  resolveCoachInvite,
  setCoachInviteCookie,
} from '@/lib/coach-invite'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type JoinPageProps = {
  params: Promise<{ code: string }>
}

export default async function JoinCoachPage({ params }: JoinPageProps) {
  const { code: rawCode } = await params
  const code = parseCoachInviteCode(decodeURIComponent(rawCode))
  const invite = code ? await resolveCoachInvite(code) : null

  if (!invite) {
    return (
      <JoinShell>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Invite not found</CardTitle>
          <CardDescription>
            This coaching invite link is invalid or no longer available.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Go to TrainTrack</Link>
          </Button>
        </CardContent>
      </JoinShell>
    )
  }

  await setCoachInviteCookie(invite.code)

  const session = await getSession()

  if (!session) {
    redirect(`/?invite=${encodeURIComponent(invite.code)}`)
  }

  if (session.needsOnboarding || (!session.hasAthlete && !session.hasCoach)) {
    redirect('/onboarding')
  }

  if (!session.hasAthlete) {
    return (
      <JoinShell>
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Start training first</CardTitle>
          <CardDescription>
            {invite.coachName} invited you to train with them. Add an athlete profile to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <form action={startTraining}>
            <Button type="submit" className="w-full">
              Start Training
            </Button>
          </form>
          <Button asChild variant="ghost" className="w-full text-muted-foreground">
            <Link href="/dashboard">Not now</Link>
          </Button>
        </CardContent>
      </JoinShell>
    )
  }

  if (invite.coachUserId === session.userId) {
    redirect('/dashboard')
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      coachId: true,
      coachLinks: {
        where: {
          coachProfileId: invite.coachProfileId,
          status: {
            in: [CoachAthleteLinkStatus.ACCEPTED, CoachAthleteLinkStatus.PENDING],
          },
        },
        select: { status: true },
        take: 1,
      },
    },
  })

  const existingLink = athlete?.coachLinks[0] ?? null
  if (existingLink?.status === CoachAthleteLinkStatus.ACCEPTED) {
    redirect('/dashboard')
  }

  const hasOtherCoach =
    Boolean(athlete?.coachId) && athlete?.coachId !== invite.coachUserId

  return (
    <JoinShell>
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle className="text-xl">Train with {invite.coachName}?</CardTitle>
        <CardDescription>
          {invite.coachName} invited you to connect as their athlete.
          {hasOtherCoach
            ? ' Accepting will replace your current coach connection.'
            : ' You can change this later in Profile.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CoachInviteAcceptForm
          coachingCode={invite.code}
          coachName={invite.coachName}
          acceptAction={acceptCoachInvite}
          declineAction={declineCoachInvite}
        />
      </CardContent>
    </JoinShell>
  )
}

function JoinShell({ children }: { children: React.ReactNode }) {
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
