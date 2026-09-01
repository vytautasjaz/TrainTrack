'use client'

import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import {
  dayNoteHasVisibleContent,
  dayNoteKindHasContent,
  getDayNoteKindText,
  isDayNoteUnavailable,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import {
  WeekAddPlusMark,
  weekAddPlusButtonClass,
} from '@/components/plan/week-add-plus'
import { cn } from '@/lib/utils'

type DayNoteSectionProps = {
  dateKey: string
  note?: DayNoteData | null
  canEdit: boolean
  /** Current viewer role — controls which note they can edit. */
  noteKind: DayNoteKind
  athleteId?: string
  compact?: boolean
  /** Show full note text with wrapping (week table). */
  showFullText?: boolean
  hideEmptyAdd?: boolean
  /**
   * `chip` — bordered card (month / default).
   * `strip` — list agenda flat text.
   * `cell` — week table: fill parent cell (amber lives on the `<td>`).
   */
  variant?: 'chip' | 'strip' | 'cell'
}

type ModalState = {
  kind: DayNoteKind
  readOnly: boolean
} | null

function noteTextClass(
  unavailable: boolean,
  showFullText: boolean,
  compact: boolean,
  strip: boolean,
  cell: boolean,
) {
  const flat = strip || cell
  return cn(
    'min-w-0 leading-snug',
    // Match event cell body (subheader): same size, weight, ink
    cell &&
      'text-xs font-normal leading-snug text-amber-950/80 dark:text-amber-100/80',
    strip &&
      'text-xs font-normal tracking-[0.004em] text-amber-950/80 dark:text-amber-100/80',
    !flat && compact && !showFullText && 'text-[11px] font-medium',
    !flat && compact && showFullText && 'text-[13px] font-medium',
    !flat && !compact && 'text-sm',
    showFullText || flat ? 'whitespace-pre-wrap break-words' : 'truncate',
    unavailable
      ? 'italic text-red-600 dark:text-red-400'
      : !flat && 'text-amber-950 dark:text-amber-100',
  )
}

function chipClass(
  showFullText: boolean,
  interactive: boolean,
  strip: boolean,
  cell: boolean,
) {
  if (strip || cell) {
    return cn(
      'relative z-10 w-full text-left text-amber-950 dark:text-amber-100',
      cell && 'px-0 py-0',
      interactive && 'cursor-pointer transition hover:opacity-80',
    )
  }
  return cn(
    'relative z-10 group w-full rounded-[var(--radius-workout)] border px-2 py-1.5 text-left',
    'border-amber-200/70 bg-amber-50 shadow-[0_1px_1px_rgb(0_0_0_/0.05),0_1px_2px_rgb(0_0_0_/0.04)]',
    'dark:border-amber-500/30 dark:bg-amber-500/15',
    showFullText && 'lg:px-2.5 lg:py-2',
    interactive &&
      'cursor-pointer transition hover:bg-amber-100 dark:hover:bg-amber-500/25',
  )
}

function NoteChip({
  kind,
  text,
  unavailable,
  isPrivate,
  showFullText,
  compact,
  strip,
  cell,
  title,
  onOpen,
}: {
  kind: DayNoteKind
  text: string
  unavailable: boolean
  isPrivate: boolean
  showFullText: boolean
  compact: boolean
  strip: boolean
  cell: boolean
  title?: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={chipClass(showFullText, true, strip, cell)}
    >
      <div className="flex min-w-0 items-start gap-1">
        {isPrivate ? (
          <Lock
            className={cn(
              'mt-0.5 h-3 w-3 shrink-0',
              cell
                ? 'text-amber-950/70 dark:text-amber-100/70'
                : 'text-amber-800/60 dark:text-amber-200/70',
            )}
            strokeWidth={2}
            aria-label="Private"
          />
        ) : null}
        <p
          className={noteTextClass(
            unavailable,
            showFullText,
            compact,
            strip,
            cell,
          )}
        >
          {(strip || cell) && !unavailable ? (
            <>
              <span
                className={
                  cell
                    ? 'font-medium text-amber-950 dark:text-amber-100'
                    : 'font-semibold text-amber-800/90 dark:text-amber-200/90'
                }
              >
                {kind === 'coach' ? 'Coach · ' : 'Athlete · '}
              </span>
              <span className="font-normal">{text}</span>
            </>
          ) : (
            text
          )}
        </p>
      </div>
    </button>
  )
}

export function DayNoteSection({
  dateKey,
  note,
  canEdit,
  noteKind,
  athleteId,
  compact = false,
  showFullText = false,
  hideEmptyAdd = false,
  variant = 'chip',
}: DayNoteSectionProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const hasVisible = dayNoteHasVisibleContent(note)
  const strip = variant === 'strip'
  const cell = variant === 'cell'

  if (!canEdit && !hasVisible) return null
  if (hideEmptyAdd && !hasVisible) return null

  const athleteText = note ? getDayNoteKindText(note, 'athlete') : ''
  const coachText = note ? getDayNoteKindText(note, 'coach') : ''
  const unavailable = note ? isDayNoteUnavailable(note.status) : false
  const showAthleteChip = Boolean(athleteText) || unavailable
  const showCoachChip = Boolean(coachText)
  const athletePrivate = Boolean(note?.athleteNotesPrivate)
  const coachPrivate = Boolean(note?.coachNotesPrivate)

  function openForKind(kind: DayNoteKind) {
    const canEditThis = canEdit && kind === noteKind
    setModal({ kind, readOnly: !canEditThis })
  }

  function openAdd() {
    if (!canEdit) return
    setModal({ kind: noteKind, readOnly: false })
  }

  const dialog =
    modal != null ? (
      <DayNoteModal
        key={`${dateKey}-${modal.kind}-${modal.readOnly ? 'ro' : 'rw'}`}
        dateKey={dateKey}
        note={note}
        noteKind={modal.kind}
        readOnly={modal.readOnly}
        athleteId={athleteId}
        open
        onOpenChange={(open) => {
          if (!open) setModal(null)
        }}
      />
    ) : null

  if (hasVisible) {
    return (
      <>
        <div
          className={cn(
            'flex w-full flex-col',
            cell
              ? 'gap-1.5'
              : compact || strip
                ? 'gap-1'
                : 'gap-1.5',
          )}
        >
          {showAthleteChip ? (
            <NoteChip
              kind="athlete"
              text={athleteText || 'Unavailable'}
              unavailable={unavailable && !athleteText}
              isPrivate={athletePrivate}
              showFullText={showFullText || cell}
              compact={compact}
              strip={strip}
              cell={cell}
              title={
                canEdit && noteKind === 'athlete'
                  ? dayNoteKindHasContent(note, 'athlete')
                    ? 'Edit athlete note'
                    : 'View athlete note'
                  : 'View athlete note'
              }
              onOpen={() => openForKind('athlete')}
            />
          ) : null}
          {showCoachChip ? (
            <NoteChip
              kind="coach"
              text={coachText}
              unavailable={false}
              isPrivate={coachPrivate}
              showFullText={showFullText || cell}
              compact={compact}
              strip={strip}
              cell={cell}
              title={
                canEdit && noteKind === 'coach'
                  ? dayNoteKindHasContent(note, 'coach')
                    ? 'Edit coach note'
                    : 'View coach note'
                  : 'View coach note'
              }
              onOpen={() => openForKind('coach')}
            />
          ) : null}
        </div>
        {dialog}
      </>
    )
  }

  if (!canEdit) return null

  if (compact || cell) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openAdd()
          }}
          className={cn(weekAddPlusButtonClass.cell, 'absolute inset-0 min-h-0')}
          aria-label={`Add note on ${dateKey}`}
        >
          <WeekAddPlusMark size="cell" />
        </button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openAdd()
        }}
        className="relative z-10 flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground transition hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>Add note</span>
      </button>
      {dialog}
    </>
  )
}

export function dayNoteSectionHasContent(note: DayNoteData | null | undefined) {
  return dayNoteHasVisibleContent(note)
}

export function viewerOwnsNoteKind(
  note: DayNoteData | null | undefined,
  kind: DayNoteKind,
) {
  return dayNoteKindHasContent(note, kind)
}
