'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { cn } from '@/lib/utils'

type WorkoutModalTriggerProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  className?: string
  title?: string
  children: ReactNode
  /** Whole-card drag (coach plan DnD). Click opens modal unless a drag just finished. */
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  /**
   * @deprecated Card hosts use a div so nested buttons (review actions, menus) work.
   */
  nestedInteractive?: boolean
}

const DRAG_CLICK_THRESHOLD_PX = 6

function isNestedControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [data-inline-edit], [role="textbox"]',
    ),
  )
}

export function WorkoutModalTrigger({
  workout,
  isCoach,
  className,
  title,
  children,
  draggable = false,
  onDragStart,
  onDragEnd,
}: WorkoutModalTriggerProps) {
  const [open, setOpen] = useState(false)
  const suppressClick = useRef(false)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const pointerMovedRef = useRef(false)
  const openedThisGestureRef = useRef(false)

  const sharedClassName = cn(
    'text-left',
    draggable && 'cursor-grab active:cursor-grabbing',
    className,
  )

  function handleDragStart(e: React.DragEvent) {
    if (!draggable) {
      e.preventDefault()
      return
    }
    if (isNestedControlTarget(e.target)) {
      e.preventDefault()
      return
    }
    suppressClick.current = true
    pointerMovedRef.current = true
    onDragStart?.(e)
  }

  function handleDragEnd(e: React.DragEvent) {
    onDragEnd?.(e)
    window.setTimeout(() => {
      suppressClick.current = false
      pointerMovedRef.current = false
    }, 0)
  }

  function tryOpenModal(e: React.SyntheticEvent) {
    e.stopPropagation()
    if (openedThisGestureRef.current) return
    if (suppressClick.current || pointerMovedRef.current) return
    if (isNestedControlTarget(e.target)) return
    openedThisGestureRef.current = true
    setOpen(true)
  }

  function handlePointerDown(e: React.PointerEvent) {
    openedThisGestureRef.current = false
    if (isNestedControlTarget(e.target)) {
      pointerDownRef.current = null
      return
    }
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
    pointerMovedRef.current = false
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = pointerDownRef.current
    if (!start || pointerMovedRef.current) return
    const dx = Math.abs(e.clientX - start.x)
    const dy = Math.abs(e.clientY - start.y)
    if (dx > DRAG_CLICK_THRESHOLD_PX || dy > DRAG_CLICK_THRESHOLD_PX) {
      pointerMovedRef.current = true
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointerDownRef.current = null
    if (e.button !== 0) return
    // Draggable cards often skip the click event; treat a stationary pointer-up as a tap.
    if (draggable) tryOpenModal(e)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (isNestedControlTarget(e.target)) return
    e.preventDefault()
    tryOpenModal(e)
  }

  const modal = (
    <PlanWorkoutModal
      workout={workout}
      isCoach={isCoach}
      open={open}
      onOpenChange={setOpen}
    />
  )

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        title={title}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={tryOpenModal}
        onKeyDown={handleKeyDown}
        className={sharedClassName}
      >
        {children}
      </div>
      {modal}
    </>
  )
}
