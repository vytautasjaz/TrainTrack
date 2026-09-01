import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { becomeCoach, skipOnboarding, startTraining } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCoachInviteCookie, resolveCoachInvite } from '@/lib/coach-invite'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!session.needsOnboarding) redirect('/dashboard')

  const inviteCode = await getCoachInviteCookie()
  const invite = inviteCode ? await resolveCoachInvite(inviteCode) : null

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Welcome, {session.name}</CardTitle>
          <CardDescription>
            {invite
              ? `${invite.coachName} invited you. Start training to connect with them.`
              : 'One account can be an athlete, a coach, or both. You can add the other role later in Settings.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {invite ? (
            <p className="rounded-[6px] border border-brand/25 bg-brand-soft/40 px-3 py-2 text-center text-xs leading-relaxed">
              After you start training, you’ll be asked to accept coaching from{' '}
              <span className="font-semibold">{invite.coachName}</span>.
            </p>
          ) : null}
          <form action={startTraining}>
            <Button type="submit" className="w-full">
              {invite ? 'Start Training & continue' : 'Start Training'}
            </Button>
          </form>
          {!invite ? (
            <>
              <form action={becomeCoach}>
                <Button type="submit" variant="outline" className="w-full">
                  Become a Coach
                </Button>
              </form>
              <form action={skipOnboarding}>
                <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </form>
            </>
          ) : (
            <form action={skipOnboarding}>
              <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
                Skip for now
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
