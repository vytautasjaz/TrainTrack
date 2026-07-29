'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { getDayNoteDisplayText, isDayNoteUnavailable, type DayNoteData } from '@/lib/day-notes'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { cn } from '@/lib/utils'

type DayNoteSectionProps = {
  dateKey: string
  note?: DayNoteData | null
  canEdit: boolean
  athleteId?: string
  compact?: boolean
  /** Show full note text with wrapping (week table). */
  showFullText?: boolean
  hideEmptyAdd?: boolean
}

function noteTextClass(unavailable: boolean, showFullText: boolean, compact: boolean) {
  return cn(
    'min-w-0 text-xs leading-snug',
    showFullText ? 'whitespace-pre-wrap break-words' : 'truncate',
    !showFullText && compact && 'landscape:max-lg:text-[8px] landscape:max-lg:leading-tight',
    unavailable
      ? 'text-red-600 dark:text-red-400'
      : 'text-foreground',
    unavailable && 'italic',
  )
}

export function DayNoteSection({
  dateKey,
  note,
  canEdit,
  athleteId,
  compact = false,
  showFullText = false,
  hideEmptyAdd = false,
}: DayNoteSectionProps) {
  const [open, setOpen] = useState(false)

  if (!canEdit && !note) return null
  if (hideEmptyAdd && !note) return null

  const modal = canEdit ? (
    <DayNoteModal
      dateKey={dateKey}
      note={note}
      athleteId={athleteId}
      open={open}
      onOpenChange={setOpen}
    />
  ) : null

  if (note) {
    const displayText = getDayNoteDisplayText(note)
    const unavailable = isDayNoteUnavailable(note.status)

    if (compact) {
      const className = cn(
        'group w-full rounded-lg px-0.5 py-0.5 text-left landscape:max-lg:px-0 lg:px-1',
      )

      const content = (
        <p className={noteTextClass(unavailable, showFullText, true)}>{displayText}</p>
      )

      return (
        <>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(className, 'cursor-pointer hover:bg-muted/50')}
            >
              {content}
            </button>
          ) : (
            <div className={className}>{content}</div>
          )}
          {modal}
        </>
      )
    }

    return (
      <>
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm',
            unavailable && 'bg-red-500/[0.06]',
            canEdit && 'cursor-pointer transition hover:opacity-90',
          )}
          onClick={canEdit ? () => setOpen(true) : undefined}
          onKeyDown={
            canEdit
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setOpen(true)
                  }
                }
              : undefined
          }
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
        >
          <p
            className={cn(
              'whitespace-pre-wrap break-words text-sm',
              unavailable
                ? 'italic text-red-600 dark:text-red-400'
                : 'text-foreground',
            )}
          >
            {displayText}
          </p>
        </div>
        {modal}
      </>
    )
  }

  if (!canEdit) return null

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full min-h-[4.5rem] items-center justify-center rounded-lg transition-colors hover:bg-muted/20 landscape:max-lg:min-h-0 landscape:max-lg:py-2 lg:min-h-[5rem]"
          aria-label={`Add note on ${dateKey}`}
        >
          <Plus className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-brand/40 landscape:max-lg:h-4 landscape:max-lg:w-4" />
        </button>
        {modal}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground transition hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>Add note</span>
      </button>
      {modal}
    </>
  )
}
