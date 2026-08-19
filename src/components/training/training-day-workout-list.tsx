/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState, useTransition } from 'react'
import { GripVertical } from 'lucide-react'
import { reorderDayWorkouts } from '@/app/actions/workouts'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import { canDragPlanWorkout, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'

type TrainingDayWorkoutListProps = {
  dateKey: string
  workouts: PlanWorkoutDetail[]
  raceWorkouts: PlanWorkoutDetail[]
  isCoach: boolean
  reorderEnabled: boolean
}

export function TrainingDayWorkoutList({
  dateKey,
  workouts,
  raceWorkouts,
  isCoach,
  reorderEnabled,
}: TrainingDayWorkoutListProps) {
  const dnd = usePlanWeekDnd()
  const [ordered, setOrdered] = useState(workouts)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const workoutsSyncKey = workouts
    .map((w) => `${w.id}:${w.status}:${w.result?.logType ?? ''}`)
    .join('|')

  useEffect(() => {
    setOrdered(workouts)
  }, [workoutsSyncKey, workouts])

  function handleReorder(dragId: string, targetId: string) {
    if (dragId === targetId) return
    const from = ordered.findIndex((w) => w.id === dragId)
    const to = ordered.findIndex((w) => w.id === targetId)
    if (from < 0 || to < 0) return

    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrdered(next)
    setReorderError(null)

    startTransition(async () => {
      try {
        await reorderDayWorkouts(dateKey, next.map((w) => w.id))
      } catch (error) {
        setOrdered(workouts)
        setReorderError(toUserMessage(error, 'Could not reorder workouts'))
      }
    })
  }

  return (
    <div className={cn('space-y-4 px-3 pb-3 pt-1', isPending && 'opacity-80')}>
      <FormError message={reorderError} />
      {raceWorkouts.map((w) => (
        <RacePlanItem key={w.id} workout={w} isCoach={isCoach} compact tableCell />
      ))}
      {ordered.map((w) => {
        const canDrag = canDragPlanWorkout(w)
        return (
        <div
          key={w.id}
          className={cn(
            reorderEnabled && 'flex items-stretch gap-1',
            dropTargetId === w.id &&
              draggedId &&
              draggedId !== w.id &&
              'ring-2 ring-inset ring-foreground/20',
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
                })
                e.dataTransfer.effectAllowed = 'copyMove'
                e.dataTransfer.setData('text/plain', w.id)
              }}
              onDragEnd={() => {
                setDraggedId(null)
                setDropTargetId(null)
                dnd?.setDragWorkout(null)
              }}
              className="mt-3 shrink-0 cursor-grab touch-none self-start rounded-md p-1 text-muted-foreground/40 hover:bg-muted/60 hover:text-muted-foreground active:cursor-grabbing"
              aria-label={`Drag to reorder or save ${w.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <TrainingWorkoutCard
            workout={w}
            isCoach={isCoach}
            className={cn('min-w-0', reorderEnabled && 'flex-1')}
          />
        </div>
        )
      })}
    </div>
  )
}
