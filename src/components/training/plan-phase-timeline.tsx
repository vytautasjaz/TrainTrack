'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  moveTrainingPlanPhase,
  resizeTrainingPlanPhaseEdge,
} from '@/app/actions/training-plans'
import {
  PlanPhaseModal,
  type PlanPhaseModalState,
} from '@/components/training/plan-phase-modal'
import {
  formatPlanPhaseDayRange,
  planDayCount,
  resolvePlanPhaseColor,
  resizePlanPhaseInGaps,
  shiftPlanPhaseInGaps,
  type TrainingPlanPhaseDetail,
} from '@/lib/training-plan'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import { PHASE_GESTURE_THRESHOLD_PX } from '@/lib/season-phase-range'
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'

const WEEK_SQUARE_PX = 44
const WEEK_GAP_PX = 1
const TRACK_PAD_PX = 1
const DAY_WIDTH_PX = WEEK_SQUARE_PX / 7

function trackContentWidth(weekCount: number) {
  if (weekCount <= 0) return 0
  return weekCount * WEEK_SQUARE_PX + Math.max(0, weekCount - 1) * WEEK_GAP_PX
}

function trackOuterWidth(weekCount: number) {
  return trackContentWidth(weekCount) + TRACK_PAD_PX * 2
}

/** Left edge of a plan day inside the padded track. */
function dayOffsetPx(day: number) {
  const week = Math.floor(day / 7)
  const dow = day % 7
  return (
    TRACK_PAD_PX +
    week * (WEEK_SQUARE_PX + WEEK_GAP_PX) +
    dow * DAY_WIDTH_PX
  )
}

function daySpanWidthPx(startDay: number, endDay: number) {
  return dayOffsetPx(endDay) + DAY_WIDTH_PX - dayOffsetPx(startDay)
}

function isPlanDayFree(
  phases: Array<{ startDay: number; endDay: number }>,
  day: number,
): boolean {
  return !phases.some((p) => day >= p.startDay && day <= p.endDay)
}

/**
 * Largest contiguous free span inside [spanStart, spanEnd] that contains
 * originDay (or the nearest free day in the span if origin is occupied).
 */
function freeRangeAroundOrigin(args: {
  phases: Array<{ startDay: number; endDay: number }>
  spanStart: number
  spanEnd: number
  originDay: number
  dayCount: number
}): { startDay: number; endDay: number } | null {
  const lo = Math.max(0, Math.min(args.spanStart, args.spanEnd))
  const hi = Math.min(args.dayCount - 1, Math.max(args.spanStart, args.spanEnd))
  if (lo > hi) return null

  let origin = Math.min(hi, Math.max(lo, args.originDay))
  if (!isPlanDayFree(args.phases, origin)) {
    let found: number | null = null
    for (let d = 0; d <= hi - lo; d++) {
      const right = origin + d
      const left = origin - d
      if (right <= hi && isPlanDayFree(args.phases, right)) {
        found = right
        break
      }
      if (left >= lo && isPlanDayFree(args.phases, left)) {
        found = left
        break
      }
    }
    if (found == null) return null
    origin = found
  }

  let start = origin
  let end = origin
  while (start - 1 >= lo && isPlanDayFree(args.phases, start - 1)) start -= 1
  while (end + 1 <= hi && isPlanDayFree(args.phases, end + 1)) end += 1
  return { startDay: start, endDay: end }
}

/** First contiguous free run in the plan (for the Add button). */
function firstFreePhaseRange(args: {
  phases: Array<{ startDay: number; endDay: number }>
  dayCount: number
  maxDays?: number
}): { startDay: number; endDay: number } | null {
  const { phases, dayCount, maxDays = 21 } = args
  let start: number | null = null
  for (let d = 0; d < dayCount; d++) {
    if (!isPlanDayFree(phases, d)) continue
    start = d
    break
  }
  if (start == null) return null
  let end = start
  while (
    end + 1 < dayCount &&
    end - start + 1 < maxDays &&
    isPlanDayFree(phases, end + 1)
  ) {
    end += 1
  }
  return { startDay: start, endDay: end }
}

