'use client'

import Link from 'next/link'
import { Library, PanelRightOpen } from 'lucide-react'
import { HistoryLogToolbar } from '@/components/history/history-log-toolbar'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { PlanSportFilterControl } from '@/components/training/plan-sport-filter-control'
import { cn } from '@/lib/utils'

type TrainingView = 'week' | 'month' | 'list'

type TrainingCalendarControlsProps = {
  view: TrainingView
  weekHref: string
  monthHref: string
  listHref: string
  canLogWorkout: boolean
  /** Show desktop library panel toggle (coach plan). */
  showLibraryToggle?: boolean
}

const VIEW_OPTIONS: { id: TrainingView; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function TrainingCalendarControls({
  view,
  weekHref,
  monthHref,
  listHref,
  canLogWorkout,
  showLibraryToggle = false,
}: TrainingCalendarControlsProps) {
  const library = useTrainingLibrary()
  const viewHrefs: Record<TrainingView, string> = {
    week: weekHref,
    month: monthHref,
    list: listHref,
  }

  return (
    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
      <HistoryLogToolbar canLogWorkout={canLogWorkout} compactOnMobile />

      {/* Wrapper needed: .segmented-control sets display and overrides Tailwind `hidden`. */}
      <div className="hidden lg:block">
        <SegmentedControl aria-label="Calendar view">
          {VIEW_OPTIONS.map(({ id, label }) => (
            <SegmentedControlItem key={id} asChild active={view === id}>
              <Link href={viewHrefs[id]}>{label}</Link>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <div
        className="inline-flex shrink-0 items-center gap-0.5 lg:hidden"
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
              'pill-select-item px-2 py-1',
              view === id ? 'pill-select-item-active' : 'pill-select-item-inactive',
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <PlanSportFilterControl compactOnMobile />

      {showLibraryToggle && library ? (
        <button
          type="button"
          onClick={library.toggle}
          className={cn(
            'hidden items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-medium transition lg:inline-flex',
            library.open
              ? 'border-foreground/30 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={library.open}
          aria-label={library.open ? 'Hide workout library' : 'Show workout library'}
        >
          {library.open ? (
            <Library className="h-3.5 w-3.5" />
          ) : (
            <PanelRightOpen className="h-3.5 w-3.5" />
          )}
          Library
        </button>
      ) : null}
    </div>
  )
}
