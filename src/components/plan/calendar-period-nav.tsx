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
  className,
}: CalendarPeriodNavProps) {
  const compact = align === 'start'
  const arrowsOnly = !showLabel

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

  return (
    <div
      className={cn(
        'flex items-center',
        compact ? 'w-fit max-w-full gap-0' : 'w-full justify-center gap-1',
        className,
      )}
    >
      {prevHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 rounded-full',
            compact ? 'h-8 w-7' : 'h-8 w-8',
          )}
          asChild
        >
          <Link href={prevHref} aria-label={prevAriaLabel}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        !compact && <span className="h-8 w-8 shrink-0" aria-hidden />
      )}
      <h2
        className={cn(
          'font-semibold',
          compact
            ? 'shrink-0 whitespace-nowrap px-0.5 text-[13px] leading-none'
            : 'min-w-0 flex-1 whitespace-nowrap text-center text-sm landscape:max-lg:text-xs',
        )}
      >
        {label}
      </h2>
      {nextHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 rounded-full',
            compact ? 'h-8 w-7' : 'h-8 w-8',
          )}
          asChild
        >
          <Link href={nextHref} aria-label={nextAriaLabel}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        !compact && <span className="h-8 w-8 shrink-0" aria-hidden />
      )}
    </div>
  )
}
