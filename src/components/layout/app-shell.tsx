import { AppNav } from '@/components/layout/app-nav'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { RoleSwitcher } from '@/components/layout/role-switcher'
import { getSession, resolveAthleteId } from '@/lib/session'
import {
  getUnreadCoachFeedbackCount,
  getUnreadCoachReplyCount,
} from '@/lib/queries'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const showPreferences = Boolean(session)
  const isCoach = session?.role === 'COACH'

  let dashboardNotificationCount = 0
  if (session?.role === 'COACH') {
    dashboardNotificationCount = await getUnreadCoachFeedbackCount(session.userId)
  } else if (session?.role === 'ATHLETE') {
    const athleteId = await resolveAthleteId(session)
    if (athleteId) {
      dashboardNotificationCount = await getUnreadCoachReplyCount(athleteId)
    }
  }

  return (
    <div className="app-gradient flex min-h-dvh">
      <AppNav
        showPreferences={showPreferences}
        isCoach={isCoach}
        dashboardNotificationCount={dashboardNotificationCount}
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-24 portrait:max-lg:pb-24 landscape:max-lg:pb-2 lg:pb-0">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2 backdrop-blur-md landscape:max-lg:py-1.5 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <MobileNavMenu
              showPreferences={showPreferences}
              isCoach={isCoach}
              dashboardNotificationCount={dashboardNotificationCount}
            />
            <p className="truncate text-sm font-bold tracking-tight portrait:max-lg:inline landscape:max-lg:hidden">
              TrainTrack
            </p>
          </div>
          {session && (
            <div className="min-w-0 shrink landscape:max-lg:scale-[0.92] landscape:max-lg:origin-right">
              <RoleSwitcher session={session} />
            </div>
          )}
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 pb-4 landscape:max-lg:px-2 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
