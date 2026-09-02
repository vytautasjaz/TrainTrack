'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { cn } from '@/lib/utils'
import type { AppViewMode } from '@/lib/session'

type MobileAppTopBarProps = {
  showPreferences: boolean
  showConnectCoach: boolean
  isCoach: boolean
  canSwitchView: boolean
  viewMode: AppViewMode
  dashboardNotificationCount: number
  athleteProfile: { name: string; avatarUrl: string | null } | null
  athleteBar: React.ReactNode
}

/** Sticky phone chrome; dark on coach Home to match the greeting hero. */
export function MobileAppTopBar({
  showPreferences,
  showConnectCoach,
  isCoach,
  canSwitchView,
  viewMode,
  dashboardNotificationCount,
  athleteProfile,
  athleteBar,
}: MobileAppTopBarProps) {
  const pathname = usePathname()
  const darkHome = pathname === '/dashboard'

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        darkHome
          ? 'bg-[var(--tt-home-hero-bg,#151827)]'
          : 'bg-background/90 backdrop-blur-md',
      )}
      data-app-sticky-chrome
      data-home-topbar={darkHome ? 'dark' : undefined}
    >
      <header
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 landscape:max-lg:py-1.5 lg:hidden',
          darkHome ? 'text-white' : 'border-b border-border/40',
        )}
      >
        <Link
          href="/dashboard"
          className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand/40 landscape:max-lg:hidden"
          aria-label="TrainTrack home"
        >
          <TrainTrackMark
            tone={darkHome ? 'dark' : 'light'}
            className="h-7 w-7 shrink-0"
          />
          <span
            className={cn(
              'traintrack-wordmark truncate text-[15px]',
              darkHome && 'text-white',
            )}
          >
            TRAINTRACK
          </span>
        </Link>
        <Suspense fallback={null}>
          <div className="ml-auto shrink-0">
            <MobileNavMenu
              showPreferences={showPreferences}
              showConnectCoach={showConnectCoach}
              isCoach={isCoach}
              canSwitchView={canSwitchView}
              viewMode={viewMode}
              dashboardNotificationCount={dashboardNotificationCount}
              athleteProfile={athleteProfile}
              tone={darkHome ? 'dark' : 'light'}
            />
          </div>
        </Suspense>
      </header>
      {athleteBar ? <div data-coach-athlete-bar>{athleteBar}</div> : null}
    </div>
  )
}
