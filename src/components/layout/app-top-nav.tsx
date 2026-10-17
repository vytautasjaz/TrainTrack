'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Bell, ChevronDown, Search } from 'lucide-react'
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
  type NavItem,
} from '@/lib/nav-items'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { SidebarAthleteProfile } from '@/components/layout/app-nav'

function isTopNavChildActive(href: string, pathname: string, query: string) {
  const qIndex = href.indexOf('?')
  // Path-only links use shared nav matching (e.g. /workouts vs /workouts/plans).
  if (qIndex === -1) return isNavActive(pathname, href)

  const path = href.slice(0, qIndex)
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
  const params = new URLSearchParams(href.slice(qIndex + 1))
  const current = new URLSearchParams(query)
  for (const [key, value] of params) {
    const currentValue = current.get(key)
    if (key === 'tab' && path === '/tools') {
      if ((currentValue ?? 'running') !== value) return false
      continue
    }
    if (currentValue !== value) return false
  }
  return true
}

function TopNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const children = item.children
  const hasChildren = Boolean(children?.length)

  const childActive = children?.some((child) =>
    isTopNavChildActive(child.href, pathname, query),
  )
  const active = isNavActive(pathname, item.href) || Boolean(childActive)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const linkClass = cn(
    'relative inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium transition xl:px-3',
    active ? 'text-white' : 'text-white/55 hover:text-white/90',
  )

  const activeBar = active ? (
    <span
      className="absolute inset-x-2.5 -bottom-px h-0.5 bg-[var(--tt-v2-accent)] xl:inset-x-3"
      aria-hidden
    />
  ) : null

  if (!hasChildren || !children) {
    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href}
        data-active={active ? 'true' : undefined}
        className={linkClass}
      >
        {item.label}
        {activeBar}
      </Link>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={linkClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        data-active={active ? 'true' : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        {item.label}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 opacity-70 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
        {activeBar}
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={item.label}
        hidden={!open}
        className={cn(
          'absolute left-1/2 top-full z-50 mt-0 min-w-[12.5rem] -translate-x-1/2 pt-2',
          !open && 'pointer-events-none',
        )}
      >
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-[#1a1d27] p-1 shadow-xl">
          {children.map((child) => {
            const childIsActive = isTopNavChildActive(child.href, pathname, query)
            return (
              <div key={child.href}>
                {child.group ? (
                  <p
                    className={cn(
                      'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40',
                      child !== children[0] && 'mt-1 border-t border-white/10',
                    )}
                  >
                    {child.group}
                  </p>
                ) : null}
                <Link
                  href={child.href}
                  role="menuitem"
                  data-active={childIsActive ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-[var(--radius-sm)] px-3 py-2 text-[13px] transition',
                    childIsActive
                      ? 'bg-white/10 font-semibold text-white'
                      : 'text-white/75 hover:bg-white/8 hover:text-white',
                  )}
                >
                  {child.label}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
      <V2GridOverlay className="tt-v2-grid-overlay tt-v2-grid-overlay--top-nav" />
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
          {items.map((item) => (
            <TopNavItem key={`${item.href}-${item.label}`} item={item} />
          ))}
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
