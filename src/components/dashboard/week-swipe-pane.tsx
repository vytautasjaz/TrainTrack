'use client'

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const SLIDE_MS = 300

/** Soft resistance past first/last slide — same as Upcoming races. */
function rubberBand(dx: number, atStart: boolean, atEnd: boolean): number {
  if ((atStart && dx > 0) || (atEnd && dx < 0)) {
    return dx * 0.35
  }
  return dx
}

type WeekSwipePaneProps = {
  /** Active slide index (0-based). */
  active: number
  /** Total slide count. */
  count: number
  onActiveChange: (index: number) => void
  /** Called at the start of a swipe gesture (before rubber-band drag). */
  onGestureStart?: () => void
  children: ReactNode
  className?: string
}

/**
 * Horizontal week carousel — same gesture model as Upcoming races.
 * Slide transition runs ONLY for swipe settles; external `active` changes
 * (arrow clicks / pane sync) always jump with no horizontal animation.
 */
export function WeekSwipePane({
  active,
  count,
  onActiveChange,
  onGestureStart,
  children,
  className,
}: WeekSwipePaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [dragPx, setDragPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [swipeSettling, setSwipeSettling] = useState(false)
  /** Set synchronously in goTo so the next `active` paint keeps transition on. */
  const pendingSwipeAnim = useRef(false)
  const settleTimer = useRef<number | null>(null)
  const drag = useRef<{
    pointerId: number
    startX: number
    lastX: number
    moved: boolean
  } | null>(null)

  useLayoutEffect(() => {
    setDragPx(0)

    if (pendingSwipeAnim.current) {
      pendingSwipeAnim.current = false
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => {
        settleTimer.current = null
        setSwipeSettling(false)
      }, SLIDE_MS)
      return () => {
        if (settleTimer.current != null) {
          window.clearTimeout(settleTimer.current)
          settleTimer.current = null
        }
      }
    }

    // External active change (arrows) — never animate.
    setSwipeSettling(false)
  }, [active])

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(count - 1, Math.max(0, index))
      if (next === active) {
        setDragPx(0)
        return
      }
      pendingSwipeAnim.current = true
      setSwipeSettling(true)
      onActiveChange(next)
      setDragPx(0)
    },
    [active, count, onActiveChange],
  )

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (count < 2) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) {
      return
    }
    const el = viewportRef.current
    if (!el) return
    onGestureStart?.()
    pendingSwipeAnim.current = false
    if (settleTimer.current != null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
    setDragging(true)
    setSwipeSettling(false)
    setDragPx(0)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || e.pointerId !== state.pointerId) return
    const raw = e.clientX - state.startX
    if (Math.abs(raw) > 6) state.moved = true
    state.lastX = e.clientX
    const atStart = active <= 0
    const atEnd = active >= count - 1
    setDragPx(rubberBand(raw, atStart, atEnd))
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    const el = viewportRef.current
    if (!state || e.pointerId !== state.pointerId) return
    drag.current = null
    setDragging(false)
    try {
      el?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    const width = Math.max(1, el?.clientWidth ?? 1)
    const threshold = Math.min(72, width * 0.18)
    const dx = state.moved ? state.lastX - state.startX : 0

    if (dx > threshold && active > 0) {
      goTo(active - 1)
    } else if (dx < -threshold && active < count - 1) {
      goTo(active + 1)
    } else {
      setDragPx(0)
    }
  }

  const slideWithTransition = swipeSettling && !dragging

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        'relative overflow-hidden touch-pan-y',
        count > 1 && 'cursor-grab select-none',
        dragging && 'cursor-grabbing',
        className,
      )}
      style={{ touchAction: count > 1 ? 'pan-y' : undefined }}
    >
      <div
        className={cn(
          'flex will-change-transform',
          slideWithTransition
            ? 'transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]'
            : 'transition-none',
        )}
        style={{
          transform: `translate3d(calc(${-active * 100}% + ${dragPx}px), 0, 0)`,
          transitionDuration: slideWithTransition ? `${SLIDE_MS}ms` : '0ms',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Full-width carousel slide wrapper — use as direct child of WeekSwipePane. */
export function WeekSwipeSlide({
  children,
  active,
}: {
  children: ReactNode
  active: boolean
}) {
  return (
    <div className="w-full min-w-full shrink-0" aria-hidden={!active}>
      {children}
    </div>
  )
}
