'use client'

import { useState } from 'react'
import { WorkoutType } from '@prisma/client'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { cn } from '@/lib/utils'

type UseDayDropTargetOptions = {
  dateKey: string
  /**
   * Sport row this cell belongs to (week table). When set, only workouts /
   * templates of that sport may drop here.
   */
  sport?: WorkoutType
  /** When false, ignore drops (e.g. out-of-month cells). */
  enabled?: boolean
}

/**
 * Day-level drop target for library templates and relocating plan workouts.
 * In sport-divided week mode, drops stay on the matching sport row.
 */
export function useDayDropTarget({
  dateKey,
  sport,
  enabled = true,
}: UseDayDropTargetOptions) {
  const dnd = usePlanWeekDnd()
  const [isOver, setIsOver] = useState(false)

  const dragItem = dnd?.dragItem ?? null
  const sportMatches = !sport || !dragItem || dragItem.sport === sport

  const canDropTemplate =
    enabled &&
    Boolean(dnd) &&
    dnd?.mode === 'coach' &&
    dragItem?.kind === 'template' &&
    sportMatches

  const canDropPlan =
    enabled &&
    dragItem?.kind === 'plan' &&
    dragItem.dateKey !== dateKey &&
    sportMatches

  const canDrop = Boolean(canDropTemplate || canDropPlan)
  const isDragging = Boolean(enabled && dragItem && sportMatches)

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
    canDrop &&
      isOver &&
      'bg-[color-mix(in_oklab,var(--color-muted)_32%,var(--color-card))] ring-2 ring-inset ring-foreground/55',
    canDrop &&
      !isOver &&
      isDragging &&
      'ring-2 ring-inset ring-foreground/25',
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
