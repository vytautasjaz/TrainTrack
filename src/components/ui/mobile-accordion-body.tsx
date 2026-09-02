'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Mobile accordion body — animates open/closed; always expanded from md up. */
export function MobileAccordionBody({
  expanded,
  className,
  children,
}: {
  expanded: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="tt-mobile-accordion"
      data-open={expanded ? 'true' : 'false'}
    >
      <div className="tt-mobile-accordion-inner">
        <div className={cn('tt-mobile-accordion-content', className)}>
          {children}
        </div>
      </div>
    </div>
  )
}

const TITLE_CLASS =
  'font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]'

/** Display-font section title; optionally a mobile accordion toggle. */
export function HomeMobileSectionHeader({
  title,
  expanded = true,
  onToggle,
  collapsible = true,
  subtitle,
  trailing,
  className,
}: {
  title: string
  expanded?: boolean
  onToggle?: () => void
  /** When false, title is static (no chevron / collapse). Default true. */
  collapsible?: boolean
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  const canCollapse = collapsible && Boolean(onToggle)
  const titleBlock = (
    <div className="min-w-0">
      <h2 className={TITLE_CLASS}>{title}</h2>
      {subtitle ? (
        <div className="mt-0.5 text-[10px] text-[var(--tt-ink-faint,#9a9a9a)]">
          {subtitle}
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2',
        canCollapse &&
          !expanded &&
          'border-b border-[var(--tt-line,#ebebeb)] pb-3 md:border-b-0 md:pb-0',
        className,
      )}
    >
      {canCollapse ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left md:pointer-events-none"
        >
          {titleBlock}
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
              expanded && 'rotate-180',
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      ) : (
        <div className="min-w-0 flex-1">{titleBlock}</div>
      )}
      {trailing ? (
        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5',
            canCollapse && !expanded && 'hidden md:flex',
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  )
}
