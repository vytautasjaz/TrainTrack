'use client'

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { movePlanCanvasItemRelative } from '@/app/actions/training-plans'
import { usePlanCanvasDnd } from '@/components/training/plan-canvas-dnd'
import {
  DragInsertIndicator,
  insertIndexFromDragEvent,
  isMeaningfulInsert,
  targetIndexFromInsert,
} from '@/components/ui/drag-insert-indicator'
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'
import { parsePlanSlotKey } from '@/lib/training-plan'
import { cn } from '@/lib/utils'

export type PlanCanvasStackItem = {
  kind: 'session' | 'race'
  id: string
  sortOrder: number
  title: string
}

type PlanCanvasDayStackProps = {
  planId: string
  slotKey: string
  items: PlanCanvasStackItem[]
  className?: string
  renderItem: (
    item: PlanCanvasStackItem,
    meta: { isDragging: boolean },
  ) => ReactNode
}

/**
 * Same-slot reorder for plan canvas sessions + race placeholders.
 */
export function PlanCanvasDayStack({
  planId,
  slotKey,
  items,
  className,
  renderItem,
}: PlanCanvasDayStackProps) {
  const router = useRouter()
  const dnd = usePlanCanvasDnd()
  const [ordered, setOrdered] = useState(items)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const syncKey = items.map((i) => `${i.kind}:${i.id}:${i.sortOrder}`).join('|')
  useEffect(() => {
    setOrdered(items)
  }, [syncKey, items])

  const dragItem = dnd?.dragItem
  const slot = parsePlanSlotKey(slotKey)
  const draggingId =
    dragItem &&
    (dragItem.kind === 'session' || dragItem.kind === 'race') &&
    dragItem.slotKey === slotKey
      ? dragItem.id
      : null
  const draggingKind =
    dragItem?.kind === 'session' || dragItem?.kind === 'race'
      ? dragItem.kind
      : null
  const fromIndex =
    draggingId != null && draggingKind != null
      ? ordered.findIndex(
          (i) => i.id === draggingId && i.kind === draggingKind,
        )
      : -1
  const reorderActive =
    ordered.length > 1 && draggingId != null && fromIndex >= 0

  function clearInsert() {
    setInsertAt(null)
  }

  function commitInsert(from: number, nextInsertAt: number) {
    if (!slot || !isMeaningfulInsert(from, nextInsertAt)) {
      clearInsert()
      return
    }
    const moved = ordered[from]
    if (!moved) return

    const dest = targetIndexFromInsert(from, nextInsertAt)
    const next = [...ordered]
    const [row] = next.splice(from, 1)
    if (!row) return
    next.splice(dest, 0, row)
    setOrdered(next)
    clearInsert()
    setError(null)

    const neighborBefore = dest > 0 ? next[dest - 1] : null
    const neighborAfter = dest < next.length - 1 ? next[dest + 1] : null

    startTransition(async () => {
      try {
        if (neighborBefore) {
          await movePlanCanvasItemRelative({
            planId,
            weekIndex: slot.weekIndex,
            dayOfWeek: slot.dayOfWeek,
            movedId: moved.id,
            movedKind: moved.kind,
            targetId: neighborBefore.id,
            targetKind: neighborBefore.kind,
            placement: 'after',
          })
        } else if (neighborAfter) {
          await movePlanCanvasItemRelative({
            planId,
            weekIndex: slot.weekIndex,
            dayOfWeek: slot.dayOfWeek,
            movedId: moved.id,
            movedKind: moved.kind,
            targetId: neighborAfter.id,
            targetKind: neighborAfter.kind,
            placement: 'before',
          })
        }
        router.refresh()
      } catch (err) {
        setOrdered(items)
        setError(toUserMessage(err, 'Could not reorder plan day'))
      }
    })
  }

  function showInsertAt(slotIndex: number) {
    return (
      reorderActive &&
      insertAt === slotIndex &&
      fromIndex >= 0 &&
      isMeaningfulInsert(fromIndex, slotIndex)
    )
  }

  return (
    <div
      className={cn('relative flex min-h-0 flex-1 flex-col gap-1', pending && 'opacity-80', className)}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        clearInsert()
      }}
    >
      <FormError message={error} className="mb-0.5" />
      {ordered.map((item, index) => {
        const isDragging =
          draggingId === item.id && draggingKind === item.kind
        return (
          <div
            key={`${item.kind}:${item.id}`}
            className="relative"
            onDragOver={(e) => {
              if (!reorderActive) return
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              setInsertAt(insertIndexFromDragEvent(e, index))
            }}
            onDrop={(e) => {
              if (!reorderActive || fromIndex < 0) return
              e.preventDefault()
              e.stopPropagation()
              const nextSlot = insertAt ?? insertIndexFromDragEvent(e, index)
              commitInsert(fromIndex, nextSlot)
            }}
          >
            <DragInsertIndicator show={showInsertAt(index)} />
            {renderItem(item, { isDragging })}
          </div>
        )
      })}
      <div
        className={cn(
          'relative',
          reorderActive ? 'min-h-2 py-0.5' : 'h-0 overflow-hidden',
        )}
        onDragOver={(e) => {
          if (!reorderActive) return
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          setInsertAt(ordered.length)
        }}
        onDrop={(e) => {
          if (!reorderActive || fromIndex < 0) return
          e.preventDefault()
          e.stopPropagation()
          commitInsert(fromIndex, ordered.length)
        }}
      >
        <DragInsertIndicator show={showInsertAt(ordered.length)} />
      </div>
    </div>
  )
}
