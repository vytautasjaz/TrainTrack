'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getExerciseDetail,
  type ExerciseDetailDto,
} from '@/app/actions/exercises'
import { ExercisePosePair } from '@/components/exercises/exercise-pose-sequence'
import {
  formatExerciseLabel,
  formatExerciseMetaLine,
} from '@/components/exercises/format-exercise-meta'
import { cn } from '@/lib/utils'

type Placement = {
  top: number
  left: number
  width: number
  maxHeight: number
}

type ExercisePreviewProps = {
  exerciseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Anchor element for desktop floating panel. */
  anchorRef?: React.RefObject<HTMLElement | null>
  onViewDetails: () => void
}

const VIEWPORT_PAD = 8
const PANEL_GAP = 6
const PANEL_WIDTH = 300
const PANEL_MAX_H = 448 // 28rem

function useIsCompact() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    function sync() {
      setCompact(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return compact
}

function computePlacement(
  el: HTMLElement,
  measuredHeight?: number,
): Placement {
  const rect = el.getBoundingClientRect()
  const width = PANEL_WIDTH
  let left = rect.left
  left = Math.min(left, window.innerWidth - width - VIEWPORT_PAD)
  left = Math.max(VIEWPORT_PAD, left)

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD
  const spaceAbove = rect.top - VIEWPORT_PAD
  const preferredH = Math.min(
    PANEL_MAX_H,
    Math.max(measuredHeight ?? 360, 280),
  )
  const openDown =
    spaceBelow >= preferredH + PANEL_GAP || spaceBelow >= spaceAbove
  const maxHeight = Math.max(
    200,
    Math.min(PANEL_MAX_H, openDown ? spaceBelow : spaceAbove),
  )
  const usedH = Math.min(preferredH, maxHeight)

  return {
    left,
    width,
    maxHeight,
    top: openDown
      ? rect.bottom + PANEL_GAP
      : Math.max(VIEWPORT_PAD, rect.top - PANEL_GAP - usedH),
  }
}

/**
 * Radix Dialog scroll-lock swallows wheel on body-portaled panels.
 * Apply delta ourselves and stop the event so the parent dialog doesn't move.
 */
function handlePortaledWheel(event: React.WheelEvent<HTMLDivElement>) {
  event.stopPropagation()
  const el = event.currentTarget
  if (el.scrollHeight <= el.clientHeight + 1) return
  const before = el.scrollTop
  el.scrollTop += event.deltaY
  if (el.scrollTop !== before) {
    event.preventDefault()
  }
}

function PreviewBody({
  detail,
  loading,
  onViewDetails,
  onClose,
}: {
  detail: ExerciseDetailDto | null
  loading: boolean
  onViewDetails: () => void
  onClose?: () => void
}) {
  const cues = (detail?.coachingCues ?? []).slice(0, 4)
  const muscles = (detail?.primaryMuscles ?? []).slice(0, 4)

  return (
    <div className="flex flex-col">
      <div className="relative border-b border-[var(--tt-v2-light-panel-line,#E3E6E9)]">
        {loading && !detail ? (
          <div className="aspect-[2/1] w-full animate-pulse rounded-t-[8px] bg-[var(--tt-v2-light,#F5F6F7)]" />
        ) : (
          <ExercisePosePair
            media={detail?.media ?? null}
            alt={detail?.canonicalName ?? 'Exercise'}
            className="rounded-t-[8px]"
          />
        )}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 rounded-md bg-black/50 p-1 text-white/90 transition hover:bg-black/70"
            aria-label="Close preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-2.5 p-3.5">
        {loading && !detail ? (
          <>
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--tt-v2-light,#F5F6F7)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--tt-v2-light,#F5F6F7)]" />
          </>
        ) : detail ? (
          <>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--tt-ink,#111315)]">
                {detail.canonicalName}
              </h3>
              <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b7280)]">
                {formatExerciseMetaLine([
                  detail.movementPattern,
                  detail.equipment[0],
                ]) || detail.category}
              </p>
            </div>

            {muscles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-[4px] bg-[var(--tt-v2-light,#F5F6F7)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--tt-ink-soft,#6b7280)]"
                  >
                    {formatExerciseLabel(m)}
                  </span>
                ))}
              </div>
            ) : null}

            {cues.length > 0 ? (
              <ul className="space-y-1">
                {cues.map((cue) => (
                  <li
                    key={cue}
                    className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--tt-ink,#111315)]"
                  >
                    <Check
                      className="mt-0.5 h-3 w-3 shrink-0 text-[var(--tt-good,#16a34a)]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            ) : detail.shortDescription ? (
              <p className="text-[12px] leading-snug text-[var(--tt-ink-soft,#6b7280)]">
                {detail.shortDescription}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onViewDetails}
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--tt-ink,#111315)] transition hover:opacity-70"
            >
              View exercise details
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function ExercisePreview({
  exerciseId,
  open,
  onOpenChange,
  anchorRef,
  onViewDetails,
}: ExercisePreviewProps) {
  const compact = useIsCompact()
  const panelRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ExerciseDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open || !exerciseId) {
      setDetail(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setDetail(null)
    setLoading(true)
    void getExerciseDetail(exerciseId)
      .then((next) => {
        if (cancelled) return
        if (!next) {
          setDetail(null)
          onOpenChange(false)
          return
        }
        setDetail(next)
      })
      .catch(() => {
        if (cancelled) return
        setDetail(null)
        onOpenChange(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, exerciseId, onOpenChange])

  useLayoutEffect(() => {
    if (!open || compact || !anchorRef?.current) {
      setPlacement(null)
      return
    }
    function place(event?: Event) {
      // Scrolling inside the panel must not reposition (that kills wheel scroll).
      if (
        event?.type === 'scroll' &&
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      ) {
        return
      }
      const el = anchorRef?.current
      if (!el) return
      const measured = panelRef.current?.scrollHeight
      const next = computePlacement(el, measured)
      setPlacement((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next,
      )
    }
    place()
    const frame = requestAnimationFrame(() => place())
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, compact, anchorRef, detail, loading])

  useEffect(() => {
    if (!open || compact) return
    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 0)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    function onPointer(e: PointerEvent) {
      if (!armed) return
      const t = e.target
      if (!(t instanceof Node)) return
      if (anchorRef?.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [open, compact, onOpenChange, anchorRef])

  // No empty “unavailable” tooltip — only show once we have detail.
  if (!open || !detail) return null

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="z-[320] max-h-[85vh] max-w-sm overflow-y-auto p-0"
          overlayClassName="z-[310] bg-black/40"
          hideCloseButton
        >
          <DialogTitle className="sr-only">
            {detail.canonicalName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quick exercise preview
          </DialogDescription>
          <PreviewBody
            detail={detail}
            loading={false}
            onViewDetails={() => {
              onOpenChange(false)
              onViewDetails()
            }}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    )
  }

  if (!portalReady || !placement) return null

  return createPortal(
    <div
      ref={panelRef}
      data-tt-exercise-preview=""
      role="dialog"
      aria-label={detail.canonicalName}
      className={cn(
        'pointer-events-auto fixed z-[320] flex flex-col overflow-hidden rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white shadow-lg',
      )}
      style={{
        top: placement.top,
        left: placement.left,
        width: placement.width,
        maxHeight: placement.maxHeight,
      }}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheel={handlePortaledWheel}
      >
        <PreviewBody
          detail={detail}
          loading={false}
          onClose={() => onOpenChange(false)}
          onViewDetails={() => {
            onOpenChange(false)
            onViewDetails()
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
