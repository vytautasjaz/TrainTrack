'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { formatSeasonEventLabel, type SeasonEventData } from '@/lib/season-planner'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import {
  WeekAddPlusMark,
  weekAddPlusButtonClass,
} from '@/components/plan/week-add-plus'
import { cn } from '@/lib/utils'

type SeasonEventChipsProps = {
  events: SeasonEventData[]
  className?: string
  /**
   * `chip` — compact bordered card (month).
   * `note` — taller bordered card.
   * `strip` — list agenda flat text.
   * `cell` — week table: fill parent cell (amber lives on the `<td>`).
   */
  variant?: 'chip' | 'note' | 'strip' | 'cell'
  /** Allow click-to-edit / empty-cell add. */
  editable?: boolean
  /** YYYY-MM-DD — when set with editable, empty cells show mock-style + */
  dateKey?: string
}

/** Match WorkoutBlock density fonts (xs chip / md note). */
const TITLE_CHIP = 'text-[11px] font-semibold leading-snug'
const BODY_CHIP = 'text-[9px] leading-snug'
const TITLE_NOTE = 'text-[13px] font-semibold leading-snug'
const BODY_NOTE = 'text-[11px] leading-snug'
const TITLE_STRIP = 'text-sm font-semibold leading-snug'
const BODY_STRIP = 'text-xs font-normal leading-snug tracking-[0.004em]'
/** Week cell: one size/weight family so notes + events read as one block. */
const TITLE_CELL = 'text-xs font-medium leading-snug'
const BODY_CELL = 'text-xs font-normal leading-snug'

const CARD_CHIP = cn(
  'w-full rounded-[var(--radius-workout)] border border-amber-300/80 bg-amber-100/90',
  'px-2 py-1.5 text-left text-amber-950',
  'shadow-[0_1px_1px_rgb(0_0_0_/0.05),0_1px_2px_rgb(0_0_0_/0.04)]',
  'dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
)

const CARD_NOTE = cn(
  'w-full rounded-[var(--radius-workout)] border border-amber-300/70 bg-amber-100/95',
  'px-2 py-1.5 text-left text-amber-950',
  'shadow-[0_1px_1px_rgb(0_0_0_/0.05),0_1px_2px_rgb(0_0_0_/0.04)]',
  'dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
  'lg:px-2.5 lg:py-2',
)

/** List agenda: sit in the shared amber strip — no nested card. */
const CARD_STRIP = cn(
  'w-full text-left text-amber-950 dark:text-amber-100',
)

/** Week table: fill cell — no nested card (amber on `<td>`). */
const CARD_CELL = cn(
  'w-full text-left text-amber-950 dark:text-amber-100',
)

export function SeasonEventChips({
  events,
  className,
  variant = 'chip',
  editable = false,
  dateKey,
}: SeasonEventChipsProps) {
  const [editing, setEditing] = useState<SeasonEventData | null>(null)
  const [creating, setCreating] = useState(false)

  const noteStyle = variant === 'note'
  const stripStyle = variant === 'strip'
  const cellStyle = variant === 'cell'
  const flatStyle = stripStyle || cellStyle
  const titleClass = cellStyle
    ? TITLE_CELL
    : stripStyle
      ? TITLE_STRIP
      : noteStyle
        ? TITLE_NOTE
        : TITLE_CHIP
  const bodyClass = cellStyle
    ? BODY_CELL
    : stripStyle
      ? BODY_STRIP
      : noteStyle
        ? BODY_NOTE
        : BODY_CHIP
  const cardClass = cellStyle
    ? CARD_CELL
    : stripStyle
      ? CARD_STRIP
      : noteStyle
        ? CARD_NOTE
        : CARD_CHIP
  const wrapText = noteStyle || flatStyle

  if (events.length === 0) {
    if (!editable || !dateKey) return null
    return (
      <>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(weekAddPlusButtonClass.cell, 'absolute inset-0 min-h-0')}
          aria-label={`Add event on ${dateKey}`}
        >
          <WeekAddPlusMark size="cell" />
        </button>
        <SeasonEventModal
          open={creating}
          onOpenChange={setCreating}
          defaultStartDate={dateKey}
          defaultEndDate={dateKey}
        />
      </>
    )
  }

  return (
    <>
      <ul
        className={cn(
          'flex flex-col gap-1',
          cellStyle && 'gap-1.5',
          className,
        )}
      >
        {events.map((event) => {
          const text = (
            <>
              <p
                className={cn(
                  titleClass,
                  !flatStyle && 'text-amber-950 dark:text-amber-100',
                )}
              >
                {formatSeasonEventLabel(event)}
              </p>
              {event.notes?.trim() ? (
                <p
                  className={cn(
                    bodyClass,
                    'mt-0.5',
                    cellStyle
                      ? 'text-amber-950/80 dark:text-amber-100/80'
                      : 'text-amber-900/80 dark:text-amber-200/90',
                    wrapText
                      ? 'whitespace-pre-wrap break-words'
                      : 'line-clamp-2',
                  )}
                >
                  {event.notes.trim()}
                </p>
              ) : null}
            </>
          )

          const body = (
            <div
              className={cn(
                'flex w-full items-start gap-1.5',
                stripStyle && 'items-center gap-3',
                cellStyle && 'gap-2',
              )}
            >
              <Calendar
                className={cn(
                  'shrink-0',
                  cellStyle
                    ? 'mt-0.5 h-3.5 w-3.5 text-amber-950/70 dark:text-amber-100/70'
                    : stripStyle
                      ? 'h-5 w-5 text-amber-800/75 dark:text-amber-200/80'
                      : noteStyle
                        ? 'mt-0.5 h-3.5 w-3.5 text-amber-900/70 dark:text-amber-200/75'
                        : 'mt-0.5 h-3 w-3 text-amber-900/70 dark:text-amber-200/75',
                )}
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0 flex-1">{text}</div>
            </div>
          )

          if (editable) {
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setEditing(event)}
                  className={cn(
                    cardClass,
                    'cursor-pointer',
                    flatStyle
                      ? 'transition hover:opacity-80'
                      : 'transition hover:bg-amber-200/70 dark:hover:bg-amber-500/30',
                  )}
                >
                  {body}
                </button>
              </li>
            )
          }

          return (
            <li
              key={event.id}
              className={cardClass}
              title={event.notes?.trim() || undefined}
            >
              {body}
            </li>
          )
        })}
      </ul>
      {editable ? (
        <SeasonEventModal
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          event={editing}
        />
      ) : null}
    </>
  )
}
