'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChartColumn,
  SlidersHorizontal,
  StickyNote,
} from 'lucide-react'
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { FeedbackLayerToggle } from '@/components/training/feedback-layer-toggle'
import { WeekCardSizeSwitch } from '@/components/plan/week-card-size-switch'
import { useWeekCardSize } from '@/components/plan/week-card-size-context'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { TrainingLibraryToolbarToggle } from '@/components/training/training-library-toolbar-toggle'
import { cn } from '@/lib/utils'

type TrainingMonthFilterGroupsProps = {
  showNotes: boolean
  onToggleNotes: () => void
  showEvents: boolean
  onToggleEvents: () => void
  showStats: boolean
  onToggleStats: () => void
  monthSpan: 1 | 2 | 3
  spanHrefs: Record<1 | 2 | 3, string>
  /** Extra control after Cards (e.g. desktop expand lives next to view switch instead). */
  trailing?: ReactNode
  layout?: 'inline' | 'stack'
  className?: string
}

function MonthCardSizeToolbarControl() {
  const { cardSize, setCardSize } = useWeekCardSize()
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />
}

export function TrainingMonthFilterGroups({
  showNotes,
  onToggleNotes,
  showEvents,
  onToggleEvents,
  showStats,
  onToggleStats,
  monthSpan,
  spanHrefs,
  trailing,
  layout = 'inline',
  className,
}: TrainingMonthFilterGroupsProps) {
  const library = useTrainingLibrary()
  const stacked = layout === 'stack'

  return (
    <div
      className={cn(
        stacked
          ? 'flex min-w-0 flex-col items-stretch gap-3'
          : 'flex min-w-0 max-w-full items-end gap-2',
        className,
      )}
    >
      <ToolbarFilterGroup
        label="Filter"
        hint="Show or hide sports and workout statuses"
      >
        <PlanSportFilterBar className="shrink-0" />
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup
        label="Layers"
        hint="Toggle Notes, Events, Stats, and Feedback on cards"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <ToolbarTextToggle
            pressed={showNotes}
            onClick={onToggleNotes}
            title={showNotes ? 'Hide day notes' : 'Show day notes'}
          >
            <StickyNote className="h-3 w-3" aria-hidden />
            Notes
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showEvents}
            onClick={onToggleEvents}
            title={showEvents ? 'Hide season events' : 'Show season events'}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            Events
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showStats}
            onClick={onToggleStats}
            title={
              showStats ? 'Hide weekly sport stats' : 'Show weekly sport stats'
            }
          >
            <ChartColumn className="h-3 w-3" aria-hidden />
            Stats
          </ToolbarTextToggle>
          <FeedbackLayerToggle />
        </div>
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup label="View" hint="How workout cards are colored">
        <PlanViewModeControl className="shrink-0" />
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup
        label="Cards"
        hint="Workout card density on the month grid"
      >
        <div className="flex items-center gap-0.5">
          <MonthCardSizeToolbarControl />
          {trailing}
        </div>
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup label="Layout" hint="Months shown on the calendar">
        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label="Months shown"
        >
          {([1, 2, 3] as const).map((n) => (
            <Link
              key={n}
              href={spanHrefs[n]}
              title={`Show ${n} month${n > 1 ? 's' : ''}`}
              aria-current={monthSpan === n ? 'page' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs transition',
                monthSpan === n
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground/40 hover:text-muted-foreground/70',
              )}
            >
              {n}m
            </Link>
          ))}
        </div>
      </ToolbarFilterGroup>

      {library ? (
        <>
          {stacked ? (
            <div
              className="h-px w-full bg-[var(--tt-line,#ebebeb)]"
              aria-hidden
            />
          ) : (
            <ToolbarDivider className="mb-1.5 mx-0.5" />
          )}
          <ToolbarFilterGroup
            label="Library"
            hint="Open or close the workout library panel"
          >
            <TrainingLibraryToolbarToggle />
          </ToolbarFilterGroup>
        </>
      ) : null}
    </div>
  )
}

/** Month filters — desktop inline; mobile behind filter icon (List/Week pattern). */
export function TrainingMonthToolbar({
  showNotes,
  onToggleNotes,
  showEvents,
  onToggleEvents,
  showStats,
  onToggleStats,
  monthSpan,
  spanHrefs,
  trailing,
  className,
  mobileOnly,
  desktopOnly,
}: Omit<TrainingMonthFilterGroupsProps, 'layout'> & {
  mobileOnly?: boolean
  desktopOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filterProps = {
    showNotes,
    onToggleNotes,
    showEvents,
    onToggleEvents,
    showStats,
    onToggleStats,
    monthSpan,
    spanHrefs,
    trailing,
  }

  const desktop = (
    <div className={cn('min-w-0 max-w-full overflow-x-auto pb-0.5', className)}>
      <TrainingMonthFilterGroups {...filterProps} />
    </div>
  )

  const mobile = (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        className="tt-inbox-mobile-icon-btn"
        aria-label="Open month filters"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[32] cursor-default"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Month filters"
            className="absolute right-0 top-[calc(100%+0.35rem)] z-[33] max-h-[min(70vh,32rem)] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-3 shadow-[var(--tt-shadow)]"
          >
            <TrainingMonthFilterGroups layout="stack" {...filterProps} />
          </div>
        </>
      ) : null}
    </div>
  )

  if (mobileOnly) return mobile
  if (desktopOnly) return desktop

  return (
    <>
      {desktop}
      {mobile}
    </>
  )
}
