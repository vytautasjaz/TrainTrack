'use client'

import { useState, useTransition } from 'react'
import { deleteDayNote, upsertDayNote } from '@/app/actions/day-notes'
import { isDayNoteUnavailable, type DayNoteData } from '@/lib/day-notes'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/form-field'
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
  athleteId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DayNoteModal({
  dateKey,
  note,
  athleteId,
  open,
  onOpenChange,
}: DayNoteModalProps) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const unavailable = note ? isDayNoteUnavailable(note.status) : false

  function handleRemove() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('date', dateKey)
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
            <DialogTitle>{note ? 'Edit note' : 'Add note'}</DialogTitle>
            <DialogDescription>{dateKey}</DialogDescription>
          </DialogHeader>
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
            {athleteId && <input type="hidden" name="athleteId" value={athleteId} />}

            <FormField label="Note">
              <Textarea
                name="notes"
                defaultValue={note?.notes ?? ''}
                rows={4}
                autoFocus
                placeholder="e.g. Concert in the evening — morning only"
              />
            </FormField>

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

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
              {note && (
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
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this note?"
        description="Your note for this day will be deleted."
        confirmLabel="Remove"
        pending={pending}
        onConfirm={handleRemove}
      />
    </>
  )
}
