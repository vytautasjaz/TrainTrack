'use client'

import type { ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import {
  FixedPortalMenu,
  FixedPortalMenuGroupLabel,
  FixedPortalMenuItem,
  FixedPortalMenuSeparator,
} from '@/components/ui/fixed-portal-menu'
import { cn } from '@/lib/utils'

type FlipMenuProps = {
  label: string
  children: (close: () => void) => ReactNode
  className?: string
  align?: 'start' | 'center'
  menuClassName?: string
}

/**
 * Strength builder “Add …” control — thin wrapper over FixedPortalMenu.
 */
export function FlipMenu({
  label,
  children,
  className,
  align = 'start',
  menuClassName,
}: FlipMenuProps) {
  return (
    <FixedPortalMenu
      align={align}
      className={className}
      menuClassName={cn(
        'z-[320] min-w-[12rem] rounded-[8px] border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white p-1',
        menuClassName,
      )}
      trigger={({ open, props }) => (
        <button
          {...props}
          className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-transparent px-2 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:border-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink,#111315)]"
        >
          <Plus className="h-3 w-3" aria-hidden />
          {label}
          <ChevronDown
            className={cn(
              'h-3 w-3 opacity-60 transition',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      )}
    >
      {children}
    </FixedPortalMenu>
  )
}

export const FlipMenuSeparator = FixedPortalMenuSeparator
export const FlipMenuGroupLabel = FixedPortalMenuGroupLabel

export function FlipMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <FixedPortalMenuItem
      onSelect={onSelect}
      className="rounded-[5px] px-2 py-1.5 text-[12px] font-medium text-[var(--tt-ink,#111315)] hover:bg-[var(--tt-v2-light,#F5F6F7)]"
    >
      {children}
    </FixedPortalMenuItem>
  )
}
