'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getMainNav, PREFERENCES_NAV } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

type MobileNavMenuProps = {
  showPreferences?: boolean
  isCoach?: boolean
  dashboardNotificationCount?: number
}

export function MobileNavMenu({
  showPreferences = true,
  isCoach = false,
  dashboardNotificationCount = 0,
  menuFooter,
}: MobileNavMenuProps & { menuFooter?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const items = showPreferences ? [...getMainNav(isCoach), PREFERENCES_NAV] : getMainNav(isCoach)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 shrink-0 rounded-xl p-0 landscape:max-lg:inline-flex lg:hidden"
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
          <nav className="flex flex-col gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              const showBadge = href === '/dashboard' && dashboardNotificationCount > 0
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-brand/10 text-brand'
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 justify-start gap-2 rounded-2xl"
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
