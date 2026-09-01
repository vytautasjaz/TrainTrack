'use client'

import { CalendarDays, StickyNote } from 'lucide-react'
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

/** List-view Filter / Layers / View — sits in the page header (right, bottom-aligned). */
export function TrainingListToolbar() {
  const [showNotes, setShowNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true)
  const [showEvents, setShowEvents] = useStoredFlag(
    SHOW_EVENTS_STORAGE_KEY,
    true,
  )

  return (
    <div className="flex min-w-0 max-w-full items-end gap-2 overflow-x-auto pb-0.5">
      <ToolbarFilterGroup
        label="Filter"
        hint="Show or hide sports and workout statuses"
      >
        <PlanSportFilterBar className="shrink-0" />
      </ToolbarFilterGroup>

      <ToolbarDivider className="mb-1.5 mx-0.5" />

      <ToolbarFilterGroup
        label="Layers"
        hint="Toggle Notes, Events, and Feedback"
      >
        <div className="flex shrink-0 items-center gap-0.5">
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

      <ToolbarDivider className="mb-1.5 mx-0.5" />

      <ToolbarFilterGroup
        label="View"
        hint="How workout rows are colored in the list"
      >
        <PlanViewModeControl className="shrink-0" />
      </ToolbarFilterGroup>
    </div>
  )
}
