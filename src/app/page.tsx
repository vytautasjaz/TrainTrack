import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  continueAsDemoUser,
  ensureDemoAccounts,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithStrava,
} from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Zap } from 'lucide-react'

const demoEnabled =
  process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_LOGIN === '1'
const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
const stravaEnabled = Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)

function roleLabel(roles: UserRole[]): string {
  if (roles.includes(UserRole.COACH)) return 'Coach'
  if (roles.includes(UserRole.ATHLETE)) return 'Athlete'
  if (roles.includes(UserRole.ADMIN)) return 'Admin'
  return 'User'
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session) {
    if (session.needsOnboarding) redirect('/onboarding')
    redirect('/dashboard')
  }

  const params = searchParams ? await searchParams : {}
  const authError = params.error

  let demoUsers: Array<{
    id: string
    name: string
    roles: UserRole[]
    athleteProfile: { id: string } | null
  }> = []
  let demoDbError = false

  if (demoEnabled) {
    try {
      demoUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: 'coach@traintrack.app' },
            { email: 'jordan@traintrack.app' },
            { roles: { has: UserRole.COACH } },
            { roles: { has: UserRole.ATHLETE } },
          ],
        },
        include: { athleteProfile: { select: { id: true } } },
        orderBy: { name: 'asc' },
        take: 8,
      })
    } catch {
      demoUsers = []
      demoDbError = true
    }
  }

  const preferredDemo = demoUsers
    .filter(
      (u) =>
        u.name === 'Coach Alex' ||
        u.name === 'Jordan Lee' ||
        u.roles.includes(UserRole.COACH) ||
        u.roles.includes(UserRole.ATHLETE),
    )
    .sort((a, b) => {
      const rank = (u: (typeof demoUsers)[number]) =>
        u.name === 'Coach Alex' ? 0 : u.name === 'Jordan Lee' ? 1 : u.roles.includes(UserRole.COACH) ? 2 : 3
      return rank(a) - rank(b)
    })

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8 sm:px-6">
      <div className="mb-8 w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[6px] bg-foreground text-background sm:mb-5 sm:h-16 sm:w-16">
          <Zap className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">TrainTrack</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:mt-3">
          Plan training, log workouts, and track progress — built for coaches and athletes.
        </p>
      </div>

      <Card className="w-full max-w-md border border-border">
        <CardHeader className="space-y-1.5 px-5 pb-4 pt-5 text-center">
          <CardTitle className="text-lg leading-tight">Sign in</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {demoEnabled
              ? 'Use a demo account for local testing, or sign in with email / OAuth.'
              : 'One account — Google, Strava, or email. Choose Athlete or Coach after you sign in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 pt-0">
          {authError ? (
            <p className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
              Sign-in failed. Try again or use another method.
            </p>
          ) : null}

          {demoEnabled ? (
            <div className="space-y-2 rounded-[6px] border border-border bg-muted/25 p-3">
              <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Continue with demo
              </p>
              {demoDbError ? (
                <p className="text-center text-xs leading-relaxed text-destructive">
                  Database isn’t reachable at localhost:5433. Start it with{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">npm run db:up</code>, then
                  refresh.
                </p>
              ) : preferredDemo.length > 0 ? (
                preferredDemo.map((user) => (
                  <form key={user.id} action={continueAsDemoUser}>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" className="w-full justify-between">
                      <span>Continue as {user.name}</span>
                      <span className="text-xs font-normal opacity-80">{roleLabel(user.roles)}</span>
                    </Button>
                  </form>
                ))
              ) : (
                <div className="space-y-2">
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    No demo accounts yet. Create Coach Alex and Jordan Lee without wiping your data.
                  </p>
                  <form action={ensureDemoAccounts}>
                    <Button type="submit" variant="secondary" className="w-full">
                      Create demo accounts
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ) : null}

          <div className="relative py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </div>

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
            {stravaEnabled ? (
              <form action={signInWithStrava}>
                <Button
                  type="submit"
                  className="w-full bg-[#FC4C02] text-white hover:bg-[#e44502]"
                >
                  Continue with Strava
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                className="w-full bg-[#FC4C02]/50 text-white"
                disabled
              >
                Continue with Strava
              </Button>
            )}
          </div>

          <div className="relative py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or email</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </div>

          <form action={signInWithEmail} className="space-y-2.5">
            <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="secondary" className="w-full">
              Sign in
            </Button>
          </form>

          <details className="rounded-[6px] border border-border/70 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Create an account</summary>
            <form action={registerWithEmail} className="mt-3 space-y-2.5">
              <Input name="name" placeholder="Name" required autoComplete="name" />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                autoComplete="email"
              />
              <Input
                name="password"
                type="password"
                placeholder="Password (min 8)"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button type="submit" variant="secondary" className="w-full">
                Create account
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}
