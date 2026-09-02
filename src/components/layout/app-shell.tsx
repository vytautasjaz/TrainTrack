import { Suspense } from 'react'
import { AppNav } from '@/components/layout/app-nav'
import { MobileAppTopBar } from '@/components/layout/mobile-app-top-bar'
import { ViewModeSwitchProvider } from '@/components/layout/view-mode-switch-context'
import { CoachAthleteBarGate } from '@/components/coach/coach-athlete-bar-gate'
import { StravaAutoSync } from '@/components/integrations/strava-auto-sync'
import {
  getSession,
  getCoachAthletes,
  resolveAthleteId,
  isCoachView,
  canSwitchViewMode,
  athleteHasConnectedCoach,
} from '@/lib/session'
import { prisma } from '@/lib/prisma'
import {
  getAthleteInboxUnreadCount,
  getCoachInboxUnreadCount,
} from '@/lib/coaching-inbox'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const showPreferences = Boolean(session)
  const coach = session ? isCoachView(session) : false
  const canSwitchView = session ? canSwitchViewMode(session) : false
  const viewMode = session?.viewMode ?? 'athlete'

  let inboxNotificationCount = 0
  let coachAthletes: Awaited<ReturnType<typeof getCoachAthletes>> = []
  let selectedAthleteId: string | null = null
  let athleteProfile: { name: string; avatarUrl: string | null } | null = null
  let showConnectCoach = false

  if (session?.hasAthlete && (!coach || session.viewMode === 'athlete')) {
    const ownAthlete = await prisma.athlete.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    if (ownAthlete) {
      showConnectCoach = !(await athleteHasConnectedCoach(ownAthlete.id))
    }
  }

  if (session && coach) {
    inboxNotificationCount = await getCoachInboxUnreadCount(session.userId)
    coachAthletes = await getCoachAthletes(session.userId)
    selectedAthleteId = await resolveAthleteId(session)
    if (session.name) {
      athleteProfile = { name: session.name, avatarUrl: null }
    }
  } else if (session?.hasAthlete) {
    const athleteId = await resolveAthleteId(session)
    if (athleteId) {
      inboxNotificationCount = await getAthleteInboxUnreadCount(athleteId)
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
  } else if (session?.name) {
    athleteProfile = { name: session.name, avatarUrl: null }
  }

  const athleteBar =
    coach && selectedAthleteId && coachAthletes.length > 0 ? (
      <Suspense fallback={null}>
        <CoachAthleteBarGate
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
    <ViewModeSwitchProvider>
      <div className="app-gradient flex min-h-dvh">
      {session?.hasAthlete ? <StravaAutoSync /> : null}
      <Suspense fallback={null}>
        <AppNav
          showPreferences={showPreferences}
          showConnectCoach={showConnectCoach && !coach}
          isCoach={coach}
          canSwitchView={canSwitchView}
          viewMode={viewMode}
          dashboardNotificationCount={inboxNotificationCount}
          athleteProfile={athleteProfile}
        />
      </Suspense>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] portrait:max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))] landscape:max-lg:pb-2 lg:pb-0" data-app-main-column>
        <MobileAppTopBar
          showPreferences={showPreferences}
          showConnectCoach={showConnectCoach && !coach}
          isCoach={coach}
          canSwitchView={canSwitchView}
          viewMode={viewMode}
          dashboardNotificationCount={inboxNotificationCount}
          athleteProfile={athleteProfile}
          athleteBar={athleteBar}
        />
        <main
          data-app-main
          className="w-full min-w-0 max-w-6xl flex-1 px-4 pb-4 pt-3 landscape:max-lg:px-2 lg:max-w-[110rem] lg:px-8 lg:pb-6 lg:pt-0"
        >
          {children}
        </main>
      </div>
      </div>
    </ViewModeSwitchProvider>
  )
}
