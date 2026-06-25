'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun, Zap } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getMainNav, PREFERENCES_NAV } from '@/lib/nav-items'

export function AppNav({
  showPreferences = true,
  isCoach = false,
  dashboardNotificationCount = 0,
}: {
  showPreferences?: boolean
  isCoach?: boolean
  dashboardNotificationCount?: number
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const mainNav = getMainNav(isCoach)

  return (
    <>
      {/* Desktop sidebar — lg+ only (avoids sidebar on phone landscape) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border/60 lg:bg-card/80 lg:px-4 lg:py-6 lg:backdrop-blur">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">TrainTrack</p>
            <p className="text-xs text-muted-foreground">Training planner</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-brand/10 font-medium text-brand'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                      {dashboardNotificationCount > 9 ? '9+' : dashboardNotificationCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>
        {showPreferences && (
          <Link
            href={PREFERENCES_NAV.href}
            className={cn(
              'mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
              pathname.startsWith('/settings')
                ? 'bg-brand/10 font-medium text-brand'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <PREFERENCES_NAV.icon className="h-4 w-4" />
            {PREFERENCES_NAV.label}
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 justify-start gap-2 rounded-2xl"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Toggle theme
        </Button>
      </aside>

      {/* Bottom nav — portrait phones only; hidden in landscape (use menu button) */}
      <nav className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        <div className="flex items-center justify-around rounded-full bg-hero px-1 py-1.5 shadow-[var(--shadow-float)]">
          {(showPreferences ? [...mainNav, PREFERENCES_NAV] : mainNav).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full py-1 text-[9px] font-semibold transition-all',
                  active ? 'text-brand' : 'text-hero-foreground/50',
                )}
              >
                <span
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-full transition-all',
                    active && 'bg-brand/15',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {showBadge && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-hero" />
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
