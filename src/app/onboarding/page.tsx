import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { becomeCoach, skipOnboarding, startTraining } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!session.needsOnboarding) redirect('/dashboard')

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Welcome, {session.name}</CardTitle>
          <CardDescription>
            One account can be an athlete, a coach, or both. You can add the other role later in
            Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <form action={startTraining}>
            <Button type="submit" className="w-full">
              Start Training
            </Button>
          </form>
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
        </CardContent>
      </Card>
    </div>
  )
}
