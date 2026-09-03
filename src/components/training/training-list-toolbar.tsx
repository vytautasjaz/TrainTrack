'use client'

import { useState } from 'react'
import { CalendarDays, SlidersHorizontal, StickyNote } from 'lucide-react'
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { FeedbackLayerToggle } from '@/components/training/feedback-layer-toggle'
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
} from '@/lib/plan-calendar-layers'
import { useStoredFlag } from '@/hooks/use-stored-flag'
import { cn } from '@/lib/utils'

function TrainingListFilterGroups({
  layout = 'inline',
  className,
}: {
  layout?: 'inline' | 'stack'
  className?: string
}) {
  const [showNotes, setShowNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true)
  const [showEvents, setShowEvents] = useStoredFlag(SHOW_EVENTS_STORAGE_KEY, true)
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
        hint="Toggle Notes, Events, and Feedback"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <ToolbarTextToggle
            pressed={showNotes}
            onClick={() => setShowNotes((prev) => !prev)}
            title={showNotes ? 'Hide day notes' : 'Show day notes'}
          >
            <StickyNote className="h-3 w-3" aria-hidden />
            Notes
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showEvents}
            onClick={() => setShowEvents((prev) => !prev)}
            title={showEvents ? 'Hide season events' : 'Show season events'}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            Events
          </ToolbarTextToggle>
          <FeedbackLayerToggle />
        </div>
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup
        label="View"
        hint="How workout rows are colored in the list"
      >
        <PlanViewModeControl className="shrink-0" />
      </ToolbarFilterGroup>
    </div>
  )
}

/** List-view Filter / Layers / View — desktop inline; mobile behind filter icon. */
export function TrainingListToolbar({
  className,
  mobileOnly,
  desktopOnly,
}: {
  className?: string
  /** Render only the mobile filter icon + popover. */
  mobileOnly?: boolean
  /** Render only the desktop inline toolbar. */
  desktopOnly?: boolean
}) {
  const [open, setOpen] = useState(false)

  const desktop = (
    <div className={cn('min-w-0 max-w-full overflow-x-auto pb-0.5', className)}>
      <TrainingListFilterGroups />
    </div>
  )

  const mobile = (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        className="tt-inbox-mobile-icon-btn"
        aria-label="Open list filters"
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
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="List filters"
            className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-[min(18.5rem,calc(100vw-1.5rem))] rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-3 shadow-[var(--tt-shadow)]"
          >
            <TrainingListFilterGroups layout="stack" />
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
