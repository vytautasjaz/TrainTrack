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
  className?: string
}

export function CalendarPeriodNav({
  label,
  prevHref,
  nextHref,
  prevAriaLabel = 'Previous period',
  nextAriaLabel = 'Next period',
  align = 'center',
  className,
}: CalendarPeriodNavProps) {
  const compact = align === 'start'

  return (
    <div
      className={cn(
        'flex items-center',
        compact ? 'w-fit max-w-full gap-3' : 'w-full justify-center gap-1',
        className,
      )}
    >
      {prevHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0 rounded-full', compact ? 'h-7 w-7' : 'h-8 w-8')}
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
          'min-w-0 text-sm font-semibold landscape:max-lg:text-xs',
          compact ? 'whitespace-nowrap px-2' : 'flex-1 text-center',
        )}
      >
        {label}
      </h2>
      {nextHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0 rounded-full', compact ? 'h-7 w-7' : 'h-8 w-8')}
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
