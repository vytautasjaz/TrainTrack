'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronsLeft, ChevronsRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggleButton } from '@/components/theme-toggle-button'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { SignOutButton } from '@/components/layout/sign-out-button'
import {
  CALCULATOR_NAV_TABS,
  CONNECT_COACH_NAV,
  getMainNav,
  SETTINGS_ENTRY_HREF,
  SETTINGS_SUBNAV,
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
  dashboardNotificationCount = 0,
  sidebarFooter,
  athleteProfile = null,
}: {
  showPreferences?: boolean
  showConnectCoach?: boolean
  isCoach?: boolean
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

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ)

    function applyForViewport() {
      if (mq.matches) {
        setCollapsed(true)
        syncSidebarCollapsedAttr(true)
        return
      }
      const stored = readStoredCollapsed()
      setCollapsed(stored)
      syncSidebarCollapsedAttr(stored)
    }

    applyForViewport()
    mq.addEventListener('change', applyForViewport)
    return () => mq.removeEventListener('change', applyForViewport)
  }, [])

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next)
    syncSidebarCollapsedAttr(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Desktop sidebar — dark charcoal rail (Design System v3) */}
      <aside
        className={cn(
          'hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:bg-sidebar lg:py-6',
          'lg:text-sidebar-foreground lg:transition-[width] lg:duration-[var(--tt-motion-normal)]',
          collapsed ? 'lg:w-[4.5rem] lg:px-2' : 'lg:w-64 lg:px-4',
        )}
      >
        <div
          className={cn(
            'mb-8 flex shrink-0 items-center px-2',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-sidebar">
            <Zap className="h-4 w-4" strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground">
                TrainTrack
              </p>
              <p className="text-xs text-white/45">
                {isCoach ? 'Coach' : 'Athlete'}
              </p>
            </div>
          )}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href)
            const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
            const isTools = href === '/tools'
            return (
              <div key={href}>
                <Link
                  href={href}
                  title={label}
                  className={cn(
                    'flex items-center rounded-[10px] py-2.5 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {showBadge && (
                      <span
                        className={cn(
                          'absolute flex items-center justify-center rounded-full bg-white font-bold text-sidebar',
                          collapsed
                            ? '-right-1.5 -top-1.5 h-2 w-2'
                            : '-right-1.5 -top-1.5 h-4 min-w-4 px-1 text-[10px]',
                        )}
                      >
                        {!collapsed &&
                          (dashboardNotificationCount > 9
                            ? '9+'
                            : dashboardNotificationCount)}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
                {!collapsed && isTools && toolsOpen ? (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-white/15 pl-3">
                    {CALCULATOR_NAV_TABS.map((tab) => {
                      const tabActive = activeCalculatorTab === tab.id
                      return (
                        <Link
                          key={tab.id}
                          href={tab.href}
                          className={cn(
                            'block rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                            tabActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/45 hover:bg-white/5 hover:text-white',
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
        <div className="mt-auto shrink-0 space-y-1 border-t border-white/10 pt-3">
          {showPreferences && athleteProfile ? (
            <div>
              {collapsed ? (
                <Link
                  href={SETTINGS_ENTRY_HREF}
                  title={athleteProfile.name}
                  className={cn(
                    'flex justify-center rounded-[10px] py-1.5 transition-colors',
                    settingsOpen ? 'bg-white/10' : 'hover:bg-white/5',
                  )}
                >
                  <AthleteAvatar
                    name={athleteProfile.name}
                    avatarUrl={athleteProfile.avatarUrl}
                    size="sm"
                    className="ring-2 ring-white/15"
                  />
                </Link>
              ) : (
                <Link
                  href={SETTINGS_ENTRY_HREF}
                  title={athleteProfile.name}
                  className={cn(
                    'mb-1 flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors',
                    settingsOpen
                      ? 'bg-white/10 text-white'
                      : 'text-sidebar-foreground hover:bg-white/5 hover:text-white',
                  )}
                >
                  <AthleteAvatar
                    name={athleteProfile.name}
                    avatarUrl={athleteProfile.avatarUrl}
                    size="sm"
                    className="ring-2 ring-white/15"
                  />
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {athleteProfile.name}
                  </p>
                </Link>
              )}
              {!collapsed && settingsOpen ? (
                <div className="mt-1 ml-4 space-y-0.5 border-l border-white/15 pl-3">
                  {SETTINGS_SUBNAV.map(({ href, label }) => {
                    const active = pathname.startsWith(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          'block rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-white/10 text-white'
                            : 'text-white/45 hover:bg-white/5 hover:text-white',
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
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                'text-white/90 hover:bg-white/10 hover:text-white',
              )}
            >
              <CONNECT_COACH_NAV.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && CONNECT_COACH_NAV.label}
            </Link>
          ) : null}
          <ThemeToggleButton
            showLabel={!collapsed}
            className={cn(
              'mt-2 rounded-[10px] text-white/55 hover:bg-white/5 hover:text-white',
              collapsed ? 'w-full justify-center px-2' : 'justify-start gap-2',
            )}
          />
          <SignOutButton tone="sidebar" iconOnly={collapsed} className="mt-1" />
          {!collapsed && (
            <div className="sidebar-footer text-sidebar-foreground [&_.text-label]:text-white/40 [&_.text-caption]:text-white/40 [&_button]:bg-white/10 [&_button]:text-white [&_select]:border-white/15 [&_select]:bg-white/5 [&_select]:text-white">
              {sidebarFooter}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className={cn(
              'mt-2 rounded-[10px] text-white/55 hover:bg-white/5 hover:text-white',
              collapsed ? 'w-full justify-center px-2' : 'w-full justify-start gap-2',
            )}
            onClick={() => setSidebarCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            )}
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </aside>

      {/* Bottom nav — portrait phones */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-[var(--shadow-nav)] portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href)
            const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors',
                    active && 'bg-muted',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
                  {showBadge && (
                    <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-foreground ring-2 ring-card" />
                  )}
                </span>
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
