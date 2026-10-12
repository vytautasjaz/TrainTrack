'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { typography } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

const SLIDE_MS = 300
/** Trackpad / shift+wheel: accumulate before committing a week change. */
const WHEEL_COMMIT_PX = 48
/**
 * After a week commit, keep ignoring wheel until this quiet gap (one flick =
 * one week). Idle timer is refreshed by inertia, but only up to MAX below.
 */
const WHEEL_IDLE_MS = 200
/**
 * Stop extending the post-commit idle lock after this long so a noisy device
 * can’t leave swiping stuck forever — then one final idle gap unlocks.
 */
const WHEEL_LOCK_EXTEND_MAX_MS = 900

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
  /**
   * When false, skip grab cursor (e.g. week board with draggable cards —
   * empty chrome still swipes, cards keep their own drag affordance).
   */
  grabCursor?: boolean
  /**
   * Two-finger trackpad / shift+wheel horizontal scroll changes weeks.
   * Vertical page scroll is left alone when |deltaY| dominates.
   */
  wheelSwipe?: boolean
  /**
   * Lock viewport height to the active slide (weeks with fewer sessions
   * shrink instead of leaving empty space from taller neighbors).
   */
  fitActiveHeight?: boolean
  /** When false, freeze on the active slide (no pointer / wheel swipe). */
  swipeEnabled?: boolean
  /**
   * How many slides to advance per swipe / wheel commit (e.g. 4 when the
   * week board shows a multi-week pack).
   */
  step?: number
  /**
   * When false, don’t clip slide overflow (home week board needs this so
   * Mon/Sun today frames can paint into the side gutters).
   */
  clipOverflow?: boolean
}

