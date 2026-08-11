'use client'

import { switchViewMode } from '@/app/actions/session'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'

type ViewModeSwitcherProps = {
  viewMode: AppViewMode
  /** Compact for collapsed sidebar icon rail. */
  compact?: boolean
  /** Sidebar (dark) vs light surfaces (mobile menu). */
  tone?: 'sidebar' | 'light'
  className?: string
}

export function ViewModeSwitcher({
  viewMode,
  compact = false,
  tone = 'sidebar',
  className,
}: ViewModeSwitcherProps) {
  const light = tone === 'light'

  return (
    <div
      className={cn(
        'flex rounded-[8px] p-0.5',
        light ? 'bg-muted' : 'bg-white/10',
        compact && 'flex-col gap-0.5',
        className,
      )}
      role="group"
      aria-label="Switch between athlete and coach"
    >
      {(['athlete', 'coach'] as const).map((mode) => {
        const active = viewMode === mode
        const label = mode === 'athlete' ? 'Athlete' : 'Coach'
        return (
          <form key={mode} action={switchViewMode} className={compact ? 'w-full' : 'min-w-0 flex-1'}>
            <input type="hidden" name="mode" value={mode} />
            <button
              type="submit"
              disabled={active}
              title={label}
              aria-pressed={active}
              className={cn(
                'w-full rounded-[6px] text-[11px] font-semibold tracking-wide transition',
                compact ? 'px-1.5 py-1' : 'px-2 py-1',
                active
                  ? light
                    ? 'bg-card text-foreground shadow-sm'
                    : 'bg-white text-sidebar shadow-sm'
                  : light
                    ? 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                    : 'text-white/55 hover:bg-white/5 hover:text-white',
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
