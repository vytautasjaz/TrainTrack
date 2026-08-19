/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import {
  CALENDAR_EXPAND_EVENT,
  type CalendarExpandDetail,
} from '@/lib/calendar-expand'
import { Button } from '@/components/ui/button'
import { ThemeToggleButton } from '@/components/theme-toggle-button'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { ViewModeSwitcher } from '@/components/layout/view-mode-switcher'
import { useInboxNavBadge } from '@/components/layout/inbox-nav-badge'
import type { AppViewMode } from '@/lib/session'
import {
  CALCULATOR_NAV_TABS,
  CONNECT_COACH_NAV,
  getMainNav,
  SETTINGS_ENTRY_HREF,
  SETTINGS_SUBNAV,
  type NavItem,
} from '@/lib/nav-items'

export type SidebarAthleteProfile = {
  name: string
  avatarUrl: string | null
}

const SIDEBAR_COLLAPSED_KEY = 'tt-sidebar-collapsed'
/** Auto-collapse icon-only sidebar below this width (still desktop lg+). */
const SIDEBAR_AUTO_COLLAPSE_MQ = '(max-width: 1279px)'

function isNavActive(pathname: string, href: string) {
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === '/workouts' && pathname.startsWith('/workouts/library'))
  )
}

function syncSidebarCollapsedAttr(collapsed: boolean) {
  if (typeof document === 'undefined') return
  if (collapsed) {
    document.documentElement.setAttribute('data-sidebar-collapsed', 'true')
  } else {
    document.documentElement.removeAttribute('data-sidebar-collapsed')
  }
}

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppNav({
  showPreferences = true,
  showConnectCoach = false,
  isCoach = false,
  canSwitchView = false,
  viewMode = 'athlete',
  dashboardNotificationCount = 0,
  sidebarFooter,
  athleteProfile = null,
}: {
  showPreferences?: boolean
  showConnectCoach?: boolean
  isCoach?: boolean
  canSwitchView?: boolean
  viewMode?: AppViewMode
  dashboardNotificationCount?: number
  sidebarFooter?: ReactNode
  athleteProfile?: SidebarAthleteProfile | null
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mainNav = getMainNav(isCoach)
  const toolsOpen = pathname === '/tools' || pathname.startsWith('/tools/')
  const settingsOpen = pathname.startsWith('/settings')
  const activeCalculatorTab = searchParams.get('tab') ?? 'running'
  const [collapsed, setCollapsed] = useState(false)
  /** Month calendar expand forces icon-only sidebar without changing stored preference. */
  const [expandLocked, setExpandLocked] = useState(false)
  const effectiveCollapsed = expandLocked || collapsed
  const inboxBadge = useInboxNavBadge(dashboardNotificationCount)

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ)

    function applyForViewport() {
      if (mq.matches) {
        setCollapsed(true)
        if (!expandLocked) syncSidebarCollapsedAttr(true)
        return
      }
      const stored = readStoredCollapsed()
      setCollapsed(stored)
      if (!expandLocked) syncSidebarCollapsedAttr(stored)
    }

    applyForViewport()
    mq.addEventListener('change', applyForViewport)
    return () => mq.removeEventListener('change', applyForViewport)
  }, [expandLocked])

  useEffect(() => {
    function onCalendarExpand(event: Event) {
      const { expanded } = (event as CustomEvent<CalendarExpandDetail>).detail
      setExpandLocked(expanded)
      if (expanded) {
        syncSidebarCollapsedAttr(true)
      } else {
        const mq = window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ)
        syncSidebarCollapsedAttr(mq.matches ? true : readStoredCollapsed())
      }
    }

    window.addEventListener(CALENDAR_EXPAND_EVENT, onCalendarExpand)
    return () => window.removeEventListener(CALENDAR_EXPAND_EVENT, onCalendarExpand)
  }, [])

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next)
    if (!expandLocked) syncSidebarCollapsedAttr(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Desktop sidebar — light editorial rail */}
      <aside
        className={cn(
          'tt-app-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh lg:shrink-0 lg:flex-col lg:self-start lg:py-6',
          'lg:transition-[width] lg:duration-[var(--tt-motion-normal)]',
          effectiveCollapsed ? 'lg:w-[4.5rem] lg:px-2' : 'lg:w-64 lg:px-4',
        )}
      >
        <div className="tt-app-sidebar-content">
          <div className="mb-6 shrink-0 space-y-2.5 px-2">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand/40',
                effectiveCollapsed ? 'justify-center' : 'gap-2.5',
              )}
              aria-label="TrainTrack home"
            >
              <TrainTrackMark className="h-9 w-9" />
              {!effectiveCollapsed ? (
                <span className="traintrack-wordmark">TRAINTRACK</span>
              ) : null}
            </Link>
            {canSwitchView ? (
              <div className={cn(effectiveCollapsed && 'flex justify-center')}>
                <ViewModeSwitcher
                  viewMode={viewMode}
                  tone="sidebar"
                  compact={effectiveCollapsed}
                />
              </div>
            ) : !effectiveCollapsed ? (
              <p className="text-xs text-text-tertiary">
                {isCoach ? 'Coach' : 'Athlete'}
              </p>
            ) : null}
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            {mainNav.map(({ href, label, icon: Icon }) => {
              const active = isNavActive(pathname, href)
              const showBadge = href === '/inbox' && inboxBadge > 0
              const isTools = href === '/tools'
              return (
                <div key={href}>
                  <Link
                    href={href}
                    title={label}
                    data-active={active ? 'true' : undefined}
                    className={cn(
                      'tt-app-sidebar-nav-link flex items-center rounded-[8px] py-2.5 text-sm font-medium transition-colors',
                      effectiveCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    )}
                  >
                    <span className="relative shrink-0">
                      <Icon
                        className="tt-app-sidebar-nav-icon h-4 w-4"
                        strokeWidth={1.75}
                      />
                      {showBadge && (
                        <span
                          className={cn(
                            'absolute flex items-center justify-center rounded-full bg-accent font-bold text-accent-foreground',
                            effectiveCollapsed
                              ? '-right-1.5 -top-1.5 h-2 w-2'
                              : '-right-1.5 -top-1.5 h-4 min-w-4 px-1 text-[10px]',
                          )}
                        >
                          {!effectiveCollapsed &&
                            (inboxBadge > 9
                              ? '9+'
                              : inboxBadge)}
                        </span>
                      )}
                    </span>
                    {!effectiveCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                  {!effectiveCollapsed && isTools && toolsOpen ? (
                    <div className="mt-1 ml-4 space-y-0.5 border-l border-black/10 pl-3">
                      {CALCULATOR_NAV_TABS.map((tab) => {
                        const tabActive = activeCalculatorTab === tab.id
                        return (
                          <Link
                            key={tab.id}
                            href={tab.href}
                            className={cn(
                              'block rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                              tabActive
                                ? 'bg-white/55 text-foreground backdrop-blur-sm'
                                : 'text-[#667085] hover:bg-black/[0.035] hover:text-foreground',
                            )}
                          >
                            {tab.label}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </nav>
          <div className="mt-auto shrink-0 space-y-1 border-t border-black/[0.07] pt-3">
            {showPreferences && athleteProfile ? (
              <div>
                {effectiveCollapsed ? (
                  <Link
                    href={SETTINGS_ENTRY_HREF}
                    title={athleteProfile.name}
                    className={cn(
                      'flex justify-center rounded-[10px] py-1.5 transition-colors',
                      settingsOpen
                        ? 'bg-white/55 backdrop-blur-sm'
                        : 'hover:bg-black/[0.035]',
                    )}
                  >
                    <AthleteAvatar
                      name={athleteProfile.name}
                      avatarUrl={athleteProfile.avatarUrl}
                      size="sm"
                      className="ring-2 ring-black/5"
                    />
                  </Link>
                ) : (
                  <Link
                    href={SETTINGS_ENTRY_HREF}
                    title={athleteProfile.name}
                    className={cn(
                      'mb-1 flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors',
                      settingsOpen
                        ? 'bg-white/55 text-foreground backdrop-blur-sm'
                        : 'text-foreground hover:bg-black/[0.035]',
                    )}
                  >
                    <AthleteAvatar
                      name={athleteProfile.name}
                      avatarUrl={athleteProfile.avatarUrl}
                      size="sm"
                      className="ring-2 ring-black/5"
                    />
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {athleteProfile.name}
                    </p>
                  </Link>
                )}
                {!effectiveCollapsed && settingsOpen ? (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-black/10 pl-3">
                    {SETTINGS_SUBNAV.map(({ href, label }) => {
                      const active = pathname.startsWith(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            'block rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                            active
                              ? 'bg-white/55 text-foreground backdrop-blur-sm'
                              : 'text-[#667085] hover:bg-black/[0.035] hover:text-foreground',
                          )}
                        >
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            {showConnectCoach ? (
              <Link
                href={CONNECT_COACH_NAV.href}
                title={CONNECT_COACH_NAV.label}
                className={cn(
                  'flex items-center rounded-[10px] py-2.5 text-sm font-medium transition-colors',
                  effectiveCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                  'text-foreground hover:bg-accent-subtle',
                )}
              >
                <CONNECT_COACH_NAV.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!effectiveCollapsed && CONNECT_COACH_NAV.label}
              </Link>
            ) : null}
            <ThemeToggleButton
              showLabel={!effectiveCollapsed}
              className={cn(
                'mt-2 rounded-[10px] text-text-tertiary hover:bg-accent-subtle hover:text-foreground',
                effectiveCollapsed ? 'w-full justify-center px-2' : 'justify-start gap-2',
              )}
            />
            <SignOutButton tone="sidebar" iconOnly={effectiveCollapsed} className="mt-1" />
            {!effectiveCollapsed && (
              <div
                className={cn(
                  'sidebar-footer text-foreground',
                  '[&_.text-label]:text-text-tertiary [&_.text-caption]:text-text-tertiary',
                  '[&_button]:rounded-[8px] [&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary/90',
                  '[&_select]:border [&_select]:border-border [&_select]:bg-[color-mix(in_oklab,var(--color-surface)_75%,transparent)] [&_select]:text-foreground',
                  '[&_span.inline-flex]:bg-brand-soft [&_span.inline-flex]:text-brand',
                )}
              >
                {sidebarFooter}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={effectiveCollapsed}
              className={cn(
                'mt-2 rounded-[10px] text-text-tertiary hover:bg-accent-subtle hover:text-foreground',
                effectiveCollapsed ? 'w-full justify-center px-2' : 'w-full justify-start gap-2',
              )}
              onClick={() => setSidebarCollapsed(!collapsed)}
            >
              {effectiveCollapsed ? (
                <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
              )}
              {!effectiveCollapsed && 'Collapse'}
            </Button>
          </div>
        </div>
      </aside>

      <MobileBottomNav
        items={mainNav}
        pathname={pathname}
        query={searchParams.toString()}
        dashboardNotificationCount={inboxBadge}
      />
    </>
  )
}

function isSubItemActive(href: string, pathname: string, query: string) {
  const qIndex = href.indexOf('?')
  const path = qIndex === -1 ? href : href.slice(0, qIndex)
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
  if (qIndex === -1) return true
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

function MobileBottomNav({
  items,
  pathname,
  query,
  dashboardNotificationCount,
}: {
  items: NavItem[]
  pathname: string
  query: string
  dashboardNotificationCount: number
}) {
  const [openHref, setOpenHref] = useState<string | null>(null)
  const openItem = items.find((item) => item.href === openHref && item.children?.length)

  useEffect(() => {
    setOpenHref(null)
  }, [pathname, query])

  useEffect(() => {
    if (!openHref) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenHref(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openHref])

  return (
    <nav
      data-mobile-bottom-nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-[var(--shadow-nav)] portrait:max-lg:block landscape:max-lg:hidden lg:hidden"
    >
      {openItem?.children ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setOpenHref(null)}
          />
          <div
            role="menu"
            aria-label={openItem.label}
            className="absolute inset-x-0 bottom-full z-10 overflow-hidden rounded-t-2xl border-x border-t border-border bg-card shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
          >
            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {openItem.label}
            </p>
            <ul className="px-2 pb-2">
              {openItem.children.map((child) => {
                const active = isSubItemActive(child.href, pathname, query)
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      role="menuitem"
                      onClick={() => setOpenHref(null)}
                      className={cn(
                        'block rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-foreground hover:bg-muted/70',
                      )}
                    >
                      {child.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : null}

      <div className="relative z-10 flex items-stretch justify-around bg-card px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map(({ href, label, icon: Icon, children }) => {
          const active = isNavActive(pathname, href)
          const showBadge = href === '/inbox' && dashboardNotificationCount > 0
          const hasSubmenu = Boolean(children?.length)
          const expanded = openHref === href
          const itemClass = cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            active || expanded ? 'text-foreground' : 'text-muted-foreground',
          )
          const iconWrapClass = cn(
            'relative flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors',
            (active || expanded) && 'bg-muted',
          )
          const icon = (
            <>
              <span className={iconWrapClass}>
                <Icon className="h-5 w-5" strokeWidth={active || expanded ? 2.25 : 2} />
                {showBadge && (
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-foreground ring-2 ring-card" />
                )}
              </span>
              <span className="truncate">{label}</span>
            </>
          )

          if (hasSubmenu) {
            return (
              <button
                key={href}
                type="button"
                className={itemClass}
                aria-haspopup="menu"
                aria-expanded={expanded}
                onClick={() => setOpenHref(expanded ? null : href)}
              >
                {icon}
              </button>
            )
          }

          return (
            <Link key={href} href={href} className={itemClass}>
              {icon}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