/** Interactive / drag targets that must not start a week swipe. */
const SWIPE_IGNORE =
  'button, a, input, textarea, select, [draggable="true"], [data-week-swipe-ignore]'

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
  grabCursor = true,
  wheelSwipe = false,
  fitActiveHeight = false,
  swipeEnabled = true,
  step = 1,
  clipOverflow = true,
}: WeekSwipePaneProps) {
  const canSwipe = swipeEnabled && count > 1
  const slideStep = Math.max(1, Math.round(step))
  const stepRef = useRef(slideStep)
  stepRef.current = slideStep
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragPx, setDragPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [swipeSettling, setSwipeSettling] = useState(false)
  const [paneHeight, setPaneHeight] = useState<number | null>(null)
  /** Set synchronously in goTo so the next `active` paint keeps transition on. */
  const pendingSwipeAnim = useRef(false)
  const settleTimer = useRef<number | null>(null)
  const drag = useRef<{
    pointerId: number
    startX: number
    lastX: number
    moved: boolean
  } | null>(null)
  const activeRef = useRef(active)
  const countRef = useRef(count)
  const goToRef = useRef<(index: number) => void>(() => {})
  const wheelAcc = useRef(0)
  /** True after a wheel week-commit until the flick goes idle. */
  const wheelCommitted = useRef(false)
  const wheelCommitAt = useRef(0)
  /** When false, idle timer is no longer refreshed (past extend max). */
  const wheelExtendIdle = useRef(true)
  const wheelIdleTimer = useRef<number | null>(null)
  const settlingRef = useRef(false)
  const overscrollPrev = useRef<string | null>(null)

  activeRef.current = active
  countRef.current = count

  useLayoutEffect(() => {
    setDragPx(0)

    if (pendingSwipeAnim.current) {
      pendingSwipeAnim.current = false
      settlingRef.current = true
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => {
        settleTimer.current = null
        settlingRef.current = false
        setSwipeSettling(false)
      }, SLIDE_MS)
      return () => {
        if (settleTimer.current != null) {
          window.clearTimeout(settleTimer.current)
          settleTimer.current = null
        }
      }
    }

    // External active change (arrows / window recenter) — never animate.
    settlingRef.current = false
    setSwipeSettling(false)
  }, [active])

  const goTo = useCallback(
    (index: number) => {
      // Only block while the slide animation is running — not a long nav lock
      // (that felt “stuck” after trackpad flicks).
      if (settlingRef.current) {
        setDragPx(0)
        return
      }
      const next = Math.min(count - 1, Math.max(0, index))
      if (next === activeRef.current) {
        setDragPx(0)
        return
      }
      pendingSwipeAnim.current = true
      settlingRef.current = true
      setSwipeSettling(true)
      // Suppress trailing trackpad wheel from the same physical gesture.
      wheelCommitted.current = true
      wheelCommitAt.current = Date.now()
      wheelExtendIdle.current = true
      if (wheelIdleTimer.current != null) {
        window.clearTimeout(wheelIdleTimer.current)
      }
      wheelIdleTimer.current = window.setTimeout(() => {
        wheelAcc.current = 0
        wheelCommitted.current = false
        wheelExtendIdle.current = true
        wheelIdleTimer.current = null
      }, WHEEL_IDLE_MS)
      onActiveChange(next)
      setDragPx(0)
    },
    [count, onActiveChange],
  )
  goToRef.current = goTo

  const measureActiveHeight = useCallback(() => {
    if (!fitActiveHeight) return
    const track = trackRef.current
    if (!track) return
    const slide = track.children[active] as HTMLElement | undefined
    if (!slide) return
    const next = Math.ceil(
      Math.max(slide.scrollHeight, slide.getBoundingClientRect().height),
    )
    if (next > 0) setPaneHeight((prev) => (prev === next ? prev : next))
  }, [active, fitActiveHeight])

  useLayoutEffect(() => {
    measureActiveHeight()
  }, [measureActiveHeight, children, swipeSettling, dragging])

  useEffect(() => {
    if (!fitActiveHeight) return
    const track = trackRef.current
    const slide = track?.children[active] as HTMLElement | undefined
    if (!slide) return
    const ro = new ResizeObserver(() => measureActiveHeight())
    ro.observe(slide)
    return () => ro.disconnect()
  }, [active, fitActiveHeight, measureActiveHeight])

  // Trackpad two-finger horizontal / shift+wheel — needs non-passive listener.
  // Also block Chrome/Safari “swipe between pages” while the pointer is here.
  useEffect(() => {
    const el = viewportRef.current
    if (!el || !wheelSwipe || !canSwipe) return

    const lockHistorySwipe = () => {
      if (overscrollPrev.current != null) return
      overscrollPrev.current = document.documentElement.style.overscrollBehaviorX
      document.documentElement.style.overscrollBehaviorX = 'none'
    }
    const unlockHistorySwipe = () => {
      if (overscrollPrev.current == null) return
      document.documentElement.style.overscrollBehaviorX = overscrollPrev.current
      overscrollPrev.current = null
    }

    const endWheelGesture = () => {
      wheelAcc.current = 0
      wheelCommitted.current = false
      wheelExtendIdle.current = true
      wheelIdleTimer.current = null
    }

    const armWheelIdle = () => {
      if (wheelIdleTimer.current != null) {
        window.clearTimeout(wheelIdleTimer.current)
      }
      wheelIdleTimer.current = window.setTimeout(() => {
        endWheelGesture()
      }, WHEEL_IDLE_MS)
    }

    const onWheel = (e: WheelEvent) => {
      if (drag.current) return

      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)
      const useShiftY = e.shiftKey && absY > absX
      const dx = useShiftY ? e.deltaY : e.deltaX
      const dominant = Math.abs(dx)

      // Horizontal enough to own the gesture (and stop browser back/forward).
      const horizontalIntent =
        useShiftY || (absX >= 2 && absX >= absY * 0.55)
      if (!horizontalIntent) return

      e.preventDefault()
      e.stopPropagation()

      // Still mostly vertical noise — swallow history, don't change week yet.
      if (!useShiftY && (dominant < 4 || absX < absY)) return

      const now = Date.now()

      // Already committed this flick — swallow inertia until a real pause.
      if (wheelCommitted.current) {
        wheelAcc.current = 0
        if (wheelExtendIdle.current) {
          if (now - wheelCommitAt.current >= WHEEL_LOCK_EXTEND_MAX_MS) {
            // Stop refreshing; one final idle gap then unlock (avoids stuck).
            wheelExtendIdle.current = false
            armWheelIdle()
          } else {
            armWheelIdle()
          }
        }
        return
      }

      if (settlingRef.current) {
        wheelAcc.current = 0
        return
      }

      wheelAcc.current += dx
      armWheelIdle()

      const index = activeRef.current
      const max = countRef.current - 1
      const delta = stepRef.current
      // Natural trackpad: positive deltaX scrolls content left → next week.
      if (wheelAcc.current >= WHEEL_COMMIT_PX && index < max) {
        wheelAcc.current = 0
        wheelCommitted.current = true
        wheelCommitAt.current = now
        wheelExtendIdle.current = true
        onGestureStart?.()
        goToRef.current(index + delta)
        armWheelIdle()
      } else if (wheelAcc.current <= -WHEEL_COMMIT_PX && index > 0) {
        wheelAcc.current = 0
        wheelCommitted.current = true
        wheelCommitAt.current = now
        wheelExtendIdle.current = true
        onGestureStart?.()
        goToRef.current(index - delta)
        armWheelIdle()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerenter', lockHistorySwipe)
    el.addEventListener('pointerleave', unlockHistorySwipe)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerenter', lockHistorySwipe)
      el.removeEventListener('pointerleave', unlockHistorySwipe)
      unlockHistorySwipe()
      if (wheelIdleTimer.current != null) {
        window.clearTimeout(wheelIdleTimer.current)
        wheelIdleTimer.current = null
      }
    }
  }, [wheelSwipe, canSwipe, onGestureStart])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canSwipe) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest(SWIPE_IGNORE)) {
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
    const index = activeRef.current
    const max = countRef.current - 1

    if (dx > threshold && index > 0) {
      goTo(index - slideStep)
    } else if (dx < -threshold && index < max) {
      goTo(index + slideStep)
    } else {
      setDragPx(0)
    }
  }

  const slideWithTransition = swipeSettling && !dragging
  const heightTransition =
    fitActiveHeight && paneHeight != null && !dragging && !swipeSettling

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        'relative touch-pan-y',
        clipOverflow ? 'overflow-hidden' : 'overflow-visible',
        // Always block text selection while swiping (incl. mouse-drag on week board).
        canSwipe && 'select-none',
        canSwipe && grabCursor && 'cursor-grab',
        canSwipe && grabCursor && dragging && 'cursor-grabbing',
        className,
      )}
      style={{
        touchAction: canSwipe ? 'pan-y' : undefined,
        overscrollBehaviorX: wheelSwipe && canSwipe ? 'none' : undefined,
        height: fitActiveHeight && paneHeight != null ? paneHeight : undefined,
        transition: heightTransition
          ? `height ${SLIDE_MS}ms cubic-bezier(0.22,1,0.36,1)`
          : undefined,
      }}
    >
      <div
        ref={trackRef}
        className={cn(
          'flex will-change-transform',
          fitActiveHeight && 'items-start',
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

const NAV_BTN =
  'rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30'

/** Chevrons + week range — use on the right; put “This week” jump on the left. */
export function WeekCarouselNav({
  canPrev,
  canNext,
  isToday,
  rangeLabel,
  rangeLabelCompact,
  onPrev,
  onNext,
}: {
  canPrev: boolean
  canNext: boolean
  isToday?: boolean
  /** Week range between the arrows, e.g. “5 – 11 October 2026”. */
  rangeLabel: string
  /** Narrow screens — e.g. “5 – 11 Oct”. Falls back to rangeLabel. */
  rangeLabelCompact?: string
  onPrev: () => void
  onNext: () => void
}) {
  const compact = rangeLabelCompact ?? rangeLabel
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous week"
        className={NAV_BTN}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <span
        className={cn(
          typography.pageHeaderDescription,
          'min-w-[6.5rem] max-w-[11.5rem] truncate px-1 text-center tabular-nums text-[var(--tt-ink,#111)] sm:min-w-[9.5rem] sm:max-w-none sm:overflow-visible',
        )}
        aria-current={isToday ? 'date' : undefined}
        title={rangeLabel}
      >
        <span className="sm:hidden">{compact}</span>
        <span className="hidden sm:inline">{rangeLabel}</span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next week"
        className={NAV_BTN}
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </>
  )
}

/** Accent jump back to the current week — place on the left of the header. */
export function WeekCarouselThisWeekButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Jump to this week"
      className={cn(
        typography.eyebrow,
        'text-[var(--tt-v2-accent,#F0440A)] hover:opacity-90',
        className,
      )}
    >
      This week
    </button>
  )
}
