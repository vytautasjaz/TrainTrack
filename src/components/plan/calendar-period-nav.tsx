'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CalendarPeriodNavProps = {
  label: string
  prevHref?: string
  nextHref?: string
  prevAriaLabel?: string
  nextAriaLabel?: string
  /** Centered full-width row (month) vs compact left-aligned group (week). */
  align?: 'center' | 'start'
  /** When false, render only prev/next arrows (week mobile). */
  showLabel?: boolean
  /**
   * `subtitle` — match PageHeaderDescription height under Training titles
   * (desktop Week/Month). Default keeps touch-friendly chrome.
   */
  size?: 'default' | 'subtitle'
  className?: string
}

export function CalendarPeriodNav({
  label,
  prevHref,
  nextHref,
  prevAriaLabel = 'Previous period',
  nextAriaLabel = 'Next period',
  align = 'center',
  showLabel = true,
  size = 'default',
  className,
}: CalendarPeriodNavProps) {
  const compact = align === 'start'
  const arrowsOnly = !showLabel
  const subtitle = size === 'subtitle'

  if (arrowsOnly) {
    return (
      <div
        className={cn('inline-flex shrink-0 items-center gap-0.5', className)}
        role="group"
        aria-label={label || 'Change period'}
      >
        {prevHref ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            asChild
          >
            <Link href={prevHref} aria-label={prevAriaLabel}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        {nextHref ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            asChild
          >
            <Link href={nextHref} aria-label={nextAriaLabel}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    )
  }

  const arrowBtn = cn(
    'shrink-0 rounded-full',
    subtitle
      ? 'h-5 w-5 text-[var(--tt-ink-soft,#6b6b6b)] hover:bg-transparent hover:text-foreground'
      : compact
        ? 'h-8 w-7'
        : 'h-8 w-8',
  )
  const arrowIcon = subtitle ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div
      className={cn(
        'flex items-center',
        compact || subtitle
          ? 'w-fit max-w-full gap-0'
          : 'w-full justify-center gap-1',
        className,
      )}
    >
      {prevHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={arrowBtn}
          asChild
        >
          <Link href={prevHref} aria-label={prevAriaLabel}>
            <ChevronLeft className={arrowIcon} />
          </Link>
        </Button>
      ) : (
        !compact && !subtitle && (
          <span className="h-8 w-8 shrink-0" aria-hidden />
        )
      )}
      <h2
        className={cn(
          'whitespace-nowrap',
          subtitle
            ? 'page-header-description shrink-0 px-0.5 font-normal'
            : compact
              ? 'shrink-0 px-0.5 text-[13px] font-semibold leading-none'
              : 'min-w-0 flex-1 text-center text-sm font-semibold landscape:max-lg:text-xs',
        )}
      >
        {label}
      </h2>
      {nextHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={arrowBtn}
          asChild
        >
          <Link href={nextHref} aria-label={nextAriaLabel}>
            <ChevronRight className={arrowIcon} />
          </Link>
        </Button>
      ) : (
        !compact && !subtitle && (
          <span className="h-8 w-8 shrink-0" aria-hidden />
        )
      )}
    </div>
  )
}
