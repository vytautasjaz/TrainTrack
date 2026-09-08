'use client'

import { useState } from 'react'
import {
  CalendarDays,
  CloudSun,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
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
import { useWeekPortraitZoom } from '@/components/plan/week-portrait-zoom-context'
import { WEEK_PORTRAIT_ZOOM_LABEL } from '@/lib/week-portrait-zoom'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { TrainingLibraryToolbarToggle } from '@/components/training/training-library-toolbar-toggle'
import { cn } from '@/lib/utils'

type TrainingWeekFilterGroupsProps = {
  showNotes: boolean
  onToggleNotes: () => void
  showEvents: boolean
  onToggleEvents: () => void
  showWeather: boolean
  onToggleWeather: () => void
  expanded: boolean
  onToggleExpanded: () => void
  layout?: 'inline' | 'stack'
  className?: string
}

function WeekCardSizeToolbarControl() {
  const { cardSize, setCardSize } = useWeekCardSize()
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />
}

function WeekPortraitZoomToolbarControl() {
  const { zoom, zoomIn, zoomOut, canZoomIn, canZoomOut } = useWeekPortraitZoom()
  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={`Week zoom: ${WEEK_PORTRAIT_ZOOM_LABEL[zoom]}`}
    >
      <ToolbarTextToggle
        pressed
        disabled={!canZoomOut}
        onClick={zoomOut}
        title="Show more of the week (smaller columns)"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Zoom out</span>
      </ToolbarTextToggle>
      <span className="min-w-[4.25rem] px-0.5 text-center text-[10px] font-medium tabular-nums text-foreground/80">
        {WEEK_PORTRAIT_ZOOM_LABEL[zoom]}
      </span>
      <ToolbarTextToggle
        pressed
        disabled={!canZoomIn}
        onClick={zoomIn}
        title="Larger day columns"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Zoom in</span>
      </ToolbarTextToggle>
    </div>
  )
}

export function TrainingWeekFilterGroups({
  showNotes,
  onToggleNotes,
  showEvents,
  onToggleEvents,
  showWeather,
  onToggleWeather,
  expanded,
  onToggleExpanded,
  layout = 'inline',
  className,
}: TrainingWeekFilterGroupsProps) {
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
        hint="Show or hide sports and workout statuses in the week grid"
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
        hint="Toggle Notes, Events, Weather, and Feedback on cards"
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
            pressed={showWeather}
            onClick={onToggleWeather}
            title={showWeather ? 'Hide weather row' : 'Show weather row'}
          >
            <CloudSun className="h-3 w-3" aria-hidden />
            Weather
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
        hint="How workout cards are colored in the week grid"
      >
        <PlanViewModeControl className="shrink-0" />
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5" />
      )}

      <ToolbarFilterGroup
        label="Zoom"
        hint="Day column size on phone portrait — comfort, medium, or fit the week"
        className={stacked ? undefined : 'hidden portrait:max-lg:flex'}
      >
        <WeekPortraitZoomToolbarControl />
      </ToolbarFilterGroup>

      {stacked ? (
        <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
      ) : (
        <ToolbarDivider className="mb-1.5 mx-0.5 hidden portrait:max-lg:block" />
      )}

      <ToolbarFilterGroup
        label="Cards"
        hint="Week card density and expanded calendar"
      >
        <div className="flex items-center gap-0.5">
          <WeekCardSizeToolbarControl />
          <ToolbarTextToggle
            pressed={expanded}
            onClick={onToggleExpanded}
            title={expanded ? 'Exit expanded view' : 'Expand week plan'}
            className="font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100"
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            )}
          </ToolbarTextToggle>
        </div>
      </ToolbarFilterGroup>

      {library ? (
        <>
          {stacked ? (
            <div className="h-px w-full bg-[var(--tt-line,#ebebeb)]" aria-hidden />
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

/** Week filters — desktop inline; mobile behind filter icon (same as List). */
export function TrainingWeekToolbar({
  showNotes,
  onToggleNotes,
  showEvents,
  onToggleEvents,
  showWeather,
  onToggleWeather,
  expanded,
  onToggleExpanded,
  className,
  mobileOnly,
  desktopOnly,
}: Omit<TrainingWeekFilterGroupsProps, 'layout'> & {
  mobileOnly?: boolean
  desktopOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filterProps = {
    showNotes,
    onToggleNotes,
    showEvents,
    onToggleEvents,
    showWeather,
    onToggleWeather,
    expanded,
    onToggleExpanded,
  }

  const desktop = (
    <div className={cn('min-w-0 max-w-full overflow-x-auto pb-0.5', className)}>
      <TrainingWeekFilterGroups {...filterProps} />
    </div>
  )

  const mobile = (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        className="tt-inbox-mobile-icon-btn"
        aria-label="Open week filters"
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
            aria-label="Week filters"
            className="absolute right-0 top-[calc(100%+0.35rem)] z-30 max-h-[min(70vh,32rem)] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-3 shadow-[var(--tt-shadow)]"
          >
            <TrainingWeekFilterGroups layout="stack" {...filterProps} />
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
