'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { copyTrainingPlanSessionToSlots } from '@/app/actions/training-plans'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormError } from '@/components/ui/form-error'
import { toUserMessage } from '@/lib/action-error'
import {
  DAY_OF_WEEK_SHORT,
  planSlotKey,
} from '@/lib/training-plan'
import { cn } from '@/lib/utils'

type CopyPlanCanvasSessionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionTitle: string
  weekCount: number
  sourceWeekIndex: number
  sourceDayOfWeek: number
  /** Optional occupancy hints: slotKey → session count */
  occupiedSlots?: Record<string, number>
}

function keysInRect(
  weekA: number,
  dowA: number,
  weekB: number,
  dowB: number,
): Set<string> {
  const w0 = Math.min(weekA, weekB)
  const w1 = Math.max(weekA, weekB)
  const d0 = Math.min(dowA, dowB)
  const d1 = Math.max(dowA, dowB)
  const keys = new Set<string>()
  for (let w = w0; w <= w1; w++) {
    for (let d = d0; d <= d1; d++) {
      keys.add(planSlotKey(w, d))
    }
  }
  return keys
}

export function CopyPlanCanvasSessionModal({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  weekCount,
  sourceWeekIndex,
  sourceDayOfWeek,
  occupiedSlots = {},
}: CopyPlanCanvasSessionModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    weekIndex: number
    dayOfWeek: number
    moved: boolean
  } | null>(null)
  const draftRef = useRef<Set<string> | null>(null)
  const [draftKeys, setDraftKeys] = useState<Set<string> | null>(null)

  const sourceKey = planSlotKey(sourceWeekIndex, sourceDayOfWeek)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSelected(new Set())
    setDraftKeys(null)
    draftRef.current = null
    dragRef.current = null
  }, [open, sessionId])

  const weeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i),
    [weekCount],
  )

  const selectedCount = selected.size

  function slotFromPoint(
    clientX: number,
    clientY: number,
  ): { weekIndex: number; dayOfWeek: number } | null {
    const el = document.elementFromPoint(clientX, clientY)
    if (!(el instanceof Element)) return null
    const cell = el.closest('[data-copy-slot]')
    if (!(cell instanceof HTMLElement)) return null
    const w = Number(cell.dataset.copyWeek)
    const d = Number(cell.dataset.copyDow)
    if (!Number.isFinite(w) || !Number.isFinite(d)) return null
    return { weekIndex: w, dayOfWeek: d }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const slot = slotFromPoint(e.clientX, e.clientY)
    if (!slot) return
    e.preventDefault()
    gridRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      weekIndex: slot.weekIndex,
      dayOfWeek: slot.dayOfWeek,
      moved: false,
    }
    const next = keysInRect(
      slot.weekIndex,
      slot.dayOfWeek,
      slot.weekIndex,
      slot.dayOfWeek,
    )
    draftRef.current = next
    setDraftKeys(next)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const slot = slotFromPoint(e.clientX, e.clientY)
    if (!slot) return
    if (
      !drag.moved &&
      (slot.weekIndex !== drag.weekIndex || slot.dayOfWeek !== drag.dayOfWeek)
    ) {
      drag.moved = true
    }
    const next = keysInRect(
      drag.weekIndex,
      drag.dayOfWeek,
      slot.weekIndex,
      slot.dayOfWeek,
    )
    draftRef.current = next
    setDraftKeys(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const draft = draftRef.current
    dragRef.current = null
    draftRef.current = null
    setDraftKeys(null)
    try {
      gridRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (!draft || draft.size === 0) return

    if (!drag.moved && draft.size === 1) {
      const key = [...draft][0]!
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      return
    }

    setSelected((prev) => {
      const next = new Set(prev)
      for (const key of draft) next.add(key)
      return next
    })
  }

  function onPointerCancel(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    draftRef.current = null
    setDraftKeys(null)
  }

  function handleCopy() {
    if (selectedCount === 0) return
    setError(null)
    const slots = [...selected].map((key) => {
      const [, w, d] = key.split(':')
      return { weekIndex: Number(w), dayOfWeek: Number(d) }
    })
    startTransition(async () => {
      try {
        await copyTrainingPlanSessionToSlots({ sessionId, slots })
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(toUserMessage(err, 'Could not copy session'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Copy workout</DialogTitle>
          <DialogDescription>
            Drag across days to select a range (or click to toggle). Copy “
            {sessionTitle}” to the selected plan days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <FormError message={error} />
          <div className="overflow-x-auto">
            <div
              ref={gridRef}
              className="min-w-[28rem] touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <div className="py-1" />
                {DAY_OF_WEEK_SHORT.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-1 space-y-1">
                {weeks.map((weekIndex) => (
                  <div
                    key={weekIndex}
                    className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1"
                  >
                    <div className="flex items-center text-[11px] font-semibold tabular-nums text-muted-foreground">
                      W{weekIndex + 1}
                    </div>
                    {DAY_OF_WEEK_SHORT.map((_, dayOfWeek) => {
                      const key = planSlotKey(weekIndex, dayOfWeek)
                      const isDraft = draftKeys?.has(key) ?? false
                      const isSelected = selected.has(key) || isDraft
                      const isSource = key === sourceKey
                      const occupied = occupiedSlots[key] ?? 0
                      return (
                        <button
                          key={key}
                          type="button"
                          data-copy-slot=""
                          data-copy-week={weekIndex}
                          data-copy-dow={dayOfWeek}
                          className={cn(
                            'flex min-h-[2.5rem] flex-col items-center justify-center rounded-md border px-1 py-1 text-center transition',
                            'border-border bg-card hover:border-foreground/35',
                            isSelected &&
                              'border-foreground/55 bg-[var(--tt-sidebar,#f5f5f5)] ring-1 ring-foreground/20',
                            isDraft && !selected.has(key) && 'ring-foreground/35',
                            isSource &&
                              !isSelected &&
                              'border-dashed border-muted-foreground/55',
                          )}
                          aria-pressed={selected.has(key)}
                          aria-label={`Week ${weekIndex + 1} ${DAY_OF_WEEK_SHORT[dayOfWeek]}${selected.has(key) ? ', selected' : ''}`}
                        >
                          {occupied > 0 ? (
                            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                              {occupied}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">
                              ·
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedCount === 0
              ? 'No days selected'
              : `${selectedCount} day${selectedCount === 1 ? '' : 's'} selected`}
            <span className="text-muted-foreground/70">
              {' '}
              · drag to select a block · click to toggle · dashed = source ·
              number = existing sessions
            </span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || selectedCount === 0}
            onClick={handleCopy}
          >
            {pending
              ? 'Copying…'
              : selectedCount === 0
                ? 'Copy'
                : `Copy to ${selectedCount} day${selectedCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
