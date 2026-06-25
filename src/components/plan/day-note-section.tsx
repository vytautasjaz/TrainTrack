'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DAY_NOTE_COLORS,
  getDayNoteLabel,
  type DayNoteData,
} from '@/lib/day-notes'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { cn } from '@/lib/utils'

type DayNoteSectionProps = {
  dateKey: string
  note?: DayNoteData | null
  canEdit: boolean
  athleteId?: string
  compact?: boolean
  hideEmptyAdd?: boolean
}

export function DayNoteSection({
  dateKey,
  note,
  canEdit,
  athleteId,
  compact = false,
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
    const colors = DAY_NOTE_COLORS[note.status]

    if (compact) {
      const className =
        'group flex w-full items-start gap-1 rounded-lg px-0.5 py-0.5 text-left landscape:max-lg:gap-0.5 lg:gap-1.5 lg:px-1'

      const content = (
        <>
          <span
            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full landscape:max-lg:mt-0.5"
            style={{ backgroundColor: colors.dot }}
          />
          <div className="min-w-0">
            <p className="min-w-0 truncate text-xs font-medium leading-snug landscape:max-lg:text-[8px] landscape:max-lg:leading-tight">
              {getDayNoteLabel(note.status)}
            </p>
            {note.notes && (
              <p className="truncate text-[10px] text-muted-foreground landscape:max-lg:text-[8px] lg:text-xs">
                {note.notes}
              </p>
            )}
          </div>
        </>
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
            'rounded-xl border-l-[3px] px-3 py-2 text-sm',
            canEdit && 'cursor-pointer transition hover:opacity-90',
          )}
          style={{ borderColor: colors.dot, backgroundColor: colors.bg }}
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
          <p className="font-medium text-foreground">{getDayNoteLabel(note.status)}</p>
          {note.notes && <p className="mt-0.5 text-sm text-muted-foreground">{note.notes}</p>}
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
          className="group flex w-full items-center justify-center rounded-lg transition-colors hover:bg-muted/20 min-h-[4.5rem] landscape:max-lg:min-h-0 landscape:max-lg:py-2 lg:min-h-[5rem]"
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
