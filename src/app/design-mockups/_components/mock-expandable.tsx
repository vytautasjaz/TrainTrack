'use client'

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared scroll-into-view after expand animation.
 * Pass the expanded id/key (not just boolean) so switching rows re-scrolls.
 */
export function useMockExpandScroll(
  expandedKey: string | null | undefined | false,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!expandedKey) return
    const el = panelRef.current
    if (!el) return
    const t1 = window.setTimeout(() => scrollExpandedIntoView(el), 40)
    const t2 = window.setTimeout(() => scrollExpandedIntoView(el), 380)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [expandedKey, panelRef])
}

export function scrollExpandedIntoView(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const padding = 24
  const viewBottom = window.innerHeight - padding
  const viewTop = padding

  if (rect.bottom > viewBottom) {
    window.scrollBy({ top: rect.bottom - viewBottom, behavior: 'smooth' })
    return
  }
  if (rect.top < viewTop) {
    window.scrollBy({ top: rect.top - viewTop, behavior: 'smooth' })
  }
}

/** Animated slide shell — keep children mounted so height can animate. */
export function MockExpandShell({
  open,
  children,
  panelRef,
  className,
  panelClassName,
}: {
  open: boolean
  children: ReactNode
  panelRef?: RefObject<HTMLDivElement | null>
  className?: string
  panelClassName?: string
}) {
  return (
    <div
      className={cn('tt-mock-expand-shell', className)}
      data-open={open}
      ref={open ? panelRef : undefined}
    >
      <div className="tt-mock-expand-shell-inner">
        <div className={cn('tt-mock-athlete-expand-panel', panelClassName)}>{children}</div>
      </div>
    </div>
  )
}

/**
 * Card-style expandable: white trigger, continuous red rail when open,
 * grey sliding panel. Same pattern for attention blocks + mobile roster.
 */
export function MockExpandable({
  open,
  onToggle,
  trigger,
  children,
  className,
  panelClassName,
  expandKey,
}: {
  open: boolean
  onToggle: () => void
  /** Receives open so trigger can restyle chevron / avatar */
  trigger: (ctx: { open: boolean }) => ReactNode
  children: ReactNode
  className?: string
  panelClassName?: string
  /** Stable id for scroll-into-view when this row opens */
  expandKey?: string
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useMockExpandScroll(open ? (expandKey ?? 'open') : null, panelRef)

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        open ? 'bg-[var(--tt-sidebar)]' : 'bg-white',
        className,
      )}
    >
      {open ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px] bg-[var(--tt-red)]"
          aria-hidden
        />
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="relative w-full bg-white text-left transition hover:bg-[var(--tt-bg)]"
      >
        {trigger({ open })}
      </button>

      <MockExpandShell
        open={open}
        panelRef={panelRef}
        panelClassName={cn(
          'border-t border-[var(--tt-line)] bg-[var(--tt-sidebar)]',
          panelClassName,
        )}
      >
        {children}
      </MockExpandShell>
    </div>
  )
}
