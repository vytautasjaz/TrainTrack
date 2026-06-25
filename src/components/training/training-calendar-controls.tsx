'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HistoryLogToolbar } from '@/components/history/history-log-toolbar'
import { cn } from '@/lib/utils'

type TrainingView = 'list' | 'week' | 'month'

type TrainingCalendarControlsProps = {
  view: TrainingView
  listHref: string
  weekHref: string
  monthHref: string
  prevHref: string
  nextHref: string
  canLogWorkout: boolean
  showPeriodNav?: boolean
}

const VIEW_OPTIONS: { id: TrainingView; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function TrainingCalendarControls({
  view,
  listHref,
  weekHref,
  monthHref,
  prevHref,
  nextHref,
  canLogWorkout,
  showPeriodNav = true,
}: TrainingCalendarControlsProps) {
  const viewHrefs: Record<TrainingView, string> = {
    list: listHref,
    week: weekHref,
    month: monthHref,
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <HistoryLogToolbar canLogWorkout={canLogWorkout} />

      <div
        className="inline-flex items-center rounded-xl bg-muted/50 p-0.5"
        role="tablist"
        aria-label="Calendar view"
      >
        {VIEW_OPTIONS.map(({ id, label }) => (
          <Link
            key={id}
            href={viewHrefs[id]}
            role="tab"
            aria-selected={view === id}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3',
              view === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {showPeriodNav && (
        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card p-0.5 shadow-sm">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2.5 font-medium" asChild>
            <Link href={prevHref} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </Link>
          </Button>
          <span className="hidden h-5 w-px bg-border/80 sm:block" aria-hidden />
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2.5 font-medium" asChild>
            <Link href={nextHref} aria-label="Next period">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
