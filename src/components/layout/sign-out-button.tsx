'use client'

import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

type SignOutButtonProps = {
  className?: string
  /** Icon-only (e.g. collapsed sidebar) */
  iconOnly?: boolean
  /** Visual style for dark gradient sidebar vs light mobile menu */
  tone?: 'sidebar' | 'menu'
}

export function SignOutButton({
  className,
  iconOnly = false,
  tone = 'menu',
}: SignOutButtonProps) {
  const sidebar = tone === 'sidebar'

  return (
    <form action={signOutAction} className={sidebar ? 'w-full' : undefined}>
      <button
        type="submit"
        title="Log out"
        aria-label="Log out"
        className={cn(
          sidebar
            ? 'tt-app-sidebar-footer-item'
            : cn(
                'flex w-full items-center rounded-[10px] text-sm font-medium transition-colors',
                iconOnly ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              ),
          className,
        )}
      >
        <LogOut
          className={sidebar ? 'tt-app-sidebar-nav-icon' : 'h-4 w-4 shrink-0'}
          strokeWidth={1.7}
        />
        {!iconOnly ? <span>{sidebar ? 'Sign out' : 'Log out'}</span> : null}
      </button>
    </form>
  )
}
