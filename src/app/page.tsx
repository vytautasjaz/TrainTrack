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
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-brand-foreground shadow-[var(--shadow-float)]">
          <Zap className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">TrainTrack</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Simple training planner for coaches and endurance athletes.
        </p>
      </div>

      <Card className="w-full max-w-md border-0 shadow-[var(--shadow-float)]">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Get started</CardTitle>
          <CardDescription>
            Demo mode — pick a user to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <form
              key={user.id}
              action={async () => {
                'use server'
                await setDemoSession(user.id, user.athleteProfile?.id)
                redirect('/dashboard')
              }}
            >
              <Button type="submit" variant="ghost" className="h-12 w-full justify-between rounded-xl px-4">
                <span className="font-semibold">{user.name}</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
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
