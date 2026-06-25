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

  const roleSwitcher = session ? <RoleSwitcher session={session} layout="sidebar" /> : null

  return (
    <div className="app-gradient flex min-h-dvh">
      <AppNav
        showPreferences={showPreferences}
        isCoach={isCoach}
        dashboardNotificationCount={dashboardNotificationCount}
        sidebarFooter={roleSwitcher}
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] portrait:max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))] landscape:max-lg:pb-2 lg:pb-0">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/40 bg-background/80 px-3 py-2.5 backdrop-blur-md landscape:max-lg:py-1.5 lg:hidden">
          <MobileNavMenu
            showPreferences={showPreferences}
            isCoach={isCoach}
            dashboardNotificationCount={dashboardNotificationCount}
            menuFooter={roleSwitcher}
          />
          <p className="truncate text-sm font-bold tracking-tight portrait:max-lg:inline landscape:max-lg:hidden">
            TrainTrack
          </p>
        </header>
        <main className="w-full min-w-0 max-w-6xl flex-1 px-4 pb-4 pt-3 landscape:max-lg:px-2 lg:px-8 lg:pb-6 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
