'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Library,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  Plus,
  Settings2,
  StickyNote,
} from 'lucide-react'
import { CalendarPeriodNav } from '@/components/plan/calendar-period-nav'
import {
  PlanSportFilterBar,
  ToolbarDivider,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { usePlanSportFilter } from '@/components/training/plan-sport-filter-context'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { TRAINING_MONTH_LABEL, TRAINING_WEEK_LABEL } from './training-mock-data'

export type MonthLayerKey = 'notes' | 'events' | 'stats'

export function TrainingViewSwitch({
  active,
  listHref,
  weekHref,
  monthHref = '/design-mockups/training-month',
}: {
  active: 'list' | 'week' | 'month'
  listHref: string
  weekHref: string
  monthHref?: string
}) {
  const items = [
    { id: 'list' as const, label: 'List', href: listHref },
    { id: 'week' as const, label: 'Week', href: weekHref },
    { id: 'month' as const, label: 'Month', href: monthHref },
  ]

  return (
    <SegmentedControl aria-label="Calendar view">
      {items.map((item) => (
        <SegmentedControlItem key={item.id} asChild active={active === item.id}>
          <Link href={item.href}>{item.label}</Link>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

export function TrainingWeekNav({ compact = false }: { compact?: boolean }) {
  if (!compact) {
    return (
      <CalendarPeriodNav
        label={TRAINING_WEEK_LABEL}
        prevHref="#"
        nextHref="#"
        prevAriaLabel="Previous week"
        nextAriaLabel="Next week"
        align="start"
        className="mb-0 shrink-0"
      />
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink)]"
      >
        Today
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}

export function TrainingLibraryToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-medium transition ${
        open
          ? 'border-foreground/30 text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-pressed={open}
      aria-label={open ? 'Hide workout library' : 'Show workout library'}
    >
      {open ? <Library className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
      Library
    </button>
  )
}

export function TrainingAddButton() {
  return (
    <button
      type="button"
      className="tt-mock-btn tt-mock-btn-primary inline-flex items-center gap-1.5 !normal-case !tracking-normal"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      Add
    </button>
  )
}

export type WeekCardSize = 's' | 'm' | 'l'

const CARD_SIZE_HINT: Record<WeekCardSize, string> = {
  s: 'Compact cards — title + status',
  m: 'Medium cards — prescription line',
  l: 'Large cards — structure sketch',
}

/** Quiet S/M/L — same text toggles as Notes / Color, not segmented pills. */
export function TrainingWeekCardSizeSwitch({
  value,
  onChange,
}: {
  value: WeekCardSize
  onChange: (size: WeekCardSize) => void
}) {
  const items: { id: WeekCardSize; label: string }[] = [
    { id: 's', label: 'S' },
    { id: 'm', label: 'M' },
    { id: 'l', label: 'L' },
  ]

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Card size">
      {items.map((item) => (
        <ToolbarTextToggle
          key={item.id}
          pressed={value === item.id}
          onClick={() => onChange(item.id)}
          title={CARD_SIZE_HINT[item.id]}
        >
          {item.label}
        </ToolbarTextToggle>
      ))}
    </div>
  )
}

const VIEW_MODE_OPTIONS: {
  id: PlanColorMode
  label: string
  hint: string
}[] = [
  { id: 'sport', label: 'Color', hint: 'Tint cards by sport' },
  { id: 'white', label: 'Plain', hint: 'White cards with sport accent' },
  { id: 'completion', label: 'Completion', hint: 'Green done, muted skipped' },
]

/** Color / Plain / Completion as quiet text — matches Sports / Notes. */
function QuietPlanViewModeControl() {
  const { colorMode, setColorMode } = usePlanSportFilter()

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="View mode">
      {VIEW_MODE_OPTIONS.map((opt) => (
        <ToolbarTextToggle
          key={opt.id}
          pressed={colorMode === opt.id}
          onClick={() => setColorMode(opt.id)}
          title={opt.hint}
        >
          {opt.label}
        </ToolbarTextToggle>
      ))}
    </div>
  )
}

export type WeekLayerKey = 'weather' | 'notesEvents'

/** Quiet Notes · Events / Weather toggles — match production week toolbar. */
export function TrainingWeekLayerToggles({
  layers,
  onChange,
}: {
  layers: Record<WeekLayerKey, boolean>
  onChange: (key: WeekLayerKey, next: boolean) => void
}) {
  const notesEventsOn = layers.notesEvents
  const weatherOn = layers.weather

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Week layers">
      <ToolbarTextToggle
        pressed={notesEventsOn}
        onClick={() => onChange('notesEvents', !notesEventsOn)}
        title={
          notesEventsOn
            ? 'Hide notes and events row'
            : 'Show notes and events row'
        }
      >
        <StickyNote className="h-3 w-3" aria-hidden />
        Notes · Events
      </ToolbarTextToggle>
      <ToolbarTextToggle
        pressed={weatherOn}
        onClick={() => onChange('weather', !weatherOn)}
        title={weatherOn ? 'Hide weather row' : 'Show weather row'}
      >
        <CloudSun className="h-3 w-3" aria-hidden />
        Weather
      </ToolbarTextToggle>
    </div>
  )
}

/** Coach row controls — same quiet text weight as Sports / Status. */
function MockCoachSportRowControls() {
  const quietAction =
    'inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground'

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-0.5">
      <button
        type="button"
        className={quietAction}
        title="Choose which sports always show for this athlete"
      >
        <Settings2 className="h-3 w-3 opacity-70" aria-hidden />
        Defaults
      </button>
      <button
        type="button"
        className={quietAction}
        title="Add a sport row for this week only"
      >
        <Plus className="h-3 w-3 opacity-70" aria-hidden />
        Add row
      </button>
    </div>
  )
}

/** Labeled filter cluster — type name + controls. */
function ToolbarFilterGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-0.5"
      title={hint}
      role="group"
      aria-label={label}
    >
      <span className="px-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/55">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

/**
 * Week table toolbar — filters split by type with labels + tooltips.
 */
export function TrainingWeekTableToolbar({
  layers,
  onLayerChange,
  cardSize,
  onCardSizeChange,
}: {
  layers: Record<WeekLayerKey, boolean>
  onLayerChange: (key: WeekLayerKey, next: boolean) => void
  cardSize: WeekCardSize
  onCardSizeChange: (size: WeekCardSize) => void
}) {
  return (
    <div className="mb-2 flex min-w-0 items-end gap-1 overflow-x-auto pb-0.5">
      <div className="mb-0.5 shrink-0">
        <TrainingWeekNav />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-end gap-2">
        <ToolbarFilterGroup
          label="Filter"
          hint="Show or hide sports and workout statuses in the week grid"
        >
          <PlanSportFilterBar className="shrink-0" />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Layers"
          hint="Toggle Notes · Events and Weather rows"
        >
          <TrainingWeekLayerToggles layers={layers} onChange={onLayerChange} />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="View"
          hint="How workout cards are colored in the week grid"
        >
          <QuietPlanViewModeControl />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Rows"
          hint="Manage which sport rows appear in the plan"
        >
          <MockCoachSportRowControls />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Cards"
          hint="Week card density — compact, medium, or large with structure"
        >
          <TrainingWeekCardSizeSwitch value={cardSize} onChange={onCardSizeChange} />
        </ToolbarFilterGroup>
      </div>
    </div>
  )
}

/** Month layers — Notes / Events / Stats (production month has no Weather). */
function TrainingMonthLayerToggles({
  layers,
  onChange,
}: {
  layers: Record<MonthLayerKey, boolean>
  onChange: (key: MonthLayerKey, next: boolean) => void
}) {
  const items: {
    id: MonthLayerKey
    label: string
    titleOn: string
    titleOff: string
    icon: typeof StickyNote
  }[] = [
    {
      id: 'notes',
      label: 'Notes',
      titleOn: 'Hide day notes',
      titleOff: 'Show day notes',
      icon: StickyNote,
    },
    {
      id: 'events',
      label: 'Events',
      titleOn: 'Hide season events',
      titleOff: 'Show season events',
      icon: CalendarDays,
    },
    {
      id: 'stats',
      label: 'Stats',
      titleOn: 'Hide weekly sport stats',
      titleOff: 'Show weekly sport stats',
      icon: ChartColumn,
    },
  ]

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Month layers">
      {items.map((item) => {
        const on = layers[item.id]
        const Icon = item.icon
        return (
          <ToolbarTextToggle
            key={item.id}
            pressed={on}
            onClick={() => onChange(item.id, !on)}
            title={on ? item.titleOn : item.titleOff}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {item.label}
          </ToolbarTextToggle>
        )
      })}
    </div>
  )
}

/**
 * Month toolbar — close to production: Filter · Layers · View · Layout (1m/2m/3m + expand).
 */
export function TrainingMonthTableToolbar({
  layers,
  onLayerChange,
  monthSpan,
  onMonthSpanChange,
  expanded,
  onExpandedChange,
}: {
  layers: Record<MonthLayerKey, boolean>
  onLayerChange: (key: MonthLayerKey, next: boolean) => void
  monthSpan: 1 | 2 | 3
  onMonthSpanChange: (span: 1 | 2 | 3) => void
  expanded: boolean
  onExpandedChange: (next: boolean) => void
}) {
  return (
    <div className="mb-2 flex min-w-0 items-end gap-1 overflow-x-auto pb-0.5">
      <div className="mb-0.5 shrink-0">
        <CalendarPeriodNav
          label={
            monthSpan === 1
              ? TRAINING_MONTH_LABEL
              : monthSpan === 2
                ? 'Aug – Sep 2026'
                : 'Aug – Oct 2026'
          }
          prevHref="#"
          nextHref="#"
          prevAriaLabel="Previous month"
          nextAriaLabel="Next month"
          align="start"
          className="mb-0 shrink-0"
        />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-end gap-2">
        <ToolbarFilterGroup
          label="Filter"
          hint="Show or hide sports and workout statuses"
        >
          <PlanSportFilterBar className="shrink-0" />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Layers"
          hint="Toggle Notes, Events, and weekly Stats column"
        >
          <TrainingMonthLayerToggles layers={layers} onChange={onLayerChange} />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup label="View" hint="How workout cards are colored">
          <QuietPlanViewModeControl />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Layout"
          hint="Months shown and expanded calendar"
        >
          <div className="flex items-center gap-0.5">
            {([1, 2, 3] as const).map((n) => (
              <ToolbarTextToggle
                key={n}
                pressed={monthSpan === n}
                onClick={() => onMonthSpanChange(n)}
                title={`Show ${n} month${n > 1 ? 's' : ''}`}
              >
                {n}m
              </ToolbarTextToggle>
            ))}
            <ToolbarTextToggle
              pressed={expanded}
              onClick={() => onExpandedChange(!expanded)}
              title={expanded ? 'Exit expanded view' : 'Expand calendar'}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </ToolbarTextToggle>
          </div>
        </ToolbarFilterGroup>
      </div>
    </div>
  )
}
