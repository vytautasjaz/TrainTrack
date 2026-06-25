'use client'

import { useState, useTransition } from 'react'
import { GripVertical } from 'lucide-react'
import { reorderDayWorkouts } from '@/app/actions/workouts'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type TrainingDayWorkoutListProps = {
  dateKey: string
  workouts: PlanWorkoutDetail[]
  raceWorkouts: PlanWorkoutDetail[]
  isCoach: boolean
  reorderEnabled: boolean
  showEmpty: boolean
}

export function TrainingDayWorkoutList({
  dateKey,
  workouts,
  raceWorkouts,
  isCoach,
  reorderEnabled,
  showEmpty,
}: TrainingDayWorkoutListProps) {
  const [ordered, setOrdered] = useState(workouts)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReorder(dragId: string, targetId: string) {
    if (dragId === targetId) return
    const from = ordered.findIndex((w) => w.id === dragId)
    const to = ordered.findIndex((w) => w.id === targetId)
    if (from < 0 || to < 0) return

    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrdered(next)

    startTransition(async () => {
      await reorderDayWorkouts(dateKey, next.map((w) => w.id))
    })
  }

  return (
    <div className={cn('space-y-2 p-3', isPending && 'opacity-80')}>
      {raceWorkouts.map((w) => (
        <RacePlanItem key={w.id} workout={w} isCoach={isCoach} compact tableCell />
      ))}
      {ordered.map((w) => (
        <div
          key={w.id}
          className={cn(
            'flex items-stretch gap-1',
            dropTargetId === w.id &&
              draggedId &&
              draggedId !== w.id &&
              'rounded-xl ring-2 ring-brand/30',
            draggedId === w.id && 'opacity-50',
          )}
          onDragOver={(e) => {
            if (!reorderEnabled || !draggedId) return
            e.preventDefault()
            if (draggedId !== w.id) setDropTargetId(w.id)
          }}
          onDragLeave={() => {
            if (dropTargetId === w.id) setDropTargetId(null)
          }}
          onDrop={(e) => {
            if (!reorderEnabled || !draggedId) return
            e.preventDefault()
            handleReorder(draggedId, w.id)
            setDraggedId(null)
            setDropTargetId(null)
          }}
        >
          {reorderEnabled && (
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                setDraggedId(w.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', w.id)
              }}
              onDragEnd={() => {
                setDraggedId(null)
                setDropTargetId(null)
              }}
              className="mt-3 shrink-0 cursor-grab touch-none self-start rounded-md p-1 text-muted-foreground/40 hover:bg-muted/60 hover:text-muted-foreground active:cursor-grabbing"
              aria-label={`Drag to reorder ${w.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <TrainingWorkoutCard workout={w} isCoach={isCoach} className="min-w-0 flex-1" />
        </div>
      ))}
      {showEmpty && (
        <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          No workouts scheduled.
        </p>
      )}
    </div>
  )
}
