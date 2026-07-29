'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CALCULATOR_NAV_TABS, getMainNav, PREFERENCES_NAV } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

type MobileNavMenuProps = {
  showPreferences?: boolean
  isCoach?: boolean
  dashboardNotificationCount?: number
  menuFooter?: ReactNode
}

export function MobileNavMenu({
  showPreferences = true,
  isCoach = false,
  dashboardNotificationCount = 0,
  menuFooter,
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const items = showPreferences ? [...getMainNav(isCoach), PREFERENCES_NAV] : getMainNav(isCoach)
  const calculatorsOpen = pathname === '/calculators' || pathname.startsWith('/calculators/')
  const activeCalculatorTab = searchParams.get('tab') ?? 'running'

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 shrink-0 rounded-[6px] p-0 landscape:max-lg:inline-flex lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col gap-0.5">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
              const isCalculators = href === '/calculators'
              return (
                <div key={href}>
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
                          {dashboardNotificationCount > 9 ? '9+' : dashboardNotificationCount}
                        </span>
                      )}
                    </span>
                    {label}
                  </Link>
                  {isCalculators && calculatorsOpen ? (
                    <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
                      {CALCULATOR_NAV_TABS.map((tab) => {
                        const tabActive = activeCalculatorTab === tab.id
                        return (
                          <Link
                            key={tab.id}
                            href={tab.href}
                            onClick={() => setOpen(false)}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 justify-start gap-2 rounded-[6px]"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Toggle theme
          </Button>
          {menuFooter}
        </DialogContent>
      </Dialog>
    </>
  )
}
