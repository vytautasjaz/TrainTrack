'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronsLeft, ChevronsRight, Moon, Sun, Zap } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CALCULATOR_NAV_TABS, getMainNav, PREFERENCES_NAV } from '@/lib/nav-items'

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
  isCoach = false,
  dashboardNotificationCount = 0,
  sidebarFooter,
}: {
  showPreferences?: boolean
  isCoach?: boolean
  dashboardNotificationCount?: number
  sidebarFooter?: ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const mainNav = getMainNav(isCoach)
  const calculatorsOpen = pathname === '/calculators' || pathname.startsWith('/calculators/')
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
      {/* Desktop sidebar — lg+ only (avoids sidebar on phone landscape) */}
      <aside
        className={cn(
          'hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:border-r lg:border-border lg:bg-card lg:py-6',
          'lg:transition-[width] lg:duration-200',
          collapsed ? 'lg:w-[4.5rem] lg:px-2' : 'lg:w-64 lg:px-4',
        )}
      >
        <div
          className={cn(
            'mb-6 flex shrink-0 items-center px-2',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-background">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-lg font-bold tracking-tight text-foreground">TrainTrack</p>
              <p className="text-xs text-muted-foreground">
                {isCoach ? 'Coach' : 'Training planner'}
              </p>
            </div>
          )}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href)
            const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
            const isCalculators = href === '/calculators'
            return (
              <div key={href}>
                <Link
                  href={href}
                  title={label}
                  className={cn(
                    'flex items-center rounded-[6px] py-2.5 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-4 w-4" />
                    {showBadge && (
                      <span
                        className={cn(
                          'absolute flex items-center justify-center rounded-full bg-foreground font-bold text-background',
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
                {!collapsed && isCalculators && calculatorsOpen ? (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
                    {CALCULATOR_NAV_TABS.map((tab) => {
                      const tabActive = activeCalculatorTab === tab.id
                      return (
                        <Link
                          key={tab.id}
                          href={tab.href}
                          className={cn(
                            'block rounded-[6px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                            tabActive
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
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
        <div className="mt-auto shrink-0 space-y-1 border-t border-border/40 pt-3">
          {showPreferences && (
            <Link
              href={PREFERENCES_NAV.href}
              title={PREFERENCES_NAV.label}
              className={cn(
                'mt-2 flex items-center rounded-[6px] py-2.5 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                pathname.startsWith('/settings')
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <PREFERENCES_NAV.icon className="h-4 w-4 shrink-0" />
              {!collapsed && PREFERENCES_NAV.label}
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className={cn(
              'mt-2 rounded-[6px]',
              collapsed ? 'w-full justify-center px-2' : 'justify-start gap-2',
            )}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && 'Toggle theme'}
          </Button>
          {!collapsed && sidebarFooter}
          <Button
            variant="ghost"
            size="sm"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className={cn(
              'mt-2 rounded-[6px]',
              collapsed ? 'w-full justify-center px-2' : 'w-full justify-start gap-2',
            )}
            onClick={() => setSidebarCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </aside>

      {/* Bottom nav — portrait phones */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-[var(--shadow-nav)] portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
          {(showPreferences ? [...mainNav, PREFERENCES_NAV] : mainNav).map(({ href, label, icon: Icon }) => {
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
