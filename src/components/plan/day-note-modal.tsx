'use client'

import { useTransition } from 'react'
import { DayNoteStatus } from '@prisma/client'
import { deleteDayNote, upsertDayNote } from '@/app/actions/day-notes'
import { DAY_NOTE_OPTIONS, type DayNoteData } from '@/lib/day-notes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
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

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs font-medium text-muted-foreground">Status</legend>
            {DAY_NOTE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 has-[:checked]:border-brand/50 has-[:checked]:bg-brand/[0.04]"
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  defaultChecked={(note?.status ?? DayNoteStatus.AVAILABLE) === option.value}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{option.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="block text-xs">
            <span className="text-muted-foreground">Comments</span>
            <textarea
              name="notes"
              defaultValue={note?.notes ?? ''}
              rows={3}
              placeholder="e.g. Concert in the evening — morning only"
              className="input-field mt-1 text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            {note && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm('Remove your note for this day?')) return
                  const fd = new FormData()
                  fd.set('date', dateKey)
                  if (athleteId) fd.set('athleteId', athleteId)
                  startTransition(async () => {
                    await deleteDayNote(fd)
                    onOpenChange(false)
                  })
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
