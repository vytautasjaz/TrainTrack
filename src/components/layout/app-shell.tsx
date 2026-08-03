import { Suspense } from 'react'
import { AppNav } from '@/components/layout/app-nav'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { RoleSwitcher } from '@/components/layout/role-switcher'
import { CoachAthleteBar } from '@/components/coach/coach-athlete-bar'
import { StravaAutoSync } from '@/components/integrations/strava-auto-sync'
import { getSession, getCoachAthletes, resolveAthleteId } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import {
  getUnreadCoachFeedbackCount,
  getUnreadCoachReplyCount,
} from '@/lib/queries'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const showPreferences = Boolean(session)
  const isCoach = session?.role === 'COACH'

  let dashboardNotificationCount = 0
  let coachAthletes: Awaited<ReturnType<typeof getCoachAthletes>> = []
  let selectedAthleteId: string | null = null
  let athleteProfile: { name: string; avatarUrl: string | null } | null = null

  if (session?.role === 'COACH') {
    dashboardNotificationCount = await getUnreadCoachFeedbackCount(session.userId)
    coachAthletes = await getCoachAthletes(session.userId)
    selectedAthleteId = await resolveAthleteId(session)
  } else if (session?.role === 'ATHLETE') {
    const athleteId = await resolveAthleteId(session)
    if (athleteId) {
      dashboardNotificationCount = await getUnreadCoachReplyCount(athleteId)
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { name: true, avatarUrl: true },
      })
      if (athlete) {
        athleteProfile = {
          name: athlete.name,
          avatarUrl: athlete.avatarUrl,
        }
      } else if (session.name) {
        athleteProfile = { name: session.name, avatarUrl: null }
      }
    }
  }

  const roleSwitcher = session ? (
    <RoleSwitcher session={session} layout="sidebar" />
  ) : null

  const athleteBar =
    isCoach && selectedAthleteId && coachAthletes.length > 0 ? (
      <Suspense fallback={null}>
        <CoachAthleteBar
          athletes={coachAthletes.map((a) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            avatarUrl: a.avatarUrl,
          }))}
          selectedAthleteId={selectedAthleteId}
        />
      </Suspense>
    ) : null

  return (
    <div className="app-gradient flex min-h-dvh">
      {session?.role === 'ATHLETE' ? <StravaAutoSync /> : null}
      <Suspense fallback={null}>
        <AppNav
          showPreferences={showPreferences}
          isCoach={isCoach}
          dashboardNotificationCount={dashboardNotificationCount}
          sidebarFooter={roleSwitcher}
          athleteProfile={athleteProfile}
        />
      </Suspense>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] portrait:max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))] landscape:max-lg:pb-2 lg:pb-0">
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md" data-app-sticky-chrome>
          <header className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 landscape:max-lg:py-1.5 lg:hidden">
            <Suspense fallback={null}>
              <MobileNavMenu
                showPreferences={showPreferences}
                isCoach={isCoach}
                dashboardNotificationCount={dashboardNotificationCount}
                menuFooter={roleSwitcher}
                athleteProfile={athleteProfile}
              />
            </Suspense>
            <p className="truncate text-sm font-bold tracking-tight portrait:max-lg:inline landscape:max-lg:hidden">
              TrainTrack
            </p>
          </header>
          {athleteBar}
        </div>
        <main className="w-full min-w-0 max-w-6xl flex-1 px-4 pb-4 pt-3 landscape:max-lg:px-2 lg:max-w-[90rem] lg:px-8 lg:pb-6 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
