/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import {
  CALENDAR_EXPAND_EVENT,
  type CalendarExpandDetail,
} from '@/lib/calendar-expand'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { ViewModeSwitcher } from '@/components/layout/view-mode-switcher'
import { useInboxNavBadge } from '@/components/layout/inbox-nav-badge'
import type { AppViewMode } from '@/lib/session'
import {
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

const SIDEBAR_COLLAPSED_KEY = 'tt-sidebar-rail-collapsed'
/** Auto icon-rail below this width (still desktop lg+). Does not overwrite user preference. */
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
  athleteProfile = null,
}: {
  showPreferences?: boolean
  showConnectCoach?: boolean
  isCoach?: boolean
  canSwitchView?: boolean
  viewMode?: AppViewMode
  dashboardNotificationCount?: number
  athleteProfile?: SidebarAthleteProfile | null
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mainNav = getMainNav(isCoach)
  const toolsOpen = pathname === '/tools' || pathname.startsWith('/tools/')
  const settingsOpen = pathname.startsWith('/settings')
  const [prefCollapsed, setPrefCollapsed] = useState(false)
  const [viewportTight, setViewportTight] = useState(false)
  const [prefsReady, setPrefsReady] = useState(false)
  /** Month calendar expand forces icon-only sidebar without changing stored preference. */
  const [expandLocked, setExpandLocked] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [navIndicator, setNavIndicator] = useState({
    top: 0,
    height: 52,
    visible: false,
    ready: false,
  })
  const navRef = useRef<HTMLElement | null>(null)
  const effectiveCollapsed = expandLocked || viewportTight || prefCollapsed
  const inboxBadge = useInboxNavBadge(dashboardNotificationCount, viewMode)

  useLayoutEffect(() => {
    setPrefCollapsed(readStoredCollapsed())
    setPrefsReady(true)
  }, [])

  useLayoutEffect(() => {
    const mq = window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ)
    function syncViewport() {
      setViewportTight(mq.matches)
    }
    syncViewport()
    mq.addEventListener('change', syncViewport)
    return () => mq.removeEventListener('change', syncViewport)
  }, [])

  useLayoutEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    const nav = navEl

    function measure() {
      const active =
        nav.querySelector<HTMLElement>('.tt-app-sidebar-subnav-link[data-active="true"]') ??
        nav.querySelector<HTMLElement>('.tt-app-sidebar-nav-link[data-active="true"]')
      if (!active) {
        setNavIndicator((prev) => ({ ...prev, visible: false }))
        return
      }
      // offsetParent is the nav (position: relative); avoid wrappers with position.
      setNavIndicator({
        top: active.offsetTop,
        height: active.offsetHeight,
        visible: true,
        ready: true,
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    for (const child of nav.querySelectorAll(
      '.tt-app-sidebar-nav-link, .tt-app-sidebar-subnav-link',
    )) {
      ro.observe(child)
    }
    nav.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      nav.removeEventListener('scroll', measure)
    }
  }, [pathname, effectiveCollapsed, toolsOpen, mainNav.length, inboxBadge])

  useEffect(() => {
    function onCalendarExpand(event: Event) {
      const { expanded } = (event as CustomEvent<CalendarExpandDetail>).detail
      setExpandLocked(expanded)
    }

    window.addEventListener(CALENDAR_EXPAND_EVENT, onCalendarExpand)
    return () => {
      window.removeEventListener(CALENDAR_EXPAND_EVENT, onCalendarExpand)
    }
  }, [])

  useEffect(() => {
    if (!prefsReady) return
    syncSidebarCollapsedAttr(effectiveCollapsed)
  }, [effectiveCollapsed, prefsReady])

  function setSidebarCollapsed(next: boolean) {
    setPrefCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Desktop sidebar — dark gradient rail matching /design-mockups/shell */}
      <aside
        data-collapsed={effectiveCollapsed ? 'true' : undefined}
        className={cn(
          'tt-app-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh lg:shrink-0 lg:flex-col lg:self-start',
          'lg:transition-[width,padding] lg:duration-[var(--tt-motion-normal)]',
          effectiveCollapsed ? 'lg:w-[4.5rem] lg:px-3 lg:py-5' : 'lg:w-[292px] lg:p-5',
        )}
      >
        <div className="tt-app-sidebar-content">
          <Link
            href="/dashboard"
            className={cn(
              'tt-app-sidebar-logo outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand/40',
              effectiveCollapsed && 'justify-center',
            )}
            aria-label="TrainTrack home"
          >
            <span className="tt-app-sidebar-logo-mark">
              <TrainTrackMark tone="dark" className="h-6 w-6" />
            </span>
            {!effectiveCollapsed ? (
              <span className="tt-app-sidebar-logo-text">TRAINTRACK</span>
            ) : null}
          </Link>

          <nav ref={navRef} className="tt-app-sidebar-nav">
            <span
              className="tt-app-sidebar-nav-indicator"
              aria-hidden
              data-ready={navIndicator.ready ? 'true' : undefined}
              data-visible={navIndicator.visible ? 'true' : undefined}
              style={{
                transform: `translateY(${navIndicator.top}px)`,
                height: navIndicator.height,
              }}
            />
            {mainNav.map(({ href, label, icon: Icon, children, subnavAlwaysVisible }) => {
              const active = isNavActive(pathname, href)
              const showBadge = href === '/inbox' && inboxBadge > 0
              const showSubnav =
                !effectiveCollapsed &&
                Boolean(children?.length) &&
                (subnavAlwaysVisible || (href === '/tools' && toolsOpen))
              return (
                <div key={href}>
                  <Link
                    href={href}
                    title={label}
                    data-active={active ? 'true' : undefined}
                    className="tt-app-sidebar-nav-link"
                  >
                    <Icon className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                    {!effectiveCollapsed && <span className="truncate">{label}</span>}
                    {showBadge && !effectiveCollapsed ? (
                      <span className="tt-app-sidebar-badge">
                        {inboxBadge > 9 ? '9+' : inboxBadge}
                      </span>
                    ) : null}
                    {showBadge && effectiveCollapsed ? (
                      <span className="tt-app-sidebar-badge-dot" />
                    ) : null}
                  </Link>
                  {showSubnav ? (
                    <div className="tt-app-sidebar-subnav mt-1 ml-4 space-y-0.5 border-l pl-3">
                      {children!.map((child) => {
                        const childActive =
                          href === '/tools'
                            ? isSubItemActive(child.href, pathname, searchParams.toString())
                            : isNavActive(pathname, child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            data-active={childActive ? 'true' : undefined}
                            className="tt-app-sidebar-subnav-link block rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors"
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </nav>

          <div className="tt-app-sidebar-footer">
            {showConnectCoach ? (
              <Link
                href={CONNECT_COACH_NAV.href}
                title={CONNECT_COACH_NAV.label}
                className="tt-app-sidebar-footer-item"
              >
                <CONNECT_COACH_NAV.icon className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                {!effectiveCollapsed && CONNECT_COACH_NAV.label}
              </Link>
            ) : null}

            {showPreferences && athleteProfile ? (
              <>
                {effectiveCollapsed ? (
                  <Link
                    href={SETTINGS_ENTRY_HREF}
                    title="Settings"
                    data-active={settingsOpen ? 'true' : undefined}
                    className="tt-app-sidebar-footer-item"
                    aria-label="Open settings"
                  >
                    <AthleteAvatar
                      name={athleteProfile.name}
                      avatarUrl={athleteProfile.avatarUrl}
                      size="sm"
                      className="ring-1 ring-white/15"
                    />
                  </Link>
                ) : (
                  <div
                    className="tt-app-sidebar-profile"
                    data-open={profileOpen ? 'true' : undefined}
                  >
                    <button
                      type="button"
                      className="tt-app-sidebar-profile-main"
                      aria-expanded={profileOpen}
                      aria-controls="tt-sidebar-profile-options"
                      onClick={() => setProfileOpen((open) => !open)}
                    >
                      <AthleteAvatar
                        name={athleteProfile.name}
                        avatarUrl={athleteProfile.avatarUrl}
                        size="sm"
                        className="ring-1 ring-white/15"
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="tt-app-sidebar-profile-name truncate">
                          {athleteProfile.name}
                        </p>
                        <p className="tt-app-sidebar-profile-role capitalize">
                          {viewMode === 'coach' || isCoach ? 'coach' : 'athlete'}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-white/45 transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                          profileOpen && 'rotate-180 text-white/70',
                        )}
                        strokeWidth={1.75}
                      />
                    </button>

                    <div
                      id="tt-sidebar-profile-options"
                      className="tt-app-sidebar-profile-panel"
                      data-open={profileOpen ? 'true' : undefined}
                    >
                      <div className="tt-app-sidebar-profile-panel-inner">
                        <div className="tt-app-sidebar-profile-options">
                          {canSwitchView ? (
                            <ViewModeSwitcher
                              viewMode={viewMode}
                              tone="sidebar"
                              className="tt-app-sidebar-profile-switch"
                            />
                          ) : null}
                          {SETTINGS_SUBNAV.map(({ href, label, icon: Icon }) => {
                            const active = pathname.startsWith(href)
                            return (
                              <Link
                                key={href}
                                href={href}
                                data-active={active ? 'true' : undefined}
                                className="tt-app-sidebar-profile-option"
                              >
                                <Icon className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                                <span>{label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : canSwitchView && !effectiveCollapsed ? (
              <div className="tt-app-sidebar-profile tt-app-sidebar-profile--switch-only">
                <ViewModeSwitcher
                  viewMode={viewMode}
                  tone="sidebar"
                  className="tt-app-sidebar-profile-switch"
                />
              </div>
            ) : showPreferences && !athleteProfile ? (
              <Link
                href={SETTINGS_ENTRY_HREF}
                title="Settings"
                data-active={settingsOpen ? 'true' : undefined}
                className="tt-app-sidebar-footer-item"
              >
                <Settings className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                {!effectiveCollapsed && <span>Settings</span>}
              </Link>
            ) : null}

            <div className="tt-app-sidebar-footer-actions">
              <SignOutButton
                tone="sidebar"
                iconOnly={effectiveCollapsed}
                className="tt-app-sidebar-footer-item !mt-0"
              />

              <button
                type="button"
                title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-pressed={effectiveCollapsed}
                className="tt-app-sidebar-footer-item tt-app-sidebar-collapse-toggle"
                onClick={() => {
                  // Toggle the stored preference from what the user sees. Viewport /
                  // calendar locks can still force icon-rail without writing "collapsed".
                  setSidebarCollapsed(!effectiveCollapsed)
                }}
              >
                {effectiveCollapsed ? (
                  <ChevronRight className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                ) : (
                  <ChevronLeft className="tt-app-sidebar-nav-icon" strokeWidth={1.7} />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

/** Bottom tab bar — rendered outside AppNav Suspense so it stays visible during route transitions. */
export function AppMobileBottomNav({
  isCoach = false,
  dashboardNotificationCount = 0,
  viewMode = 'athlete',
}: {
  isCoach?: boolean
  dashboardNotificationCount?: number
  viewMode?: AppViewMode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inboxBadge = useInboxNavBadge(dashboardNotificationCount, viewMode)
  return (
    <MobileBottomNav
      items={getMainNav(isCoach)}
      pathname={pathname}
      query={searchParams.toString()}
      dashboardNotificationCount={inboxBadge}
    />
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
  const [mounted, setMounted] = useState(false)
  const openItem = items.find((item) => item.href === openHref && item.children?.length)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const nav = (
    <nav
      data-mobile-bottom-nav
      className="tt-mobile-bottom-nav portrait:max-lg:block landscape:max-lg:hidden lg:hidden"
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

      <div className="relative z-10 flex items-stretch justify-around bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
        {items.map(({ href, label, icon: Icon, children, subnavAlwaysVisible }) => {
          const childActive = children?.some((child) => isNavActive(pathname, child.href))
          const active = isNavActive(pathname, href) || Boolean(subnavAlwaysVisible && childActive)
          const showBadge = href === '/inbox' && dashboardNotificationCount > 0
          const hasSubmenu = Boolean(children?.length && !subnavAlwaysVisible)
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

  if (!mounted) return null
  return createPortal(nav, document.body)
}
