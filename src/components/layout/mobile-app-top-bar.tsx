'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { settingsSectionHref } from '@/lib/settings-nav'
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

/** Sticky phone chrome — dark brand bar on all mobile screens. */
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
  return (
    <div
      className="sticky top-0 z-40 bg-[var(--tt-home-hero-bg,#151827)]"
      data-app-sticky-chrome
      data-mobile-topbar="dark"
    >
      <header className="flex items-center gap-2 px-3 py-2.5 text-white landscape:max-lg:py-1.5 lg:hidden">
        <Link
          href="/dashboard"
          className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/30 landscape:max-lg:hidden"
          aria-label="TrainTrack home"
        >
          <TrainTrackMark tone="dark" className="h-7 w-7 shrink-0" />
          <span className="traintrack-wordmark truncate text-[15px] text-white">
            TRAINTRACK
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {showPreferences && athleteProfile ? (
            <Link
              href={settingsSectionHref('profile')}
              className="rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/35"
              aria-label={`Open profile settings for ${athleteProfile.name}`}
              title="Profile & settings"
            >
              <AthleteAvatar
                name={athleteProfile.name}
                avatarUrl={athleteProfile.avatarUrl}
                size="sm"
                className="!h-8 !w-8 ring-2 ring-white/20"
              />
            </Link>
          ) : null}
          <Suspense fallback={null}>
            <MobileNavMenu
              showPreferences={showPreferences}
              showConnectCoach={showConnectCoach}
              isCoach={isCoach}
              canSwitchView={canSwitchView}
              viewMode={viewMode}
              dashboardNotificationCount={dashboardNotificationCount}
              athleteProfile={athleteProfile}
              tone="dark"
            />
          </Suspense>
        </div>
      </header>
      {athleteBar ? <div data-coach-athlete-bar>{athleteBar}</div> : null}
    </div>
  )
}
