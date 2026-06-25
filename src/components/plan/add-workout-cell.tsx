'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { AddWorkoutModal } from '@/components/plan/add-workout-modal'
import { DraggableWorkoutItem } from '@/components/plan/draggable-workout-item'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { AthleteAddedBadge } from '@/components/plan/athlete-added-badge'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import {
  PLAN_WORKOUT_ITEM_CLASS,
  RACE_PLAN_DOT_CLASS,
} from '@/lib/workout-display'
import { cn } from '@/lib/utils'

function planItemDot(workout: PlanWorkoutDetail) {
  if (workout.isRace) return RACE_PLAN_DOT_CLASS
  if (workout.status === 'COMPLETED') return 'bg-green-500'
  if (workout.status === 'SKIPPED') return 'bg-red-400'
  return 'bg-muted-foreground/40'
}

function AthleteWorkoutItem({
  workout,
  tableCell,
}: {
  workout: PlanWorkoutDetail
  tableCell?: boolean
}) {
  if (workout.isRace) {
    return <RacePlanItem workout={workout} isCoach={false} compact tableCell={tableCell} />
  }

  return (
    <WorkoutModalTrigger
      workout={workout}
      isCoach={false}
      className={cn(
        'group flex w-full items-start gap-1.5 rounded-md px-1 py-0.5',
        tableCell ? PLAN_WORKOUT_ITEM_CLASS : 'hover:bg-muted/40',
      )}
    >
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', planItemDot(workout))} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-xs font-medium leading-snug group-hover:text-brand">{workout.title}</p>
          <StravaSyncedIndicator workout={workout} variant="icon" />
        </div>
        {workout.selfLogged && workout.status !== 'COMPLETED' && (
          <AthleteAddedBadge className="mt-0.5" />
        )}
        <WorkoutPlanMeta workout={workout} />
      </div>
    </WorkoutModalTrigger>
  )
}

type AddWorkoutCellProps = {
  date: string
  sport: WorkoutType
  workouts: PlanWorkoutDetail[]
  isCoach: boolean
  layout?: 'table' | 'mobile'
  dragEnabled?: boolean
}

export function AddWorkoutCell({
  date,
  sport,
  workouts,
  isCoach,
  layout = 'table',
  dragEnabled = false,
}: AddWorkoutCellProps) {
  const [open, setOpen] = useState(false)
  const [isOver, setIsOver] = useState(false)
  const dnd = usePlanWeekDnd()
  const sportLabel = WORKOUT_TYPE_LABELS[sport]
  const hasWorkouts = workouts.length > 0

  const canDrop =
    dragEnabled &&
    dnd?.dragWorkout &&
    dnd.dragWorkout.sport === sport &&
    dnd.dragWorkout.dateKey !== date

  function handleDragOver(e: React.DragEvent) {
    if (!canDrop) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsOver(false)
    if (!canDrop || !dnd?.dragWorkout) return
    dnd.moveWorkoutToCell(dnd.dragWorkout.id, date)
  }

  const tableCell = layout === 'table'

  const cellClass = cn(
    'flex w-full flex-col rounded-lg transition-colors',
    tableCell
      ? 'h-full min-h-[5rem] px-1 py-2 landscape:max-lg:min-h-0 landscape:max-lg:px-0.5 landscape:max-lg:py-0.5 lg:min-h-[5rem]'
      : 'min-h-[4rem] px-1 py-2',
    canDrop && isOver && 'bg-brand/10 ring-2 ring-inset ring-brand/30',
    canDrop && !isOver && dnd?.dragWorkout && 'ring-1 ring-inset ring-brand/15',
  )

  if (hasWorkouts) {
    return (
      <div
        className={cellClass}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
      >
        <div className="space-y-1.5">
          {workouts.map((w) =>
            isCoach ? (
              <DraggableWorkoutItem
                key={w.id}
                workout={w}
                draggable={dragEnabled}
                tableCell={tableCell}
              />
            ) : (
              <AthleteWorkoutItem key={w.id} workout={w} tableCell={tableCell} />
            ),
          )}
        </div>
        {isCoach && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mt-1.5 w-fit text-muted-foreground/60 hover:text-brand"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
        {isCoach && (
          <AddWorkoutModal open={open} onOpenChange={setOpen} date={date} sport={sport} />
        )}
      </div>
    )
  }

  if (!isCoach) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        className={cn(
          'group flex w-full items-center justify-center rounded-lg transition-colors hover:bg-muted/20',
          layout === 'table' ? 'min-h-[4.5rem]' : 'min-h-[3.5rem]',
          canDrop && isOver && 'bg-brand/10 ring-2 ring-inset ring-brand/30',
          canDrop && !isOver && dnd?.dragWorkout && 'ring-1 ring-inset ring-brand/15',
        )}
        aria-label={`Add ${sportLabel} workout on ${date}`}
      >
        <Plus className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-brand/40" />
      </button>
      <AddWorkoutModal open={open} onOpenChange={setOpen} date={date} sport={sport} />
    </>
  )
}
