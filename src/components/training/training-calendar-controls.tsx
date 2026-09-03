'use client'

import Link from 'next/link'
import {
  CalendarDays,
  Columns3,
  Library,
  List,
  PanelRightOpen,
  type LucideIcon,
} from 'lucide-react'
import { HistoryLogToolbar } from '@/components/history/history-log-toolbar'
import { TrainingListAddMenu } from '@/components/training/training-list-add-menu'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { PlanSportFilterControl } from '@/components/training/plan-sport-filter-control'
import { FeedbackLayerToggle } from '@/components/training/feedback-layer-toggle'
import { cn } from '@/lib/utils'

type TrainingView = 'week' | 'list' | 'calendar'

type TrainingCalendarControlsProps = {
  view: TrainingView
  weekHref: string
  listHref: string
  calendarHref: string
  canLogWorkout: boolean
  /** List-view Add menu (New workout / Log / Note / Event). */
  isCoach?: boolean
  athleteId?: string
  canAddNote?: boolean
  /** When false, list view hides Add (parent places it next to filters). */
  showAddMenu?: boolean
  /** Show desktop library panel toggle (coach plan). */
  showLibraryToggle?: boolean
  /** Compact Filters dropdown (List view). Week/Month use the inline bar. */
  showSportFilter?: boolean
}

const VIEW_OPTIONS: { id: TrainingView; label: string; Icon: LucideIcon }[] = [
  { id: 'list', label: 'List', Icon: List },
  { id: 'week', label: 'Week', Icon: Columns3 },
  { id: 'calendar', label: 'Month', Icon: CalendarDays },
]

export function TrainingCalendarControls({
  view,
  weekHref,
  listHref,
  calendarHref,
  canLogWorkout,
  isCoach = false,
  athleteId,
  canAddNote = false,
  showAddMenu = true,
  showLibraryToggle = false,
  showSportFilter = true,
}: TrainingCalendarControlsProps) {
  const library = useTrainingLibrary()
  const viewHrefs: Record<TrainingView, string> = {
    week: weekHref,
    list: listHref,
    calendar: calendarHref,
  }

  return (
    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
      {view === 'list' ? (
        showAddMenu ? (
          <TrainingListAddMenu
            isCoach={isCoach}
            athleteId={athleteId}
            canAddNote={canAddNote}
            canLogWorkout={canLogWorkout}
          />
        ) : null
      ) : (
        <HistoryLogToolbar canLogWorkout={canLogWorkout} compactOnMobile />
      )}

      {/* Wrapper needed: .segmented-control sets display and overrides Tailwind `hidden`. */}
      <div className="hidden lg:block">
        <SegmentedControl aria-label="Calendar view">
          {VIEW_OPTIONS.map(({ id, label, Icon }) => (
            <SegmentedControlItem key={id} asChild active={view === id}>
              <Link href={viewHrefs[id]} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {label}
              </Link>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <div
        className="inline-flex shrink-0 items-center gap-0.5 lg:hidden"
        role="tablist"
        aria-label="Calendar view"
      >
        {VIEW_OPTIONS.map(({ id, label, Icon }) => (
          <Link
            key={id}
            href={viewHrefs[id]}
            role="tab"
            aria-selected={view === id}
            aria-label={label}
            className={cn(
              'pill-select-item inline-flex items-center gap-1 px-2 py-1',
              view === id ? 'pill-select-item-active' : 'pill-select-item-inactive',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {showSportFilter ? (
        <>
          <PlanSportFilterControl compactOnMobile />
          <FeedbackLayerToggle />
        </>
      ) : null}

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
