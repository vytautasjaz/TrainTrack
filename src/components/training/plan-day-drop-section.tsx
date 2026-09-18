'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { WorkoutType } from '@prisma/client'
import { usePlanCanvasDnd } from '@/components/training/plan-canvas-dnd'
import { cn } from '@/lib/utils'

type PlanDayDropSectionProps = {
  slotKey: string
  sport?: WorkoutType
  enabled?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function PlanDayDropSection({
  slotKey,
  sport,
  enabled = true,
  className,
  style,
  children,
}: PlanDayDropSectionProps) {
  const dnd = usePlanCanvasDnd()
  const [isOver, setIsOver] = useState(false)

  const dragItem = dnd?.dragItem ?? null
  const sportMatches = !sport || !dragItem || dragItem.sport === sport

  const canDropTemplate =
    enabled &&
    Boolean(dnd) &&
    dragItem?.kind === 'template' &&
    sportMatches

  const canDropSession =
    enabled &&
    dragItem?.kind === 'session' &&
    dragItem.slotKey !== slotKey &&
    sportMatches

  const canDropRace =
    enabled &&
    dragItem?.kind === 'race' &&
    dragItem.slotKey !== slotKey

  const canDrop = Boolean(canDropTemplate || canDropSession || canDropRace)
  const isDragging = Boolean(
    enabled &&
      dragItem &&
      (dragItem.kind === 'race' || sportMatches),
  )

  function onDragOver(e: React.DragEvent) {
    if (!canDrop) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = canDropTemplate ? 'copy' : 'move'
    setIsOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!canDrop) return
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setIsOver(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    if (!canDrop || !dnd?.dragItem) return
    if (dnd.dragItem.kind === 'template') {
      dnd.scheduleTemplateToSlot(dnd.dragItem.templateId, slotKey)
      return
    }
    if (dnd.dragItem.kind === 'race') {
      dnd.moveRaceToSlot(dnd.dragItem.id, slotKey)
      return
    }
    dnd.moveSessionToSlot(dnd.dragItem.id, slotKey)
  }

  return (
    <section
      data-plan-slot={slotKey}
      className={cn(
        className,
        canDrop &&
          isOver &&
          'bg-[color-mix(in_oklab,var(--color-muted)_32%,var(--color-card))] ring-2 ring-inset ring-foreground/55',
        canDrop &&
          !isOver &&
          isDragging &&
          'ring-2 ring-inset ring-foreground/25',
      )}
      style={style}
      onDragOver={canDrop || isDragging ? onDragOver : undefined}
      onDragLeave={canDrop || isDragging ? onDragLeave : undefined}
      onDrop={canDrop || isDragging ? onDrop : undefined}
    >
      {children}
    </section>
  )
}
