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

export function SeasonEventChips({
  events,
  className,
  variant = 'chip',
  editable = false,
}: SeasonEventChipsProps) {
  const [editing, setEditing] = useState<SeasonEventData | null>(null)

  if (events.length === 0) return null

  const noteStyle = variant === 'note'

  return (
    <>
      <ul className={cn('flex flex-col gap-1', className)}>
        {events.map((event) => {
          const body = (
            <>
              <p
                className={cn(
                  'font-semibold text-amber-950 dark:text-amber-100',
                  noteStyle
                    ? 'text-[10px] leading-snug lg:text-xs'
                    : 'text-[9px] leading-tight lg:text-[10px]',
                )}
              >
                {formatSeasonEventLabel(event)}
              </p>
              {event.notes?.trim() ? (
                <p
                  className={cn(
                    'text-amber-900/80 dark:text-amber-200/90',
                    noteStyle
                      ? 'mt-0.5 whitespace-pre-wrap break-words text-[10px] leading-snug lg:text-xs'
                      : 'mt-0.5 line-clamp-2 text-[9px] leading-tight',
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
                    'w-full rounded-lg text-left transition hover:bg-amber-200/60 dark:hover:bg-amber-500/30',
                    noteStyle ? 'px-1 py-1 lg:px-1.5 lg:py-1.5' : 'px-1.5 py-0.5',
                    !noteStyle &&
                      'border border-amber-300/80 bg-amber-100/90 text-amber-950',
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
              className={cn(
                !noteStyle &&
                  'rounded-[4px] border border-amber-300/80 bg-amber-100/90 px-1.5 py-0.5 text-amber-950',
                noteStyle && 'px-0.5',
              )}
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
