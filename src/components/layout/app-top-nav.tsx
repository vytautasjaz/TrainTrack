'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import { V2GridOverlay } from '@/components/ui/v2'
import { useInboxNavBadge } from '@/components/layout/inbox-nav-badge'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { ViewModeSwitcher } from '@/components/layout/view-mode-switcher'
import {
  getTopNav,
  isNavActive,
  SETTINGS_ENTRY_HREF,
} from '@/lib/nav-items'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { SidebarAthleteProfile } from '@/components/layout/app-nav'

export function AppTopNav({
  isCoach = false,
  canSwitchView = false,
  viewMode = 'athlete',
  dashboardNotificationCount = 0,
  athleteProfile = null,
}: {
  isCoach?: boolean
  canSwitchView?: boolean
  viewMode?: AppViewMode
  dashboardNotificationCount?: number
  athleteProfile?: SidebarAthleteProfile | null
}) {
  const pathname = usePathname()
  const items = getTopNav(isCoach)
  const inboxBadge = useInboxNavBadge(dashboardNotificationCount, viewMode)
  const initials = (athleteProfile?.name ?? 'TT')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header
      className="tt-app-top-nav sticky top-0 z-40 hidden lg:block"
      data-app-top-nav
    >
      <V2GridOverlay />
      <div className="tt-app-top-nav-inner">
        <Link
          href="/dashboard"
          className="tt-app-top-nav-brand inline-flex items-center gap-2.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--tt-v2-accent)]/40"
          aria-label="TrainTrack home"
        >
          <TrainTrackMark tone="dark" className="h-7 w-7 shrink-0" />
          <span className="traintrack-wordmark truncate text-[15px] tracking-[0.04em] text-white">
            TRAINTRACK
          </span>
        </Link>

        <nav className="tt-app-top-nav-links" aria-label="Primary">
          {items.map((item) => {
            const active = isNavActive(pathname, item.href)
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                data-active={active ? 'true' : undefined}
                className={cn(
                  'relative shrink-0 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium transition xl:px-3',
                  active
                    ? 'text-white'
                    : 'text-white/55 hover:text-white/90',
                )}
              >
                {item.label}
                {active ? (
                  <span
                    className="absolute inset-x-2.5 -bottom-px h-0.5 bg-[var(--tt-v2-accent)] xl:inset-x-3"
                    aria-hidden
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="tt-app-top-nav-actions">
          {canSwitchView ? (
            <ViewModeSwitcher
              viewMode={viewMode}
              tone="sidebar"
              compact
              className="mr-0.5"
            />
          ) : null}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-white/55 transition hover:bg-white/8 hover:text-white"
            aria-label="Search (coming soon)"
            disabled
            title="Search coming soon"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <Link
            href="/inbox"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-white/55 transition hover:bg-white/8 hover:text-white"
            aria-label={
              inboxBadge > 0
                ? `Inbox, ${inboxBadge} unread`
                : 'Inbox'
            }
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {inboxBadge > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--tt-v2-accent)] ring-2 ring-[var(--tt-v2-nav-bg)]" />
            ) : null}
          </Link>

          {athleteProfile ? (
            <div className="group relative">
              <Link
                href={SETTINGS_ENTRY_HREF}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] py-1 pl-1 pr-1.5 outline-none transition hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[var(--tt-v2-accent)]/40"
                aria-label="Account settings"
              >
                <AthleteAvatar
                  name={athleteProfile.name}
                  avatarUrl={athleteProfile.avatarUrl}
                  size="sm"
                  className="h-8 w-8 ring-1 ring-white/15"
                />
                <span className="hidden text-[12px] font-semibold tracking-wide text-white/80 xl:inline">
                  {initials}
                </span>
              </Link>
              <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 hidden min-w-[10rem] rounded-[var(--radius-lg)] border border-white/10 bg-[#1a1d27] p-1 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:block group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:block group-focus-within:opacity-100">
                <Link
                  href={SETTINGS_ENTRY_HREF}
                  className="block rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-white/80 hover:bg-white/8 hover:text-white"
                >
                  Settings
                </Link>
                <div className="px-1 py-1">
                  <SignOutButton
                    tone="menu"
                    className="w-full justify-start rounded-[var(--radius-sm)] px-2 py-2 text-[13px] !text-white/70 hover:!bg-white/8 hover:!text-white"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