type PlanPhaseTimelineProps = {
  planId: string
  weekCount: number
  phases: TrainingPlanPhaseDetail[]
}

type PreviewRanges = Array<{ id: string; startDay: number; endDay: number }>

export function PlanPhaseTimeline({
  planId,
  weekCount,
  phases,
}: PlanPhaseTimelineProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const trackRef = useRef<HTMLDivElement>(null)
  const [phaseModal, setPhaseModal] = useState<PlanPhaseModalState>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewRanges | null>(null)
  const dayCount = planDayCount(weekCount)
  const paintRef = useRef<{
    pointerId: number
    originDay: number
    originX: number
    moved: boolean
  } | null>(null)
  const [paintRange, setPaintRange] = useState<{
    startDay: number
    endDay: number
  } | null>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize-start' | 'resize-end'
    phaseId: string
    pointerId: number
    originDay: number
    originX: number
    moved: boolean
    base: PreviewRanges
  } | null>(null)

  const displayPhases = preview
    ? phases.map((p) => {
        const r = preview.find((x) => x.id === p.id)
        return r ? { ...p, startDay: r.startDay, endDay: r.endDay } : p
      })
    : phases

  const baseRanges = (): PreviewRanges =>
    phases.map((p) => ({
      id: p.id,
      startDay: p.startDay,
      endDay: p.endDay,
    }))

  function dayAtClientX(clientX: number): number {
    const track = trackRef.current
    if (!track || dayCount <= 0) return 0
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left - TRACK_PAD_PX
    const colPitch = WEEK_SQUARE_PX + WEEK_GAP_PX
    if (colPitch <= 0) return 0
    const week = Math.min(
      weekCount - 1,
      Math.max(0, Math.floor(x / colPitch)),
    )
    const within = x - week * colPitch
    const inWeek = Math.min(WEEK_SQUARE_PX, Math.max(0, within))
    const dow = Math.min(6, Math.floor(inWeek / DAY_WIDTH_PX))
    return Math.min(dayCount - 1, Math.max(0, week * 7 + dow))
  }

  function commitRanges(next: PreviewRanges, action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setPreview(null)
        router.refresh()
      } catch (err) {
        setPreview(null)
        setError(toUserMessage(err, 'Could not update phases'))
      }
    })
  }

  function onPaintPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-phase-block]')) return
    event.preventDefault()
    const originDay = dayAtClientX(event.clientX)
    if (!isPlanDayFree(phases, originDay)) return
    paintRef.current = {
      pointerId: event.pointerId,
      originDay,
      originX: event.clientX,
      moved: false,
    }
    // Prefer the free remainder of this week on first press (Word-like click).
    const weekStart = Math.floor(originDay / 7) * 7
    const weekEnd = Math.min(dayCount - 1, weekStart + 6)
    const initial =
      freeRangeAroundOrigin({
        phases,
        spanStart: weekStart,
        spanEnd: weekEnd,
        originDay,
        dayCount,
      }) ?? { startDay: originDay, endDay: originDay }
    setPaintRange(initial)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPaintPointerMove(event: React.PointerEvent) {
    const paint = paintRef.current
    if (!paint || event.pointerId !== paint.pointerId) return
    const day = dayAtClientX(event.clientX)
    if (!paint.moved) {
      const dx = Math.abs(event.clientX - paint.originX)
      if (
        Math.floor(day / 7) === Math.floor(paint.originDay / 7) &&
        dx < PHASE_GESTURE_THRESHOLD_PX
      ) {
        return
      }
      paint.moved = true
    }
    const spanStart = Math.min(paint.originDay, day)
    const spanEnd = Math.max(paint.originDay, day)
    const next = freeRangeAroundOrigin({
      phases,
      spanStart,
      spanEnd,
      originDay: paint.originDay,
      dayCount,
    })
    if (next) setPaintRange(next)
  }

  function onPaintPointerUp(event: React.PointerEvent) {
    const paint = paintRef.current
    if (!paint || event.pointerId !== paint.pointerId) return
    paintRef.current = null
    const range = paintRange
    setPaintRange(null)
    if (!range) return
    // Re-clamp in case phases changed mid-gesture.
    const clamped = freeRangeAroundOrigin({
      phases,
      spanStart: range.startDay,
      spanEnd: range.endDay,
      originDay: paint.originDay,
      dayCount,
    })
    if (!clamped) return
    setPhaseModal({
      mode: 'create',
      startDay: clamped.startDay,
      endDay: clamped.endDay,
    })
  }

  function onBlockPointerDown(
    event: React.PointerEvent,
    phaseId: string,
    mode: 'move' | 'resize-start' | 'resize-end',
  ) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      phaseId,
      pointerId: event.pointerId,
      originDay: dayAtClientX(event.clientX),
      originX: event.clientX,
      moved: false,
      base: baseRanges(),
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onBlockPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const day = dayAtClientX(event.clientX)
    const delta = day - drag.originDay
    if (!drag.moved) {
      const dx = Math.abs(event.clientX - drag.originX)
      if (delta === 0 && dx < PHASE_GESTURE_THRESHOLD_PX) return
      drag.moved = true
    }

    if (drag.mode === 'move') {
      setPreview(
        shiftPlanPhaseInGaps({
          phases: drag.base,
          phaseId: drag.phaseId,
          deltaDays: delta,
          dayCount,
        }),
      )
      return
    }

    setPreview(
      resizePlanPhaseInGaps({
        phases: drag.base,
        phaseId: drag.phaseId,
        edge: drag.mode === 'resize-start' ? 'start' : 'end',
        toDay: day,
        dayCount,
      }),
    )
  }

  function onBlockPointerUp(
    event: React.PointerEvent,
    phase: TrainingPlanPhaseDetail,
  ) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    if (!drag.moved) {
      setPreview(null)
      setPhaseModal({ mode: 'edit', phase })
      return
    }

    const next = preview
    setPreview(null)
    if (!next) return

    if (drag.mode === 'move') {
      const before = drag.base.find((p) => p.id === drag.phaseId)
      const after = next.find((p) => p.id === drag.phaseId)
      if (!before || !after) return
      const deltaDays = after.startDay - before.startDay
      if (deltaDays === 0) return
      commitRanges(next, () =>
        moveTrainingPlanPhase({
          planId,
          phaseId: drag.phaseId,
          deltaDays,
        }),
      )
      return
    }

    const before = drag.base.find((p) => p.id === drag.phaseId)
    const after = next.find((p) => p.id === drag.phaseId)
    if (!before || !after) return
    const edge = drag.mode === 'resize-start' ? 'start' : 'end'
    const toDay = edge === 'start' ? after.startDay : after.endDay
    if (
      before.startDay === after.startDay &&
      before.endDay === after.endDay
    ) {
      return
    }
    commitRanges(next, () =>
      resizeTrainingPlanPhaseEdge({
        planId,
        phaseId: drag.phaseId,
        edge,
        toDay,
      }),
    )
  }

  const weeks = Array.from({ length: weekCount }, (_, i) => i)

  return (
    <section className="rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Training phases
          </p>
          <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
            Week map
          </p>
          <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
            Drag empty days to add a phase — partial weeks work when some days
            are already taken. Click a block to edit.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--tt-line-strong,#d4d4d4)] bg-white px-3 text-[12px] font-semibold text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
          onClick={() => {
            const range = firstFreePhaseRange({ phases, dayCount })
            if (!range) {
              setError('No empty days left in this plan')
              return
            }
            setError(null)
            setPhaseModal({
              mode: 'create',
              startDay: range.startDay,
              endDay: range.endDay,
            })
          }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Add phase
        </button>
      </div>

      <FormError message={error} className="mb-2" />

      <div className="overflow-x-auto">
        <div
          className="relative min-w-0"
          style={{ width: Math.max(trackOuterWidth(weekCount), 240) }}
        >
          <div
            className="mb-1 grid"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, ${WEEK_SQUARE_PX}px)`,
              columnGap: WEEK_GAP_PX,
              paddingInline: TRACK_PAD_PX,
            }}
          >
            {weeks.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-semibold tabular-nums text-muted-foreground"
              >
                {w + 1}
              </div>
            ))}
          </div>

          <div
            ref={trackRef}
            className="relative rounded-[8px] bg-[var(--tt-line,#e8e8e8)]"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${weekCount}, ${WEEK_SQUARE_PX}px)`,
              columnGap: WEEK_GAP_PX,
              padding: TRACK_PAD_PX,
              width: trackOuterWidth(weekCount),
            }}
            onPointerDown={onPaintPointerDown}
            onPointerMove={onPaintPointerMove}
            onPointerUp={onPaintPointerUp}
            onPointerCancel={() => {
              paintRef.current = null
              setPaintRange(null)
            }}
          >
            {weeks.map((w) => (
              <div
                key={w}
                className="aspect-square bg-[color-mix(in_oklab,var(--color-muted)_35%,white)]"
                aria-hidden
              />
            ))}

            {paintRange ? (
              <div
                className="pointer-events-none absolute z-10 rounded-[6px] border-2 border-dashed border-foreground/50 bg-foreground/10"
                style={{
                  left: dayOffsetPx(paintRange.startDay),
                  width: daySpanWidthPx(
                    paintRange.startDay,
                    paintRange.endDay,
                  ),
                  top: TRACK_PAD_PX,
                  bottom: TRACK_PAD_PX,
                }}
              />
            ) : null}

            {displayPhases.map((phase) => {
              const color = resolvePlanPhaseColor(phase.phase, phase.color)
              const rangeLabel = formatPlanPhaseDayRange(
                phase.startDay,
                phase.endDay,
              )
              return (
                <div
                  key={phase.id}
                  data-phase-block
                  className="absolute z-20 flex touch-none"
                  style={{
                    left: dayOffsetPx(phase.startDay),
                    width: daySpanWidthPx(phase.startDay, phase.endDay),
                    top: TRACK_PAD_PX,
                    bottom: TRACK_PAD_PX,
                    padding: 2,
                  }}
                >
                  <div
                    className={cn(
                      'relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden rounded-[6px] px-1 active:cursor-grabbing',
                      'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]',
                    )}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 28%, white)`,
                      color,
                    }}
                    onPointerDown={(e) =>
                      onBlockPointerDown(e, phase.id, 'move')
                    }
                    onPointerMove={onBlockPointerMove}
                    onPointerUp={(e) => onBlockPointerUp(e, phase)}
                    onPointerCancel={() => {
                      dragRef.current = null
                      setPreview(null)
                    }}
                    title={`${displaySeasonPhaseName(phase.phase, phase.label)} · ${rangeLabel}`}
                  >
                    <span
                      className="pointer-events-none truncate text-[10px] font-bold uppercase tracking-[0.04em]"
                      style={{ color }}
                    >
                      {displaySeasonPhaseName(phase.phase, phase.label)}
                    </span>
                    <button
                      type="button"
                      aria-label="Resize start"
                      className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize"
                      onPointerDown={(e) =>
                        onBlockPointerDown(e, phase.id, 'resize-start')
                      }
                      onPointerMove={onBlockPointerMove}
                      onPointerUp={(e) => onBlockPointerUp(e, phase)}
                    />
                    <button
                      type="button"
                      aria-label="Resize end"
                      className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize"
                      onPointerDown={(e) =>
                        onBlockPointerDown(e, phase.id, 'resize-end')
                      }
                      onPointerMove={onBlockPointerMove}
                      onPointerUp={(e) => onBlockPointerUp(e, phase)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <PlanPhaseModal
        planId={planId}
        weekCount={weekCount}
        phases={phases}
        state={phaseModal}
        onOpenChange={(open) => {
          if (!open) setPhaseModal(null)
        }}
      />
    </section>
  )
}
