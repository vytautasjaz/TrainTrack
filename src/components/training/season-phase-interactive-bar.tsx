'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSeasonPhaseBlockRange } from '@/app/actions/season-phases'
import {
  PHASE_GESTURE_THRESHOLD_PX,
  columnIndexFromClientX,
  dateKeysForColumnSpan,
  phaseRangeEquals,
  resizePhaseRange,
  shiftPhaseRange,
  snapTrainingBlockRange,
  type PhaseRangeKeys,
} from '@/lib/season-phase-range'
import {
  PLANNER_SPORT_TINT,
  SEASON_PHASE_LABELS,
  displaySeasonPhaseName,
  type PlannerSport,
  type SeasonPhaseBlockData,
} from '@/lib/season-planner'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'

type SeasonPhaseInteractiveBarProps = {
  block: SeasonPhaseBlockData
  colW: number
  colCount: number
  unit: 'day' | 'week'
  dayKeys: string[]
  weekStartKeys: string[]
  weekEndKeys: string[]
  onEdit: (block: SeasonPhaseBlockData) => void
}

export function SeasonPhaseInteractiveBar({
  block,
  colW,
  colCount,
  unit,
  dayKeys,
  weekStartKeys,
  weekEndKeys,
  onEdit,
}: SeasonPhaseInteractiveBarProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize-start' | 'resize-end'
    pointerId: number
    originIdx: number
    originRange: PhaseRangeKeys
    originClientX: number
    moved: boolean
  } | null>(null)
  const [preview, setPreview] = useState<PhaseRangeKeys | null>(null)
  const previewRef = useRef<PhaseRangeKeys | null>(null)

  const committed: PhaseRangeKeys = {
    startKey: toDateKey(block.startDate),
    endKey: toDateKey(block.endDate),
  }
  const displayRange = preview ?? committed

  function updatePreview(next: PhaseRangeKeys | null) {
    previewRef.current = next
    setPreview(next)
  }

  const displayStart = indexForKey(
    displayRange.startKey,
    unit,
    dayKeys,
    weekStartKeys,
  )
  const displayEnd = indexForKey(
    displayRange.endKey,
    unit,
    dayKeys,
    weekEndKeys,
  )
  const lo = Math.min(displayStart, displayEnd)
  const hi = Math.max(displayStart, displayEnd)
  const span = Math.max(1, hi - lo + 1)
  const sport = block.sport as PlannerSport

  function commitRange(next: PhaseRangeKeys) {
    if (phaseRangeEquals(next, committed)) {
      updatePreview(null)
      return
    }
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('id', block.id)
        fd.set('startDate', next.startKey)
        fd.set('endDate', next.endKey)
        await updateSeasonPhaseBlockRange(fd)
        updatePreview(null)
        router.refresh()
      } catch {
        updatePreview(null)
      }
    })
  }

  function indexAtClientX(clientX: number): number {
    const grid = rootRef.current?.offsetParent as HTMLElement | null
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    return columnIndexFromClientX(clientX, rect.left, colW, colCount)
  }

  function onPointerDown(
    event: React.PointerEvent,
    mode: 'move' | 'resize-start' | 'resize-end',
  ) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const originIdx = indexAtClientX(event.clientX)
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      originIdx,
      originRange: displayRange,
      originClientX: event.clientX,
      moved: false,
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const idx = indexAtClientX(event.clientX)
    const delta = idx - drag.originIdx
    if (!drag.moved) {
      const dx = Math.abs(event.clientX - drag.originClientX)
      if (Math.abs(delta) === 0 && dx < PHASE_GESTURE_THRESHOLD_PX) return
      drag.moved = true
    }

    if (drag.mode === 'move') {
      updatePreview(
        snapTrainingBlockRange(
          shiftPhaseRange(
            drag.originRange,
            unit === 'week' ? delta * 7 : delta,
          ),
        ),
      )
      return
    }

    const edge = drag.mode === 'resize-start' ? 'start' : 'end'
    const toKey =
      edge === 'start'
        ? unit === 'week'
          ? (weekStartKeys[idx] ?? displayRange.startKey)
          : (dayKeys[idx] ?? displayRange.startKey)
        : unit === 'week'
          ? (weekEndKeys[idx] ?? displayRange.endKey)
          : (dayKeys[idx] ?? displayRange.endKey)
    updatePreview(
      snapTrainingBlockRange(resizePhaseRange(drag.originRange, edge, toKey)),
    )
  }

  function onPointerUp(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const nextPreview = previewRef.current
    dragRef.current = null
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    if (!drag.moved) {
      updatePreview(null)
      onEdit(block)
      return
    }
    if (nextPreview) commitRange(nextPreview)
    else updatePreview(null)
  }

  return (
    <div
      ref={rootRef}
      data-no-pan
      data-phase-bar
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(block)
        }
      }}
      className={cn(
        'absolute inset-y-1.5 z-[2] overflow-hidden rounded-[5px] border text-left text-[10px] font-semibold leading-tight',
        PLANNER_SPORT_TINT[sport],
        preview && 'opacity-90 ring-1 ring-foreground/30',
      )}
      style={{ left: lo * colW + 1, width: span * colW - 2 }}
      title={`${displaySeasonPhaseName(block.phase, block.label)}${
        block.label?.trim() ? ` · ${SEASON_PHASE_LABELS[block.phase]}` : ''
      } · drag to move, edges to resize`}
    >
      <button
        type="button"
        data-no-pan
        aria-label="Resize phase start"
        className="absolute inset-y-0 left-0 z-[1] w-2 cursor-ew-resize touch-none bg-transparent"
        onPointerDown={(e) => onPointerDown(e, 'resize-start')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <button
        type="button"
        data-no-pan
        className="absolute inset-0 z-0 cursor-grab touch-none px-2 active:cursor-grabbing"
        onPointerDown={(e) => onPointerDown(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="pointer-events-none block truncate">
          {displaySeasonPhaseName(block.phase, block.label)}
        </span>
      </button>
      <button
        type="button"
        data-no-pan
        aria-label="Resize phase end"
        className="absolute inset-y-0 right-0 z-[1] w-2 cursor-ew-resize touch-none bg-transparent"
        onPointerDown={(e) => onPointerDown(e, 'resize-end')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  )
}

function indexForKey(
  key: string,
  unit: 'day' | 'week',
  dayKeys: string[],
  weekKeys: string[],
): number {
  const keys = unit === 'day' ? dayKeys : weekKeys
  const i = keys.indexOf(key)
  if (i >= 0) return i
  let best = 0
  for (let j = 0; j < keys.length; j++) {
    if (keys[j]! <= key) best = j
  }
  return best
}

type SeasonPhaseLanePaintProps = {
  sport: PlannerSport
  colW: number
  colCount: number
  unit: 'day' | 'week'
  dayKeys: string[]
  weekStartKeys: string[]
  weekEndKeys: string[]
  onPaint: (range: PhaseRangeKeys, sport: PlannerSport) => void
}

/** Drag empty lane background to paint a new phase range. */
export function SeasonPhaseLanePaint({
  sport,
  colW,
  colCount,
  unit,
  dayKeys,
  weekStartKeys,
  weekEndKeys,
  onPaint,
}: SeasonPhaseLanePaintProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    originIdx: number
    moved: boolean
  } | null>(null)
  const previewRef = useRef<{ start: number; end: number } | null>(null)
  const [preview, setPreview] = useState<{ start: number; end: number } | null>(
    null,
  )

  function indexAtClientX(clientX: number): number {
    const grid = rootRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    return columnIndexFromClientX(clientX, rect.left, colW, colCount)
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    if (!(event.target instanceof Element)) return
    if (event.target.closest('[data-phase-bar], [data-race-card], a, button')) {
      return
    }
    event.preventDefault()
    const originIdx = indexAtClientX(event.clientX)
    dragRef.current = {
      pointerId: event.pointerId,
      originIdx,
      moved: false,
    }
    const next = { start: originIdx, end: originIdx }
    previewRef.current = next
    setPreview(next)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const idx = indexAtClientX(event.clientX)
    if (!drag.moved && idx === drag.originIdx) return
    drag.moved = true
    const next = { start: drag.originIdx, end: idx }
    previewRef.current = next
    setPreview(next)
  }

  function onPointerUp(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const span = previewRef.current
    dragRef.current = null
    previewRef.current = null
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    setPreview(null)
    if (!drag.moved || !span) return
    const range = dateKeysForColumnSpan({
      startIdx: span.start,
      endIdx: span.end,
      unit,
      dayKeys,
      weekStartKeys,
      weekEndKeys,
    })
    if (range) onPaint(range, sport)
  }

  const paintLo = preview ? Math.min(preview.start, preview.end) : 0
  const paintHi = preview ? Math.max(preview.start, preview.end) : 0
  const paintSpan = paintHi - paintLo + 1

  return (
    <div
      ref={rootRef}
      data-no-pan
      className="absolute inset-x-0 bottom-0 z-[1] h-2.5 touch-none"
      title="Drag to paint a phase"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {preview ? (
        <div
          className={cn(
            'pointer-events-none absolute bottom-0 top-[-1.25rem] rounded-[5px] border border-dashed opacity-80',
            PLANNER_SPORT_TINT[sport],
          )}
          style={{
            left: paintLo * colW + 1,
            width: paintSpan * colW - 2,
          }}
        />
      ) : null}
    </div>
  )
}
