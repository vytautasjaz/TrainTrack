'use client'

import { useRef, useState } from 'react'
import {
  DAY_OF_WEEK_SHORT,
  planDayIndex,
  planPhaseWashBackground,
  phaseForDay,
  resolvePlanPhaseColor,
  type TrainingPlanPhaseDetail,
} from '@/lib/training-plan'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import { cn } from '@/lib/utils'

type PlanPhaseRangeGridProps = {
  weekCount: number
  phases: TrainingPlanPhaseDetail[]
  /** When editing, this phase is treated as the live selection (not a blocker). */
  editingPhaseId?: string | null
  selectionStart: number
  selectionEnd: number
  draftColor: string
  onSelectRange: (startDay: number, endDay: number) => void
}

/**
 * Minimal click-drag day picker. Existing phases show as soft washes;
 * the draft range uses the selected color.
 */
export function PlanPhaseRangeGrid({
  weekCount,
  phases,
  editingPhaseId = null,
  selectionStart,
  selectionEnd,
  draftColor,
  onSelectRange,
}: PlanPhaseRangeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    anchor: number
  } | null>(null)
  const draftRef = useRef<{ start: number; end: number } | null>(null)
  const [draftRange, setDraftRange] = useState<{
    start: number
    end: number
  } | null>(null)

  const selStart = Math.min(selectionStart, selectionEnd)
  const selEnd = Math.max(selectionStart, selectionEnd)
  const previewStart = draftRange
    ? Math.min(draftRange.start, draftRange.end)
    : selStart
  const previewEnd = draftRange
    ? Math.max(draftRange.start, draftRange.end)
    : selEnd

  const otherPhases = editingPhaseId
    ? phases.filter((p) => p.id !== editingPhaseId)
    : phases

  function dayFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY)
    if (!(el instanceof Element)) return null
    const cell = el.closest('[data-plan-day]')
    if (!(cell instanceof HTMLElement)) return null
    const raw = cell.dataset.planDay
    if (raw == null) return null
    const day = Number(raw)
    return Number.isFinite(day) ? day : null
  }

  function commit(anchor: number, end: number) {
    onSelectRange(Math.min(anchor, end), Math.max(anchor, end))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const day = dayFromPoint(e.clientX, e.clientY)
    if (day == null) return
    e.preventDefault()
    gridRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, anchor: day }
    const next = { start: day, end: day }
    draftRef.current = next
    setDraftRange(next)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const day = dayFromPoint(e.clientX, e.clientY)
    if (day == null) return
    const next = { start: drag.anchor, end: day }
    draftRef.current = next
    setDraftRange(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const end =
      dayFromPoint(e.clientX, e.clientY) ??
      draftRef.current?.end ??
      drag.anchor
    commit(drag.anchor, end)
    dragRef.current = null
    draftRef.current = null
    setDraftRange(null)
    try {
      gridRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  function onPointerCancel(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    draftRef.current = null
    setDraftRange(null)
  }

  if (weekCount <= 0) return null

  return (
    <div
      ref={gridRef}
      className="max-h-64 touch-none cursor-crosshair select-none overflow-y-auto"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        className="grid gap-y-1"
        style={{
          gridTemplateColumns: `1.5rem repeat(7, minmax(0, 1fr))`,
          columnGap: 3,
        }}
      >
        <div />
        {DAY_OF_WEEK_SHORT.map((label) => (
          <div
            key={label}
            className="pb-0.5 text-center text-[9px] font-medium text-muted-foreground/70"
          >
            {label.charAt(0)}
          </div>
        ))}

        {Array.from({ length: weekCount }, (_, weekIndex) => (
          <div key={weekIndex} className="contents">
            <div className="flex items-center justify-end pr-1 text-[9px] font-medium tabular-nums text-muted-foreground/60">
              {weekIndex + 1}
            </div>
            {DAY_OF_WEEK_SHORT.map((_, dayOfWeek) => {
              const day = planDayIndex(weekIndex, dayOfWeek)
              const inSelection = day >= previewStart && day <= previewEnd
              const occupying = phaseForDay(otherPhases, day)
              const occColor = occupying
                ? resolvePlanPhaseColor(occupying.phase, occupying.color)
                : null
              return (
                <button
                  key={day}
                  type="button"
                  data-plan-day={day}
                  tabIndex={-1}
                  title={
                    occupying
                      ? displaySeasonPhaseName(
                          occupying.phase,
                          occupying.label,
                        )
                      : `Week ${weekIndex + 1} ${DAY_OF_WEEK_SHORT[dayOfWeek]}`
                  }
                  className={cn(
                    'h-4 rounded-[4px] transition-[background-color,box-shadow,opacity]',
                    !inSelection &&
                      !occupying &&
                      'bg-[color-mix(in_oklab,var(--color-muted)_28%,white)] hover:bg-[color-mix(in_oklab,var(--color-muted)_42%,white)]',
                  )}
                  style={{
                    backgroundColor: inSelection
                      ? planPhaseWashBackground(draftColor, 42)
                      : occColor
                        ? planPhaseWashBackground(occColor, 26)
                        : undefined,
                    boxShadow: inSelection
                      ? `inset 0 0 0 1.5px ${draftColor}`
                      : undefined,
                  }}
                  onClick={(e) => e.preventDefault()}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
