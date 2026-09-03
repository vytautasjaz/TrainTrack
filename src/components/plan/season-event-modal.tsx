/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  createSeasonEvent,
  deleteSeasonEvent,
  listCoachRecentSeasonEvents,
  updateSeasonEvent,
  type CoachRecentSeasonEvent,
} from '@/app/actions/season-events'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
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
import { cn } from '@/lib/utils'

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

function formatEventRange(startKey: string, endKey: string): string {
  if (!startKey) return '—'
  if (!endKey || endKey === startKey) return startKey
  return `${startKey} → ${endKey}`
}

type SeasonEventModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit existing event when set. */
  event?: SeasonEventData | null
  /** Defaults for create (YYYY-MM-DD). */
  defaultStartDate?: string
  defaultEndDate?: string
  /** View-only — show event details without save/delete. */
  readOnly?: boolean
}

export function SeasonEventModal({
  open,
  onOpenChange,
  event = null,
  defaultStartDate,
  defaultEndDate,
  readOnly = false,
}: SeasonEventModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const editing = event
  const canWrite = !readOnly
  const fallbackToday = useMemo(() => todayLocalKey(), [])
  const createStart = defaultStartDate ?? fallbackToday
  const createEnd = defaultEndDate ?? defaultStartDate ?? fallbackToday

  const [title, setTitle] = useState(editing?.title ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [startKey, setStartKey] = useState(
    editing ? dateInputValue(editing.startDate) : createStart,
  )
  const [endKey, setEndKey] = useState(
    editing ? dateInputValue(editing.endDate) : createEnd,
  )
  const [recentEvents, setRecentEvents] = useState<CoachRecentSeasonEvent[]>([])
  const [recentLoaded, setRecentLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setNotes(editing.notes ?? '')
      setStartKey(dateInputValue(editing.startDate))
      setEndKey(dateInputValue(editing.endDate))
      setRecentEvents([])
      setRecentLoaded(false)
      return
    }
    setTitle('')
    setNotes('')
    setStartKey(createStart)
    setEndKey(createEnd)
    setRecentLoaded(false)
    if (!canWrite) return
    let cancelled = false
    void listCoachRecentSeasonEvents()
      .then((rows) => {
        if (!cancelled) {
          setRecentEvents(rows)
          setRecentLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentEvents([])
          setRecentLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, editing, createStart, createEnd, canWrite])

  function applyReuse(row: CoachRecentSeasonEvent) {
    setTitle(row.title)
    setNotes(row.notes ?? '')
    setStartKey(row.startDate)
    setEndKey(row.endDate)
    setError(null)
  }

  const showReuse = canWrite && !editing && recentLoaded && recentEvents.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {readOnly ? 'Event' : editing ? 'Edit event' : 'Add event'}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'Season plan block details.'
              : 'Named blocks on the season plan — vacations, camps, or anything else you want to mark.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canWrite) {
              onOpenChange(false)
              return
            }
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              try {
                if (editing) {
                  fd.set('id', editing.id)
                  await updateSeasonEvent(fd)
                } else {
                  await createSeasonEvent(fd)
                }
                onOpenChange(false)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save event')
              }
            })
          }}
        >
          <FormError message={error} />

          {showReuse ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Reuse from…
              </p>
              <div className="max-h-[11.5rem] overflow-y-auto overscroll-contain rounded-[8px] border border-border">
                <ul className="divide-y divide-border">
                  {recentEvents.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => applyReuse(row)}
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-3 py-2 text-left transition',
                          'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                        )}
                      >
                        <span className="truncate text-sm font-medium text-foreground">
                          {row.title}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {formatEventRange(row.startDate, row.endDate)}
                          {' · '}
                          {row.athleteName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Prefills this form — review dates, then add for the current athlete.
              </p>
            </div>
          ) : null}

          <FormField label="Title">
            <Input
              name="title"
              required={canWrite}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Alps training camp"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Notes (optional)">
            <Input
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional detail"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start">
              <Input
                name="startDate"
                type="date"
                required={canWrite}
                value={startKey}
                onChange={(e) => {
                  const next = e.target.value
                  setStartKey(next)
                  if (endKey && next && endKey < next) setEndKey(next)
                }}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </FormField>
            <FormField label="End">
              <Input
                name="endDate"
                type="date"
                required={canWrite}
                min={startKey || undefined}
                value={endKey}
                onChange={(e) => setEndKey(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {canWrite ? (
              <>
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
                      setError(null)
                      startTransition(async () => {
                        try {
                          const fd = new FormData()
                          fd.set('id', editing.id)
                          await deleteSeasonEvent(fd)
                          onOpenChange(false)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Could not delete event')
                        }
                      })
                    }}
                  >
                    Delete
                  </Button>
                ) : null}
              </>
            ) : (
              <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
