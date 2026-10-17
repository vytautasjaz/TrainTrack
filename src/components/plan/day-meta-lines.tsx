'use client'

import { useState } from 'react'
import { Calendar, StickyNote } from 'lucide-react'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { SeasonEventDetailSheet } from '@/components/plan/season-event-detail-sheet'
import {
  DAY_NOTE_UNAVAILABLE_LABEL,
  dayNoteHasVisibleContent,
  getDayNoteKindText,
  isDayNoteUnavailable,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import {
  formatSeasonEventLabel,
  type SeasonEventData,
} from '@/lib/season-planner'
import { cn } from '@/lib/utils'

function dayMetaLineClass() {
  return cn(
    'flex w-full min-w-0 items-start gap-1 text-left',
    'text-[11px] leading-snug text-[var(--tt-v2-light-ink-faint)]',
    'transition hover:text-[var(--tt-v2-light-ink-soft)]',
  )
}

export function DayMetaEventLine({
  event,
  isCoach = false,
  editable = true,
}: {
  event: SeasonEventData
  isCoach?: boolean
  editable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const fromCoach = event.createdByRole === 'COACH'
  return (
    <>
      <button
        type="button"
        className={dayMetaLineClass()}
        onClick={() => setOpen(true)}
        title={formatSeasonEventLabel(event)}
      >
        <Calendar
          className={cn(
            'mt-0.5 h-2.5 w-2.5 shrink-0',
            fromCoach ? 'fill-[#d5dae0] text-[#9aa3ad]' : 'opacity-70',
          )}
          strokeWidth={fromCoach ? 1.75 : 2}
          aria-hidden
        />
        <span className="min-w-0 truncate">{formatSeasonEventLabel(event)}</span>
      </button>
      <SeasonEventDetailSheet
        event={event}
        open={open}
        onOpenChange={setOpen}
        editable={editable}
        isCoach={isCoach}
      />
    </>
  )
}

export function DayMetaNoteLines({
  dateKey,
  note,
  isCoach = false,
  canEdit = true,
  onNoteChange,
}: {
  dateKey: string
  note: DayNoteData
  isCoach?: boolean
  canEdit?: boolean
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const athleteText = getDayNoteKindText(note, 'athlete')
  const coachText = getDayNoteKindText(note, 'coach')
  const unavailable = isDayNoteUnavailable(note.status)
  const rows: Array<{
    key: string
    kind: DayNoteKind
    text: string
    readOnly: boolean
    unavailable?: boolean
  }> = []
  if (unavailable) {
    rows.push({
      key: 'athlete-unavailable',
      kind: 'athlete',
      text: DAY_NOTE_UNAVAILABLE_LABEL,
      readOnly: !canEdit || isCoach,
      unavailable: true,
    })
  }
  if (athleteText) {
    rows.push({
      key: 'athlete',
      kind: 'athlete',
      text: athleteText,
      readOnly: !canEdit || isCoach,
    })
  }
  if (coachText) {
    rows.push({
      key: 'coach',
      kind: 'coach',
      text: coachText,
      readOnly: !canEdit || !isCoach,
    })
  }

  if (rows.length === 0) return null

  return (
    <div className="flex w-full flex-col gap-0.5">
      {rows.map((row) => (
        <DayMetaNoteLine
          key={row.key}
          dateKey={dateKey}
          note={note}
          kind={row.kind}
          text={row.text}
          readOnly={row.readOnly}
          unavailable={row.unavailable}
          onNoteChange={onNoteChange}
        />
      ))}
    </div>
  )
}

function DayMetaNoteLine({
  dateKey,
  note,
  kind,
  text,
  readOnly,
  unavailable = false,
  onNoteChange,
}: {
  dateKey: string
  note: DayNoteData
  kind: DayNoteKind
  text: string
  readOnly: boolean
  unavailable?: boolean
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={cn(
          dayMetaLineClass(),
          unavailable && 'text-brand hover:text-brand/80',
        )}
        onClick={() => setOpen(true)}
        title={text}
      >
        <StickyNote
          className={cn(
            'mt-0.5 h-2.5 w-2.5 shrink-0',
            unavailable
              ? 'text-brand opacity-90'
              : kind === 'coach'
                ? 'fill-[#d5dae0] text-[#9aa3ad]'
                : 'opacity-70',
          )}
          strokeWidth={kind === 'coach' && !unavailable ? 1.75 : 2}
          aria-hidden
        />
        <span
          className={cn(
            'min-w-0 whitespace-pre-wrap break-words text-left',
            unavailable && 'font-medium italic',
          )}
        >
          {text}
        </span>
      </button>
      <DayNoteModal
        dateKey={dateKey}
        note={note}
        noteKind={kind}
        readOnly={readOnly}
        open={open}
        onOpenChange={setOpen}
        onNoteChange={onNoteChange}
      />
    </>
  )
}

/** Events + notes block — same plain icon lines as home week columns. */
export function DayMetaBlock({
  dateKey,
  events = [],
  note,
  showEvents = true,
  showNotes = true,
  isCoach = false,
  canEditNotes = true,
  className,
  onNoteChange,
}: {
  dateKey: string
  events?: SeasonEventData[]
  note?: DayNoteData | null
  showEvents?: boolean
  showNotes?: boolean
  isCoach?: boolean
  canEditNotes?: boolean
  className?: string
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const visibleEvents = showEvents ? events : []
  const visibleNote =
    showNotes && note && dayNoteHasVisibleContent(note) ? note : null
  if (visibleEvents.length === 0 && !visibleNote) return null

  return (
    <div className={cn('mt-auto space-y-0.5 px-0.5 pt-1.5', className)}>
      {visibleEvents.map((event) => (
        <DayMetaEventLine
          key={event.id}
          event={event}
          isCoach={isCoach}
          editable
        />
      ))}
      {visibleNote ? (
        <DayMetaNoteLines
          dateKey={dateKey}
          note={visibleNote}
          isCoach={isCoach}
          canEdit={canEditNotes}
          onNoteChange={onNoteChange}
        />
      ) : null}
    </div>
  )
}
