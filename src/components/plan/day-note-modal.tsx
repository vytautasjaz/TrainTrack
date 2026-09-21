'use client'

import { useEffect, useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import {
  deleteDayNote,
  listCoachAthletesForDayNote,
  upsertDayNote,
} from '@/app/actions/day-notes'
import {
  dayNoteKindHasContent,
  isDayNoteUnavailable,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormError } from '@/components/ui/form-error'
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
  const [error, setError] = useState<string | null>(null)
  const [roster, setRoster] = useState<Array<{ id: string; name: string }>>([])
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(() =>
    athleteId ? [athleteId] : [],
  )
  const [multiAthleteOpen, setMultiAthleteOpen] = useState(false)
  const isAthleteKind = noteKind === 'athlete'
  const unavailable = note ? isDayNoteUnavailable(note.status) : false
  const existingText = isAthleteKind
    ? note?.athleteNotes ?? ''
    : note?.coachNotes ?? ''
  const existingPrivate = isAthleteKind
    ? Boolean(note?.athleteNotesPrivate)
    : Boolean(note?.coachNotesPrivate)
  const hasExisting = dayNoteKindHasContent(note, noteKind)
  const canOfferMultiAthlete = !readOnly && !isAthleteKind && !hasExisting
  const multiAthleteActive = canOfferMultiAthlete && multiAthleteOpen
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

  useEffect(() => {
    if (!open) return
    setSelectedAthleteIds(athleteId ? [athleteId] : [])
    setMultiAthleteOpen(false)
    setError(null)
  }, [open, athleteId])

  useEffect(() => {
    if (!open || readOnly || isAthleteKind || hasExisting || !multiAthleteOpen) {
      if (!multiAthleteOpen) setRoster([])
      return
    }
    let cancelled = false
    listCoachAthletesForDayNote()
      .then((list) => {
        if (cancelled) return
        setRoster(list)
        setSelectedAthleteIds((prev) => {
          if (prev.length > 0) {
            const allowed = new Set(list.map((a) => a.id))
            const kept = prev.filter((id) => allowed.has(id))
            if (kept.length > 0) return kept
          }
          if (athleteId && list.some((a) => a.id === athleteId)) {
            return [athleteId]
          }
          return list[0] ? [list[0].id] : []
        })
      })
      .catch(() => {
        if (!cancelled) setRoster([])
      })
    return () => {
      cancelled = true
    }
  }, [open, readOnly, isAthleteKind, hasExisting, athleteId, multiAthleteOpen])

  function toggleAthlete(id: string) {
    setSelectedAthleteIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('date', dateKey)
        fd.set('noteKind', noteKind)
        if (athleteId) fd.set('athleteId', athleteId)
        await deleteDayNote(fd)
        setConfirmOpen(false)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove note')
      }
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setError(null)
          onOpenChange(next)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-4">
          <DialogHeader className="mb-3">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{dateKey}</DialogDescription>
          </DialogHeader>

          {readOnly ? (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-sm whitespace-pre-wrap break-words',
                  'text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
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
                setError(null)
                if (multiAthleteActive && selectedAthleteIds.length === 0) {
                  setError('Select at least one athlete')
                  return
                }
                startTransition(async () => {
                  try {
                    await upsertDayNote(formData)
                    onOpenChange(false)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save note')
                  }
                })
              }}
            >
              <FormError message={error} />
              <input type="hidden" name="date" value={dateKey} />
              <input type="hidden" name="noteKind" value={noteKind} />
              {athleteId ? (
                <input type="hidden" name="athleteId" value={athleteId} />
              ) : null}
              {multiAthleteActive
                ? selectedAthleteIds.map((id) => (
                    <input key={id} type="hidden" name="athleteIds" value={id} />
                  ))
                : null}

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

              {canOfferMultiAthlete ? (
                <div className="space-y-2">
                  {!multiAthleteOpen ? (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => setMultiAthleteOpen(true)}
                    >
                      Also add for other athletes…
                    </button>
                  ) : (
                    <FormField label="Also add for">
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                        <div className="mb-1 flex flex-wrap items-center gap-2 px-1 pb-1">
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:underline"
                            onClick={() =>
                              setSelectedAthleteIds(roster.map((a) => a.id))
                            }
                          >
                            Select all
                          </button>
                          <span className="text-[11px] text-muted-foreground">
                            ·
                          </span>
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:underline"
                            onClick={() =>
                              setSelectedAthleteIds(
                                athleteId &&
                                  roster.some((a) => a.id === athleteId)
                                  ? [athleteId]
                                  : roster[0]
                                    ? [roster[0].id]
                                    : [],
                              )
                            }
                          >
                            Only current
                          </button>
                          <span className="text-[11px] text-muted-foreground">
                            ·
                          </span>
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:underline"
                            onClick={() => {
                              setMultiAthleteOpen(false)
                              setSelectedAthleteIds(
                                athleteId ? [athleteId] : [],
                              )
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {roster.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            Loading athletes…
                          </p>
                        ) : roster.length === 1 ? (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            No other athletes on your roster.
                          </p>
                        ) : (
                          roster.map((a) => {
                            const checked = selectedAthleteIds.includes(a.id)
                            return (
                              <label
                                key={a.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition',
                                  checked
                                    ? 'bg-muted/50'
                                    : 'hover:bg-muted/30',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAthlete(a.id)}
                                  className="rounded border-border"
                                />
                                <span className="truncate">{a.name}</span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </FormField>
                  )}
                </div>
              ) : null}

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
                  {pending
                    ? 'Saving…'
                    : multiAthleteActive && selectedAthleteIds.length > 1
                      ? `Save for ${selectedAthleteIds.length}`
                      : 'Save'}
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
