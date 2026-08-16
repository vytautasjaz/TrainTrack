'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
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
   * @deprecated Always treated as true — card hosts use a div so nested
   * inputs/buttons (inline edit, review actions) work with mouse selection.
   */
  nestedInteractive?: boolean
}

function isNestedControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [data-inline-edit], [role="textbox"]',
    ),
  )
}

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
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
  /** While typing/selecting in an inline field, HTML5 drag must be off. */
  const [textFieldActive, setTextFieldActive] = useState(false)
  const suppressClick = useRef(false)
  const hostRef = useRef<HTMLDivElement>(null)

  const dragEnabled = draggable && !textFieldActive

  const sharedClassName = cn(
    'text-left',
    dragEnabled && 'cursor-grab active:cursor-grabbing',
    className,
  )

  function handleDragStart(e: React.DragEvent) {
    if (!dragEnabled) {
      e.preventDefault()
      return
    }
    if (isNestedControlTarget(e.target)) {
      e.preventDefault()
      return
    }
    suppressClick.current = true
    onDragStart?.(e)
  }

  function handleDragEnd(e: React.DragEvent) {
    onDragEnd?.(e)
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
  }

  function handleActivate(e: React.SyntheticEvent) {
    e.stopPropagation()
    if (suppressClick.current) return
    if (isNestedControlTarget(e.target)) return
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (isNestedControlTarget(e.target)) return
    e.preventDefault()
    handleActivate(e)
  }

  function handleFocusIn(e: React.FocusEvent) {
    if (isTextField(e.target)) setTextFieldActive(true)
  }

  function handleFocusOut(e: React.FocusEvent) {
    if (!isTextField(e.target)) return
    const next = e.relatedTarget
    if (next instanceof Node && hostRef.current?.contains(next) && isTextField(next)) {
      return
    }
    setTextFieldActive(false)
  }

  function handleMouseDownCapture(e: React.MouseEvent) {
    // Must clear `draggable` synchronously — waiting for React state is too late
    // and the browser will start a drag instead of placing the caret.
    if (!isTextField(e.target)) return
    setTextFieldActive(true)
    if (hostRef.current) hostRef.current.draggable = false
  }

  const modal = workout.isRace ? (
    <RaceDetailModal workout={workout} open={open} onOpenChange={setOpen} />
  ) : (
    <WorkoutDetailModal
      workout={workout}
      isCoach={isCoach}
      open={open}
      onOpenChange={setOpen}
    />
  )

  return (
    <>
      <div
        ref={hostRef}
        role="button"
        tabIndex={0}
        title={textFieldActive ? undefined : title}
        draggable={dragEnabled}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        onFocusCapture={handleFocusIn}
        onBlurCapture={handleFocusOut}
        onMouseDownCapture={handleMouseDownCapture}
        className={sharedClassName}
      >
        {children}
      </div>
      {modal}
    </>
  )
}
