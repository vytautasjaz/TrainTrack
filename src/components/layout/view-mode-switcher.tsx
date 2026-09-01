'use client'

import { switchViewMode } from '@/app/actions/session'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'

type ViewModeSwitcherProps = {
  viewMode: AppViewMode
  /** Compact for collapsed sidebar icon rail. */
  compact?: boolean
  /** Sidebar (dark gradient pill) vs light surfaces (mobile menu). */
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

  if (isSidebarTone && !compact) {
    return (
      <div
        className={cn('tt-app-sidebar-mode-switch', className)}
        role="group"
        aria-label="Switch between athlete and coach"
      >
        {(['athlete', 'coach'] as const).map((mode) => {
          const active = viewMode === mode
          const label = mode === 'athlete' ? 'ATHLETE' : 'COACH'
          return (
            <form key={mode} action={switchViewMode}>
              <input type="hidden" name="mode" value={mode} />
              <button
                type="submit"
                disabled={active}
                title={mode === 'athlete' ? 'Athlete' : 'Coach'}
                aria-pressed={active}
                data-active={active ? 'true' : undefined}
              >
                {label}
              </button>
            </form>
          )
        })}
      </div>
    )
  }

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
                  ? isSidebarTone
                    ? 'cursor-default font-bold text-white underline decoration-brand decoration-2 underline-offset-4'
                    : 'cursor-default font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4'
                  : isSidebarTone
                    ? 'font-medium text-white/55 hover:text-white'
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
