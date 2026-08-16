'use client'

import { useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import { deleteDayNote, upsertDayNote } from '@/app/actions/day-notes'
import {
  dayNoteKindHasContent,
  isDayNoteUnavailable,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/form-field'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type DayNoteModalProps = {
  dateKey: string
  note?: DayNoteData | null
  noteKind: DayNoteKind
  /** When true, show the note content only — no edit controls. */
  readOnly?: boolean
  athleteId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DayNoteModal({
  dateKey,
  note,
  noteKind,
  readOnly = false,
  athleteId,
  open,
  onOpenChange,
}: DayNoteModalProps) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isAthleteKind = noteKind === 'athlete'
  const unavailable = note ? isDayNoteUnavailable(note.status) : false
  const existingText = isAthleteKind
    ? note?.athleteNotes ?? ''
    : note?.coachNotes ?? ''
  const existingPrivate = isAthleteKind
    ? Boolean(note?.athleteNotesPrivate)
    : Boolean(note?.coachNotesPrivate)
  const hasExisting = dayNoteKindHasContent(note, noteKind)
  const title = readOnly
    ? isAthleteKind
      ? 'Athlete note'
      : 'Coach note'
    : isAthleteKind
      ? hasExisting
        ? 'Edit athlete note'
        : 'Add athlete note'
      : hasExisting
        ? 'Edit coach note'
        : 'Add coach note'

  function handleRemove() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('date', dateKey)
      fd.set('noteKind', noteKind)
      if (athleteId) fd.set('athleteId', athleteId)
      await deleteDayNote(fd)
      setConfirmOpen(false)
      onOpenChange(false)
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md gap-0 p-4">
          <DialogHeader className="mb-3">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{dateKey}</DialogDescription>
          </DialogHeader>

          {readOnly ? (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-sm whitespace-pre-wrap break-words',
                  isAthleteKind
                    ? 'border-amber-200/70 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10'
                    : 'border-sky-200/70 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10',
                  unavailable && !existingText && 'italic text-red-600 dark:text-red-400',
                )}
              >
                {existingText || (unavailable ? 'Unavailable' : 'No note')}
              </div>
              {existingPrivate ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
                  Private — only visible to{' '}
                  {isAthleteKind ? 'the athlete' : 'the coach'}
                </p>
              ) : null}
              {unavailable && existingText ? (
                <p className="text-xs italic text-red-600 dark:text-red-400">
                  Marked unavailable
                </p>
              ) : null}
              <div className="border-t border-border/60 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-3"
              action={(formData) => {
                startTransition(async () => {
                  await upsertDayNote(formData)
                  onOpenChange(false)
                })
              }}
            >
              <input type="hidden" name="date" value={dateKey} />
              <input type="hidden" name="noteKind" value={noteKind} />
              {athleteId && <input type="hidden" name="athleteId" value={athleteId} />}

              <FormField label="Note">
                <Textarea
                  name="notes"
                  defaultValue={existingText}
                  rows={4}
                  autoFocus
                  placeholder={
                    isAthleteKind
                      ? 'e.g. Concert in the evening — morning only'
                      : 'e.g. Keep intensity easy before race weekend'
                  }
                />
              </FormField>

              <PrivateNoteToggle
                hideFrom={isAthleteKind ? 'coach' : 'athlete'}
                name="notesPrivate"
                defaultChecked={existingPrivate}
              />

              {isAthleteKind ? (
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition',
                    'has-[:checked]:border-muted-foreground/40 has-[:checked]:bg-muted/30',
                  )}
                >
                  <input
                    type="checkbox"
                    name="unavailable"
                    defaultChecked={unavailable}
                    className="rounded border-border"
                  />
                  <span className="text-muted-foreground">Mark as unavailable</span>
                </label>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
                {hasExisting ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={pending}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {!readOnly ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Remove this note?"
          description={
            isAthleteKind
              ? 'Your athlete note for this day will be deleted.'
              : 'Your coach note for this day will be deleted.'
          }
          confirmLabel="Remove"
          pending={pending}
          onConfirm={handleRemove}
        />
      ) : null}
    </>
  )
}
