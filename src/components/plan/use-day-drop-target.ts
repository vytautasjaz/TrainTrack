'use client'

import { useState } from 'react'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { cn } from '@/lib/utils'

type UseDayDropTargetOptions = {
  dateKey: string
  /** When false, ignore drops (e.g. out-of-month cells). */
  enabled?: boolean
}

/**
 * Day-level drop target for library templates (any sport) and
 * relocating plan workouts onto another day.
 */
export function useDayDropTarget({
  dateKey,
  enabled = true,
}: UseDayDropTargetOptions) {
  const dnd = usePlanWeekDnd()
  const [isOver, setIsOver] = useState(false)

  const canDropTemplate =
    enabled && Boolean(dnd) && dnd?.dragItem?.kind === 'template'

  const canDropPlan =
    enabled &&
    dnd?.dragItem?.kind === 'plan' &&
    dnd.dragItem.dateKey !== dateKey

  const canDrop = Boolean(canDropTemplate || canDropPlan)
  const isDragging = Boolean(enabled && dnd?.dragItem)

  function onDragOver(e: React.DragEvent) {
    if (!canDrop) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = canDropTemplate ? 'copy' : 'move'
    setIsOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!canDrop) return
    // Only clear when leaving the element itself, not child enter/leave.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setIsOver(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    if (!canDrop || !dnd?.dragItem) return
    if (dnd.dragItem.kind === 'template') {
      dnd.scheduleTemplateToCell(dnd.dragItem.templateId, dateKey)
      return
    }
    dnd.moveWorkoutToCell(dnd.dragItem.id, dateKey)
  }

  const dropHighlightClass = cn(
    canDrop && isOver && 'bg-muted ring-2 ring-inset ring-foreground/25',
    canDrop && !isOver && isDragging && 'ring-1 ring-inset ring-foreground/15',
  )

  return {
    canDrop,
    isOver,
    isDragging,
    dropHighlightClass,
    dropProps: canDrop || isDragging
      ? {
          onDragOver,
          onDragLeave,
          onDrop,
        }
      : {
          onDragOver: undefined as undefined,
          onDragLeave: undefined as undefined,
          onDrop: undefined as undefined,
        },
  }
}
