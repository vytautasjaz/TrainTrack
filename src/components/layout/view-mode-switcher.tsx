'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { switchViewMode } from '@/app/actions/session'
import type { AppViewMode } from '@/lib/session'
import { cn } from '@/lib/utils'
import { useViewModeSwitch } from '@/components/layout/view-mode-switch-context'

type ViewModeSwitcherProps = {
  viewMode: AppViewMode
  /** Compact for collapsed sidebar icon rail. */
  compact?: boolean
  /** Sidebar (dark gradient pill) vs light surfaces (mobile menu). */
  tone?: 'sidebar' | 'light'
  className?: string
  /** Called right before a switch starts (e.g. close mobile menu). */
  onSwitchStart?: () => void
}

const MODES = ['athlete', 'coach'] as const satisfies readonly AppViewMode[]

function selectedMode(
  viewMode: AppViewMode,
  isPending: boolean,
  targetMode: AppViewMode | null,
): AppViewMode {
  if (isPending && targetMode) return targetMode
  return viewMode
}

function modeLabel(mode: AppViewMode) {
  return mode === 'coach' ? 'Coach' : 'Athlete'
}

export function ViewModeSwitcher({
  viewMode,
  compact = false,
  tone = 'sidebar',
  className,
  onSwitchStart,
}: ViewModeSwitcherProps) {
  const ctx = useViewModeSwitch()
  const [localPending, startLocalTransition] = useTransition()
  const isPending = ctx?.isPending ?? localPending
  const targetMode = ctx?.targetMode ?? null
  const isSidebarTone = tone === 'sidebar'
  const thumbAt = selectedMode(viewMode, isPending, targetMode)

  function handleSwitch(mode: AppViewMode) {
    if (mode === viewMode || isPending) return
    onSwitchStart?.()
    if (ctx) {
      ctx.switchTo(mode, viewMode)
      return
    }
    const formData = new FormData()
    formData.set('mode', mode)
    startLocalTransition(async () => {
      await switchViewMode(formData)
    })
  }

  if (isSidebarTone && !compact) {
    return (
      <div
        className={cn(
          'tt-app-sidebar-mode-switch tt-app-sidebar-mode-switch--animated',
          isPending && 'tt-app-sidebar-mode-switch--pending',
          className,
        )}
        role="group"
        aria-label="Switch between athlete and coach"
        aria-busy={isPending}
      >
        <span
          className="tt-app-sidebar-mode-switch-thumb"
          data-position={thumbAt}
          aria-hidden
        />
        {MODES.map((mode) => {
          const selected = thumbAt === mode
          const label = mode === 'athlete' ? 'ATHLETE' : 'COACH'
          return (
            <button
              key={mode}
              type="button"
              disabled={isPending}
              title={mode === 'athlete' ? 'Athlete' : 'Coach'}
              aria-pressed={selected}
              data-selected={selected ? 'true' : undefined}
              onClick={() => handleSwitch(mode)}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('tt-view-mode-switch-inline-wrap', className)}>
      <div
        className={cn(
          'tt-view-mode-switch-inline',
          compact && 'tt-view-mode-switch-inline--compact',
          isSidebarTone && 'tt-view-mode-switch-inline--sidebar',
          isPending && 'tt-view-mode-switch-inline--pending',
        )}
        role="group"
        aria-label="Switch between athlete and coach"
        aria-busy={isPending}
      >
        {!compact ? (
          <span
            className="tt-view-mode-switch-inline-thumb"
            data-position={thumbAt}
            aria-hidden
          />
        ) : null}
        {MODES.map((mode) => {
          const selected = thumbAt === mode
          const label = mode === 'athlete' ? 'Athlete' : 'Coach'
          return (
            <button
              key={mode}
              type="button"
              disabled={isPending}
              title={label}
              aria-pressed={selected}
              data-selected={selected ? 'true' : undefined}
              onClick={() => handleSwitch(mode)}
              className={cn(
                'relative z-[1] cursor-pointer rounded-sm text-[10px] tracking-wide transition-colors',
                compact ? 'px-1 py-0.5' : 'px-2 py-0.5',
                selected
                  ? isSidebarTone
                    ? 'font-bold text-white'
                    : 'font-bold text-foreground'
                  : isSidebarTone
                    ? 'font-medium text-white/55 hover:text-white'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                isPending && 'cursor-wait',
              )}
            >
              {compact ? (mode === 'athlete' ? 'A' : 'C') : label}
            </button>
          )
        })}
      </div>
      {isPending && targetMode && !isSidebarTone ? (
        <p className="tt-view-mode-switch-inline-status" role="status" aria-live="polite">
          <Loader2 className="tt-view-mode-switch-status-spinner" aria-hidden />
          Switching to {modeLabel(targetMode)}…
        </p>
      ) : null}
    </div>
  )
}
