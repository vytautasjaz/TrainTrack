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
   * When true, uses a div host so nested inputs/buttons work (coach inline card edit).
   * Clicks on interactive descendants do not open the modal.
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

export function WorkoutModalTrigger({
  workout,
  isCoach,
  className,
  title,
  children,
  draggable = false,
  onDragStart,
  onDragEnd,
  nestedInteractive = false,
}: WorkoutModalTriggerProps) {
  const [open, setOpen] = useState(false)
  const suppressClick = useRef(false)

  const sharedClassName = cn(
    'text-left',
    draggable && 'cursor-grab active:cursor-grabbing',
    className,
  )

  function handleDragStart(e: React.DragEvent) {
    if (!draggable) return
    if (nestedInteractive && isNestedControlTarget(e.target)) {
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
    if (nestedInteractive && isNestedControlTarget(e.target)) return
    setOpen(true)
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

  if (nestedInteractive) {
    return (
      <>
        <div
          title={title}
          draggable={draggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleActivate}
          className={sharedClassName}
        >
          {children}
        </div>
        {modal}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        title={title}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleActivate}
        className={sharedClassName}
      >
        {children}
      </button>
      {modal}
    </>
  )
}
