'use client'

import Link from 'next/link'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DATA_TABLE, DATA_TABLE_SHELL } from '@/lib/table-styles'
import { MobileAccordionBody } from '@/components/ui/mobile-accordion-body'
import { cn } from '@/lib/utils'

export function CoachHomePanelHeader({
  title,
  count,
  href,
  linkLabel,
  onLinkClick,
  collapsible,
  expanded = true,
  onToggle,
}: {
  title: string
  count?: number
  href?: string
  linkLabel?: string
  onLinkClick?: () => void
  /** Mobile-only accordion: title toggles body visibility. */
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  const titleRow = (
    <div className="flex min-w-0 items-baseline gap-2">
      <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)] md:font-sans md:text-[0.6875rem] md:font-semibold md:tracking-[0.08em]">
        {title}
      </h2>
      {count != null && count > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tt-red)] px-1.5 text-[11px] font-semibold tabular-nums text-white md:bg-[color-mix(in_srgb,var(--tt-red)_12%,white)] md:text-[var(--tt-red)]">
          {count}
        </span>
      ) : null}
    </div>
  )

  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      {collapsible && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left md:pointer-events-none"
        >
          {titleRow}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
              expanded && 'rotate-180',
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      ) : (
        titleRow
      )}
      {onLinkClick && linkLabel ? (
        <button
          type="button"
          onClick={onLinkClick}
          className="text-[12px] font-semibold text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)]"
        >
          {linkLabel}
        </button>
      ) : href && linkLabel ? (
        <Link
          href={href}
          className="text-[12px] font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

/** Mobile accordion body — animates open/closed; always expanded from md up. */
export function CoachHomeMobileAccordionBody({
  expanded,
  className,
  children,
}: {
  expanded: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <MobileAccordionBody expanded={expanded} className={className}>
      {children}
    </MobileAccordionBody>
  )
}

export function CoachHomePanelEmpty({ message }: { message: string }) {
  return (
    <div className={DATA_TABLE_SHELL}>
      <p className="px-4 py-8 text-center text-[13px] text-[var(--tt-ink-faint)]">{message}</p>
    </div>
  )
}

export function CoachHomePanelTable({
  children,
  className,
  tableClassName,
}: {
  children: React.ReactNode
  className?: string
  tableClassName?: string
}) {
  return (
    <div className={cn(DATA_TABLE_SHELL, className)}>
      <table className={cn(DATA_TABLE, tableClassName)} data-density="compact">
        {children}
      </table>
    </div>
  )
}

export function CoachHomePanelFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex items-center justify-between gap-3">{children}</div>
}

export function CoachHomePanelFooterNote({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-[var(--tt-ink-faint)]">{children}</p>
}

export function CoachHomeTablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPrevious,
  onNext,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPrevious: () => void
  onNext: () => void
}) {
  if (total <= pageSize) return null

  const rangeStart = page * pageSize + 1
  const rangeEnd = Math.min(total, (page + 1) * pageSize)

  return (
    <CoachHomePanelFooter>
      <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
        {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex items-center gap-1">
        <PaginationButton label="Previous page" disabled={page <= 0} onClick={onPrevious}>
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </PaginationButton>
        <span className="min-w-[3rem] text-center text-[11px] tabular-nums text-[var(--tt-ink-soft)]">
          {page + 1} / {pageCount}
        </span>
        <PaginationButton
          label="Next page"
          disabled={page >= pageCount - 1}
          onClick={onNext}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </PaginationButton>
      </div>
    </CoachHomePanelFooter>
  )
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--tt-line)] text-[var(--tt-ink-soft)] transition',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
      )}
    >
      {children}
    </button>
  )
}

export type CoachHomeBadgeVariant =
  | 'needs_reply'
  | 'on_track'
  | 'missed_session'
  | 'at_risk'
  | 'under_planned'
  | 'neutral'
  | 'attention_message'
  | 'attention_feedback'
  | 'attention_join'
  | 'attention_planning'
  | 'attention_race'

export function CoachHomeStatusBadge({
  label,
  variant,
  compact = false,
  noTruncate = false,
}: {
  label: string
  variant: CoachHomeBadgeVariant
  compact?: boolean
  noTruncate?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full font-semibold uppercase tracking-[0.03em]',
        !noTruncate && 'max-w-full',
        compact ? 'px-1.5 py-0.5 text-[9px] leading-tight' : 'px-2 py-0.5 text-[10px]',
        variant === 'needs_reply' &&
          'bg-[color-mix(in_srgb,var(--tt-red)_10%,white)] text-[var(--tt-red)]',
        variant === 'on_track' &&
          'bg-[color-mix(in_srgb,var(--tt-good)_12%,white)] text-[var(--tt-good)]',
        variant === 'missed_session' &&
          'bg-[color-mix(in_srgb,#f97316_12%,white)] text-[#c2410c]',
        variant === 'at_risk' &&
          'bg-[color-mix(in_srgb,#eab308_12%,white)] text-[#a16207]',
        variant === 'under_planned' &&
          'bg-[color-mix(in_srgb,#64748b_10%,white)] text-[#475569]',
        variant === 'neutral' &&
          'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink-soft)]',
        variant === 'attention_message' &&
          'bg-[color-mix(in_srgb,#3b82f6_12%,white)] text-[#1d4ed8]',
        variant === 'attention_feedback' &&
          'bg-[color-mix(in_srgb,#8b5cf6_12%,white)] text-[#6d28d9]',
        variant === 'attention_join' &&
          'bg-[color-mix(in_srgb,#6366f1_12%,white)] text-[#4338ca]',
        variant === 'attention_planning' &&
          'bg-[color-mix(in_srgb,#0ea5e9_12%,white)] text-[#0369a1]',
        variant === 'attention_race' &&
          'bg-[color-mix(in_srgb,var(--tt-good)_12%,white)] text-[#047857]',
      )}
    >
      <span className={cn(!noTruncate && 'truncate')}>{label}</span>
    </span>
  )
}

export function CoachHomeMarkHandledButton({
  disabled,
  onMarkHandled,
  compact = false,
  state = 'idle',
}: {
  disabled?: boolean
  onMarkHandled: () => void | Promise<void>
  compact?: boolean
  state?: 'idle' | 'handled'
}) {
  if (state === 'handled') {
    return (
      <span
        data-handled-action="true"
        aria-live="polite"
        aria-label="Marked as handled"
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-[var(--tt-good)] text-white',
          compact ? 'h-7 w-7' : 'h-8 w-8',
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    void onMarkHandled()
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      aria-label="Mark as handled"
      title="Mark as handled"
      className={cn(
        'inline-flex items-center justify-center rounded-full text-[var(--tt-ink-soft)] transition hover:bg-[color-mix(in_srgb,var(--tt-good)_12%,white)] hover:text-[var(--tt-good)] disabled:opacity-50',
        compact ? 'h-7 w-7' : 'h-8 gap-1.5 px-3 text-[12px] font-semibold',
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {!compact ? 'All good' : null}
    </button>
  )
}
