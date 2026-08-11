'use client'

import { useState } from 'react'
import { formatSeasonEventLabel, type SeasonEventData } from '@/lib/season-planner'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { cn } from '@/lib/utils'

type SeasonEventChipsProps = {
  events: SeasonEventData[]
  className?: string
  /** Note-like week table: taller, wrapped text, colored. */
  variant?: 'chip' | 'note'
  /** Allow click-to-edit. */
  editable?: boolean
}

/** Match WorkoutBlock density fonts (xs chip / md note). */
const TITLE_CHIP = 'text-[11px] font-semibold leading-snug'
const BODY_CHIP = 'text-[9px] leading-snug'
const TITLE_NOTE = 'text-[13px] font-semibold leading-snug'
const BODY_NOTE = 'text-[11px] leading-snug'

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

export function SeasonEventChips({
  events,
  className,
  variant = 'chip',
  editable = false,
}: SeasonEventChipsProps) {
  const [editing, setEditing] = useState<SeasonEventData | null>(null)

  if (events.length === 0) return null

  const noteStyle = variant === 'note'
  const titleClass = noteStyle ? TITLE_NOTE : TITLE_CHIP
  const bodyClass = noteStyle ? BODY_NOTE : BODY_CHIP
  const cardClass = noteStyle ? CARD_NOTE : CARD_CHIP

  return (
    <>
      <ul className={cn('flex flex-col gap-1', className)}>
        {events.map((event) => {
          const body = (
            <>
              <p className={cn(titleClass, 'text-amber-950 dark:text-amber-100')}>
                {formatSeasonEventLabel(event)}
              </p>
              {event.notes?.trim() ? (
                <p
                  className={cn(
                    bodyClass,
                    'mt-0.5 text-amber-900/80 dark:text-amber-200/90',
                    noteStyle
                      ? 'whitespace-pre-wrap break-words'
                      : 'line-clamp-2',
                  )}
                >
                  {event.notes.trim()}
                </p>
              ) : null}
            </>
          )

          if (editable) {
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setEditing(event)}
                  className={cn(
                    cardClass,
                    'transition hover:bg-amber-200/70 dark:hover:bg-amber-500/30',
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
