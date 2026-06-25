'use client'

import Link from 'next/link'
import { HistoryLogToolbar } from '@/components/history/history-log-toolbar'
import { cn } from '@/lib/utils'

type TrainingView = 'list' | 'week' | 'month'

type TrainingCalendarControlsProps = {
  view: TrainingView
  listHref: string
  weekHref: string
  monthHref: string
  canLogWorkout: boolean
  /** Hide list/week tabs on mobile where orientation switches layout automatically. */
  hideWeekListOnMobile?: boolean
}

const DESKTOP_VIEW_OPTIONS: { id: TrainingView; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function TrainingCalendarControls({
  view,
  listHref,
  weekHref,
  monthHref,
  canLogWorkout,
  hideWeekListOnMobile = true,
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
        className={cn(
          'inline-flex items-center rounded-full bg-muted/60 p-1',
          hideWeekListOnMobile && 'hidden lg:inline-flex',
        )}
        role="tablist"
        aria-label="Calendar view"
      >
        {DESKTOP_VIEW_OPTIONS.map(({ id, label }) => (
          <Link
            key={id}
            href={viewHrefs[id]}
            role="tab"
            aria-selected={view === id}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4',
              view === id
                ? 'bg-card text-brand shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {hideWeekListOnMobile && (
        <Link
          href={monthHref}
          className={cn(
            'inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition lg:hidden',
            view === 'month'
              ? 'bg-muted/60 text-brand'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          )}
        >
          Month
        </Link>
      )}
    </div>
  )
}
