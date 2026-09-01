'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'

export function useExpandScroll(
  expandedKey: string | null | undefined,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!expandedKey) return
    const el = panelRef.current
    if (!el) return
    const t1 = window.setTimeout(() => scrollExpandedIntoView(el), 40)
    const t2 = window.setTimeout(() => scrollExpandedIntoView(el), 360)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [expandedKey, panelRef])
}

function scrollExpandedIntoView(el: HTMLElement) {
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

/** Animated height slide — children stay mounted so grid can animate smoothly. */
export function ExpandShell({
  open,
  children,
  panelRef,
  className,
  panelClassName,
  scrollKey,
}: {
  open: boolean
  children: ReactNode
  panelRef?: RefObject<HTMLDivElement | null>
  className?: string
  panelClassName?: string
  /** When set, scrolls panel into view after expand animation */
  scrollKey?: string | null
}) {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const ref = panelRef ?? internalRef
  useExpandScroll(open ? (scrollKey ?? null) : null, ref)

  return (
    <div
      className={cn('tt-expand-shell', className)}
      data-open={open ? 'true' : 'false'}
      data-animate="true"
      ref={open ? ref : undefined}
    >
      <div className="tt-expand-shell-inner">
        <div className={cn('tt-expand-panel', panelClassName)}>{children}</div>
      </div>
    </div>
  )
}
