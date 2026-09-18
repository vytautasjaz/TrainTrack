'use client'

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { moveDayPlanItemRelative } from '@/app/actions/workouts'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import {
  DragInsertIndicator,
  insertIndexFromDragEvent,
  isMeaningfulInsert,
  targetIndexFromInsert,
} from '@/components/ui/drag-insert-indicator'
import { canDragPlanWorkout, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'

type SameDayWorkoutStackProps = {
  dateKey: string
  workouts: PlanWorkoutDetail[]
  enabled: boolean
  className?: string
  renderItem: (workout: PlanWorkoutDetail, meta: {
    isDropTarget: boolean
    isDragging: boolean
    isLast: boolean
  }) => ReactNode
}

/**
 * Coach same-day reorder: drop a dragged plan workout onto another on the
 * same date to switch/insert order. Cross-day moves stay on DayDropSection.
 */
export function SameDayWorkoutStack({
  dateKey,
  workouts,
  enabled,
  className,
  renderItem,
}: SameDayWorkoutStackProps) {
  const router = useRouter()
  const dnd = usePlanWeekDnd()
  const [ordered, setOrdered] = useState(workouts)
  /** Insert slot 0…length while dragging over this stack. */
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const syncKey = workouts
    .map((w) => `${w.id}:${w.status}:${w.result?.logType ?? ''}:${w.sortOrder ?? 0}`)
    .join('|')
  useEffect(() => {
    setOrdered(workouts)
  }, [syncKey, workouts])

  const dragItem = dnd?.dragItem
  const draggingId =
    dragItem?.kind === 'plan' && dragItem.dateKey === dateKey
      ? dragItem.id
      : null
  const fromIndex =
    draggingId != null ? ordered.findIndex((w) => w.id === draggingId) : -1
  const reorderActive =
    enabled &&
    ordered.length > 1 &&
    draggingId != null &&
    fromIndex >= 0 &&
    canDragPlanWorkout(ordered[fromIndex]!)

  function clearInsert() {
    setInsertAt(null)
  }

  function commitInsert(from: number, nextInsertAt: number) {
    if (!isMeaningfulInsert(from, nextInsertAt)) {
      clearInsert()
      return
    }
    const dragId = ordered[from]?.id
    if (!dragId) return

    const dest = targetIndexFromInsert(from, nextInsertAt)
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(dest, 0, moved)
    setOrdered(next)
    clearInsert()
    setError(null)

    const neighborBefore = dest > 0 ? next[dest - 1] : null
    const neighborAfter = dest < next.length - 1 ? next[dest + 1] : null

    startTransition(async () => {
      try {
        if (neighborBefore) {
          await moveDayPlanItemRelative({
            dateKey,
            movedId: dragId,
            targetId: neighborBefore.id,
            placement: 'after',
          })
        } else if (neighborAfter) {
          await moveDayPlanItemRelative({
            dateKey,
            movedId: dragId,
            targetId: neighborAfter.id,
            placement: 'before',
          })
        }
        router.refresh()
      } catch (err) {
        setOrdered(workouts)
        setError(toUserMessage(err, 'Could not reorder workouts'))
      }
    })
  }

  function showInsertAt(slot: number) {
    return (
      reorderActive &&
      insertAt === slot &&
      fromIndex >= 0 &&
      isMeaningfulInsert(fromIndex, slot)
    )
  }

  function onRowDragOver(
    e: React.DragEvent<HTMLElement>,
    index: number,
  ) {
    if (!reorderActive) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setInsertAt(insertIndexFromDragEvent(e, index))
  }

  function onRowDrop(e: React.DragEvent<HTMLElement>, index: number) {
    if (!reorderActive || fromIndex < 0) return
    e.preventDefault()
    e.stopPropagation()
    const slot = insertAt ?? insertIndexFromDragEvent(e, index)
    commitInsert(fromIndex, slot)
  }

  return (
    <div
      className={cn('relative', pending && 'opacity-80', className)}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        clearInsert()
      }}
    >
      <FormError message={error} className="mb-1" />
      {ordered.map((w, index) => {
        const isDragging = draggingId === w.id

        return (
          <div
            key={w.id}
            className="relative"
            onDragOver={(e) => onRowDragOver(e, index)}
            onDrop={(e) => onRowDrop(e, index)}
          >
            {/* Line sits at the top edge = “insert before this card”. */}
            <DragInsertIndicator show={showInsertAt(index)} />
            {renderItem(w, {
              isDropTarget: showInsertAt(index) || showInsertAt(index + 1),
              isDragging,
              isLast: index === ordered.length - 1,
            })}
          </div>
        )
      })}
      {/* Explicit “after last” slot — line + hit area under the stack. */}
      <div
        className={cn(
          'relative',
          reorderActive ? 'min-h-3 py-1' : 'h-0 overflow-hidden',
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
