/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  createSeasonEvent,
  deleteSeasonEvent,
  updateSeasonEvent,
} from '@/app/actions/season-events'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type SeasonEventData } from '@/lib/season-planner'
import { toDateKey } from '@/lib/dates'

function dateInputValue(d: Date): string {
  return toDateKey(d)
}

function todayLocalKey(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type SeasonEventModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit existing event when set. */
  event?: SeasonEventData | null
  /** Defaults for create (YYYY-MM-DD). */
  defaultStartDate?: string
  defaultEndDate?: string
}

export function SeasonEventModal({
  open,
  onOpenChange,
  event = null,
  defaultStartDate,
  defaultEndDate,
}: SeasonEventModalProps) {
  const [pending, startTransition] = useTransition()
  const editing = event
  const fallbackToday = useMemo(() => todayLocalKey(), [])
  const createStart = defaultStartDate ?? fallbackToday
  const createEnd = defaultEndDate ?? defaultStartDate ?? fallbackToday

  const [startKey, setStartKey] = useState(
    editing ? dateInputValue(editing.startDate) : createStart,
  )
  const [endKey, setEndKey] = useState(
    editing ? dateInputValue(editing.endDate) : createEnd,
  )

  useEffect(() => {
    if (!open) return
    if (editing) {
      setStartKey(dateInputValue(editing.startDate))
      setEndKey(dateInputValue(editing.endDate))
    } else {
      setStartKey(createStart)
      setEndKey(createEnd)
    }
  }, [open, editing, createStart, createEnd])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit event' : 'Add event'}</DialogTitle>
          <DialogDescription>
            Named blocks on the season plan — vacations, camps, or anything else you want to mark.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              if (editing) {
                fd.set('id', editing.id)
                await updateSeasonEvent(fd)
              } else {
                await createSeasonEvent(fd)
              }
              onOpenChange(false)
            })
          }}
        >
          <FormField label="Title">
            <Input
              name="title"
              required
              maxLength={120}
              defaultValue={editing?.title ?? ''}
              key={`title-${editing?.id ?? createStart}`}
              placeholder="e.g. Alps training camp"
            />
          </FormField>
          <FormField label="Notes (optional)">
            <Input
              name="notes"
              defaultValue={editing?.notes ?? ''}
              key={`notes-${editing?.id ?? createStart}`}
              placeholder="Optional detail"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start">
              <Input
                name="startDate"
                type="date"
                required
                value={startKey}
                onChange={(e) => {
                  const next = e.target.value
                  setStartKey(next)
                  if (endKey && next && endKey < next) setEndKey(next)
                }}
              />
            </FormField>
            <FormField label="End">
              <Input
                name="endDate"
                type="date"
                required
                min={startKey || undefined}
                value={endKey}
                onChange={(e) => setEndKey(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save' : 'Add event'}
            </Button>
            {editing ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const fd = new FormData()
                    fd.set('id', editing.id)
                    await deleteSeasonEvent(fd)
                    onOpenChange(false)
                  })
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
