'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggleButton } from '@/components/theme-toggle-button'
import { SignOutButton } from '@/components/layout/sign-out-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CONNECT_COACH_NAV,
  getMainNav,
  SETTINGS_ENTRY_HREF,
  SETTINGS_SUBNAV,
} from '@/lib/nav-items'
import { cn } from '@/lib/utils'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { ViewModeSwitcher } from '@/components/layout/view-mode-switcher'
import { useInboxNavBadge } from '@/components/layout/inbox-nav-badge'
import type { AppViewMode } from '@/lib/session'

type MobileNavMenuProps = {
  showPreferences?: boolean
  showConnectCoach?: boolean
  isCoach?: boolean
  canSwitchView?: boolean
  viewMode?: AppViewMode
  dashboardNotificationCount?: number
  athleteProfile?: { name: string; avatarUrl: string | null } | null
  /** Light = default ink; dark = white icon for dark top bars. */
  tone?: 'light' | 'dark'
}

export function MobileNavMenu({
  showPreferences = true,
  showConnectCoach = false,
  isCoach = false,
  canSwitchView = false,
  viewMode = 'athlete',
  dashboardNotificationCount = 0,
  athleteProfile = null,
  tone = 'light',
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false)
  const [expandedHref, setExpandedHref] = useState<string | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const mainItems = getMainNav(isCoach)
  const settingsOpen = pathname.startsWith('/settings')
  const activeCalculatorTab = searchParams.get('tab') ?? 'running'
  const inboxBadge = useInboxNavBadge(dashboardNotificationCount, viewMode)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 w-9 shrink-0 rounded-[6px] p-0 landscape:max-lg:inline-flex lg:hidden',
          tone === 'dark' &&
            'text-white hover:bg-white/10 hover:text-white',
        )}
        onClick={() => {
          setOpen(true)
          const current = mainItems.find(
            (item) =>
              item.children?.length &&
              !item.subnavAlwaysVisible &&
              pathname.startsWith(item.href),
          )
          setExpandedHref(current?.href ?? null)
        }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          {canSwitchView ? (
            <ViewModeSwitcher
              viewMode={viewMode}
              tone="light"
              className="mb-2"
              onSwitchStart={() => setOpen(false)}
            />
          ) : null}
          <nav className="flex flex-col gap-0.5">
            {mainItems.map(({ href, label, icon: Icon, children, subnavAlwaysVisible }) => {
              const childActive = children?.some(
                (child) =>
                  pathname === child.href || pathname.startsWith(`${child.href}/`),
              )
              const active = pathname.startsWith(href) || Boolean(subnavAlwaysVisible && childActive)
              const showBadge = href === '/inbox' && inboxBadge > 0
              const hasCollapsibleSubmenu = Boolean(children?.length && !subnavAlwaysVisible)
              const expanded = hasCollapsibleSubmenu && expandedHref === href
              const showChildren = children && (subnavAlwaysVisible || expanded)
              return (
                <div key={href}>
                  {hasCollapsibleSubmenu ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedHref(expanded ? null : href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span className="relative">
                        <Icon className="h-4 w-4" />
                        {showBadge && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                            {inboxBadge > 9 ? '9+' : inboxBadge}
                          </span>
                        )}
                      </span>
                      {label}
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 shrink-0 transition-transform',
                          expanded && 'rotate-180',
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span className="relative">
                        <Icon className="h-4 w-4" />
                        {showBadge && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                            {inboxBadge > 9 ? '9+' : inboxBadge}
                          </span>
                        )}
                      </span>
                      {label}
                    </Link>
                  )}
                  {showChildren ? (
                    <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
                      {children.map((child) => {
                        const tabActive =
                          href === '/tools'
                            ? pathname.startsWith(href) &&
                              child.href.includes(`tab=${activeCalculatorTab}`)
                            : pathname === child.href || pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              'block rounded-[6px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                              tabActive
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                            )}
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
          {showPreferences && athleteProfile ? (
            <div className="mt-3">
              <Link
                href={SETTINGS_ENTRY_HREF}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors',
                  settingsOpen
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/50 text-foreground hover:bg-muted/80',
                )}
              >
                <AthleteAvatar
                  name={athleteProfile.name}
                  avatarUrl={athleteProfile.avatarUrl}
                  size="sm"
                />
                <p className="min-w-0 truncate text-sm font-semibold">
                  {athleteProfile.name}
                </p>
              </Link>
              {settingsOpen ? (
                <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
                  {SETTINGS_SUBNAV.map(({ href, label }) => {
                    const active = pathname.startsWith(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'block rounded-[6px] px-2.5 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
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
              onClick={() => setOpen(false)}
              className={cn(
                'mt-1 flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-medium transition-colors',
                'text-foreground hover:bg-muted/60',
              )}
            >
              <CONNECT_COACH_NAV.icon className="h-4 w-4" />
              {CONNECT_COACH_NAV.label}
            </Link>
          ) : null}
          <ThemeToggleButton
            label="Toggle theme"
            className="mt-2 justify-start gap-2 rounded-[6px]"
          />
          <SignOutButton tone="menu" className="mt-1 rounded-[6px]" />
        </DialogContent>
      </Dialog>
    </>
  )
}
