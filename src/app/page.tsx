import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { setDemoSession } from '@/app/actions/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'

export default async function HomePage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  const users = await prisma.user.findMany({ include: { athleteProfile: true } })

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-5 py-8 sm:px-6">
      <div className="mb-8 w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-[var(--shadow-float)] sm:mb-5 sm:h-20 sm:w-20 sm:rounded-[1.75rem]">
          <Zap className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.25} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">TrainTrack</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:mt-3">
          Plan training, log workouts, and track progress — built for coaches and athletes.
        </p>
      </div>

      <Card className="w-full max-w-md border border-border/50 shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-1.5 px-5 pb-4 pt-5 text-center">
          <CardTitle className="text-lg leading-tight">Get started</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Demo mode — pick a user to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
          {users.map((user) => (
            <form
              key={user.id}
              action={async () => {
                'use server'
                await setDemoSession(user.id, user.athleteProfile?.id)
                redirect('/dashboard')
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                className="h-14 w-full justify-between rounded-2xl border border-border/40 px-4 hover:bg-muted/50"
              >
                <span className="font-semibold">{user.name}</span>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {user.role.toLowerCase()}
                </span>
              </Button>
            </form>
          ))}
          {users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No users found. Run <code className="rounded-lg bg-muted px-1.5 py-0.5">npm run db:seed</code> first.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
