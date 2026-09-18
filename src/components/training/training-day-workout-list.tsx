'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import { moveDayPlanItemRelative } from '@/app/actions/workouts'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
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

type TrainingDayWorkoutListProps = {
  dateKey: string
  /** Workouts + races already interleaved by sortOrder. */
  workouts: PlanWorkoutDetail[]
  isCoach: boolean
  reorderEnabled: boolean
}

export function TrainingDayWorkoutList({
  dateKey,
  workouts,
  isCoach,
  reorderEnabled,
}: TrainingDayWorkoutListProps) {
  const router = useRouter()
  const dnd = usePlanWeekDnd()
  const [ordered, setOrdered] = useState(workouts)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const workoutsSyncKey = workouts
    .map((w) => `${w.id}:${w.status}:${w.result?.logType ?? ''}:${w.sortOrder ?? 0}`)
    .join('|')

  useEffect(() => {
    setOrdered(workouts)
  }, [workoutsSyncKey, workouts])

  const fromIndex =
    draggedId != null ? ordered.findIndex((w) => w.id === draggedId) : -1
  const active = reorderEnabled && draggedId != null && fromIndex >= 0

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
    setReorderError(null)

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
      } catch (error) {
        setOrdered(workouts)
        setReorderError(toUserMessage(error, 'Could not reorder plan items'))
      }
    })
  }

  function showInsertAt(slot: number) {
    return (
      active &&
      insertAt === slot &&
      fromIndex >= 0 &&
      isMeaningfulInsert(fromIndex, slot)
    )
  }

  return (
    <div
      className={cn('space-y-4 px-3 pb-3 pt-1', isPending && 'opacity-80')}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        clearInsert()
      }}
    >
      <FormError message={reorderError} />
      <div className="relative space-y-4">
        {ordered.map((w, index) => {
          const canDrag = canDragPlanWorkout(w)
          const isRace = Boolean(w.isRace)
          return (
            <div
              key={w.id}
              className={cn(
                'relative',
                reorderEnabled && 'flex items-stretch gap-1',
                draggedId === w.id && 'opacity-50',
              )}
              onDragOver={(e) => {
                if (!active) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setInsertAt(insertIndexFromDragEvent(e, index))
              }}
              onDrop={(e) => {
                if (!active || fromIndex < 0) return
                e.preventDefault()
                const slot = insertAt ?? insertIndexFromDragEvent(e, index)
                commitInsert(fromIndex, slot)
                setDraggedId(null)
                clearInsert()
              }}
            >
              <DragInsertIndicator show={showInsertAt(index)} />
              {reorderEnabled && canDrag && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setDraggedId(w.id)
                    dnd?.setDragWorkout({
                      id: w.id,
                      sport: w.type,
                      dateKey: w.dateKey,
                      isRace,
                    })
                    e.dataTransfer.effectAllowed = 'copyMove'
                    e.dataTransfer.setData('text/plain', w.id)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    clearInsert()
                    dnd?.setDragWorkout(null)
                  }}
                  className="mt-3 shrink-0 cursor-grab touch-none self-start rounded-md p-1 text-muted-foreground/40 hover:bg-muted/60 hover:text-muted-foreground active:cursor-grabbing"
                  aria-label={`Drag to reorder ${w.title}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {isRace ? (
                <RacePlanItem
                  workout={w}
                  isCoach={isCoach}
                  compact
                  tableCell
                  className={cn('min-w-0', reorderEnabled && 'flex-1')}
                />
              ) : (
                <TrainingWorkoutCard
                  workout={w}
                  isCoach={isCoach}
                  className={cn('min-w-0', reorderEnabled && 'flex-1')}
                />
              )}
            </div>
          )
        })}
        <div
          className={cn(
            'relative',
            active ? 'min-h-4 py-1' : 'h-0 overflow-hidden',
          )}
          onDragOver={(e) => {
            if (!active) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setInsertAt(ordered.length)
          }}
          onDrop={(e) => {
            if (!active || fromIndex < 0) return
            e.preventDefault()
            commitInsert(fromIndex, ordered.length)
            setDraggedId(null)
            clearInsert()
          }}
        >
          <DragInsertIndicator show={showInsertAt(ordered.length)} />
        </div>
      </div>
    </div>
  )
}
