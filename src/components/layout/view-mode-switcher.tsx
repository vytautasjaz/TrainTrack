'use client'

import { switchViewMode } from '@/app/actions/session'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'

type ViewModeSwitcherProps = {
  viewMode: AppViewMode
  /** Compact for collapsed sidebar icon rail. */
  compact?: boolean
  /** Sidebar (light editorial) vs light surfaces (mobile menu). */
  tone?: 'sidebar' | 'light'
  className?: string
}

export function ViewModeSwitcher({
  viewMode,
  compact = false,
  tone = 'sidebar',
  className,
}: ViewModeSwitcherProps) {
  const isSidebarTone = tone === 'sidebar'

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        compact && 'flex-col gap-1',
        className,
      )}
      role="group"
      aria-label="Switch between athlete and coach"
    >
      {(['athlete', 'coach'] as const).map((mode) => {
        const active = viewMode === mode
        const label = mode === 'athlete' ? 'Athlete' : 'Coach'
        return (
          <form key={mode} action={switchViewMode}>
            <input type="hidden" name="mode" value={mode} />
            <button
              type="submit"
              disabled={active}
              title={label}
              aria-pressed={active}
              className={cn(
                'cursor-pointer rounded-sm text-[10px] tracking-wide transition',
                compact ? 'px-1 py-0.5' : 'px-0.5 py-0.5',
                active
                  ? 'cursor-default font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4'
                  : isSidebarTone
                    ? 'font-medium text-text-tertiary hover:text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              {compact ? (mode === 'athlete' ? 'A' : 'C') : label}
            </button>
          </form>
        )
      })}
    </div>
  )
}
