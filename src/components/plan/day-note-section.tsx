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
}

type ModalState = {
  kind: DayNoteKind
  readOnly: boolean
} | null

function noteTextClass(unavailable: boolean, showFullText: boolean, compact: boolean) {
  return cn(
    'min-w-0 leading-snug',
    compact && !showFullText && 'text-[11px] font-medium',
    compact && showFullText && 'text-[13px] font-medium',
    !compact && 'text-sm',
    showFullText ? 'whitespace-pre-wrap break-words' : 'truncate',
    unavailable
      ? 'italic text-red-600 dark:text-red-400'
      : 'text-foreground',
  )
}

function chipClass(kind: DayNoteKind, showFullText: boolean, interactive: boolean) {
  return cn(
    'relative z-10 group w-full rounded-[var(--radius-workout)] border px-2 py-1.5 text-left',
    'shadow-[0_1px_1px_rgb(0_0_0_/0.05),0_1px_2px_rgb(0_0_0_/0.04)]',
    showFullText && 'lg:px-2.5 lg:py-2',
    kind === 'athlete'
      ? 'border-amber-200/70 bg-yellow-100 dark:border-yellow-500/30 dark:bg-yellow-500/20'
      : 'border-sky-200/70 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/15',
    interactive && 'cursor-pointer transition',
    interactive &&
      kind === 'athlete' &&
      'hover:bg-yellow-200/80 dark:hover:bg-yellow-500/30',
    interactive &&
      kind === 'coach' &&
      'hover:bg-sky-100 dark:hover:bg-sky-500/25',
  )
}

function NoteChip({
  kind,
  text,
  unavailable,
  isPrivate,
  showFullText,
  compact,
  title,
  onOpen,
}: {
  kind: DayNoteKind
  text: string
  unavailable: boolean
  isPrivate: boolean
  showFullText: boolean
  compact: boolean
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
      className={chipClass(kind, showFullText, true)}
    >
      <div className="flex min-w-0 items-start gap-1">
        {isPrivate ? (
          <Lock
            className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-label="Private"
          />
        ) : null}
        <p className={noteTextClass(unavailable, showFullText, compact)}>{text}</p>
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
}: DayNoteSectionProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const hasVisible = dayNoteHasVisibleContent(note)

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
        <div className={cn('flex w-full flex-col', compact ? 'gap-1' : 'gap-1.5')}>
          {showAthleteChip ? (
            <NoteChip
              kind="athlete"
              text={athleteText || 'Unavailable'}
              unavailable={unavailable && !athleteText}
              isPrivate={athletePrivate}
              showFullText={showFullText}
              compact={compact}
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
              showFullText={showFullText}
              compact={compact}
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

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openAdd()
          }}
          className="group relative z-10 flex w-full min-h-[4.5rem] items-center justify-center rounded-lg transition-colors hover:bg-muted/20 landscape:max-lg:min-h-0 landscape:max-lg:py-2 lg:min-h-[5rem]"
          aria-label={`Add note on ${dateKey}`}
        >
          <Plus className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-brand/40 landscape:max-lg:h-4 landscape:max-lg:w-4" />
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
