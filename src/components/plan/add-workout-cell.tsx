'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { DraggableWorkoutItem } from '@/components/plan/draggable-workout-item'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { athleteHasQuickLogActions, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutBlock } from '@/components/workout-block'
import {
  PLAN_WORKOUT_ITEM_CLASS,
} from '@/lib/workout-display'
import { cn } from '@/lib/utils'

function AthleteWorkoutItem({
  workout,
  tableCell,
}: {
  workout: PlanWorkoutDetail
  tableCell?: boolean
}) {
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const showQuickActions = athleteHasQuickLogActions(workout, false)

  if (workout.isRace) {
    return <RacePlanItem workout={workout} isCoach={false} compact tableCell={tableCell} />
  }

  return (
    <div className="group/card relative w-full min-w-0">
      <WorkoutModalTrigger
        workout={workout}
        isCoach={false}
        className={cn(
          'block w-full min-w-0',
          tableCell ? PLAN_WORKOUT_ITEM_CLASS : undefined,
        )}
      >
        <WorkoutBlock
          workout={workout}
          density="md"
          status={status}
          hideCompletedBadge={showQuickActions}
          actions={
            showQuickActions ? (
              <span className="inline-block w-[2.75rem]" aria-hidden />
            ) : null
          }
        />
      </WorkoutModalTrigger>
      {showQuickActions ? (
        <div className="absolute right-1 top-1 z-10 opacity-60 transition group-hover/card:opacity-100">
          <AthleteWorkoutQuickActions
            workout={workout}
            isCoach={false}
            size="xs"
            displayStatus={status}
            onDisplayStatusChange={setOptimisticStatus}
          />
        </div>
      ) : null}
    </div>
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

  const canDropPlan =
    dragEnabled &&
    dnd?.dragItem?.kind === 'plan' &&
    dnd.dragItem.sport === sport &&
    dnd.dragItem.dateKey !== date

  const canDropTemplate =
    dragEnabled &&
    dnd?.dragItem?.kind === 'template' &&
    dnd.dragItem.sport === sport

  const canDrop = Boolean(canDropPlan || canDropTemplate)
  const isDraggingSomething = Boolean(dnd?.dragItem)

  function handleDragOver(e: React.DragEvent) {
    if (!canDrop) return
    e.preventDefault()
    e.dataTransfer.dropEffect = canDropTemplate ? 'copy' : 'move'
    setIsOver(true)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsOver(false)
    if (!canDrop || !dnd?.dragItem) return
    if (dnd.dragItem.kind === 'plan') {
      dnd.moveWorkoutToCell(dnd.dragItem.id, date)
      return
    }
    dnd.scheduleTemplateToCell(dnd.dragItem.templateId, date)
  }

  const tableCell = layout === 'table'

  const cellClass = cn(
    'flex w-full flex-col rounded-lg transition-colors',
    tableCell
      ? 'min-h-[5rem] px-1 py-2 landscape:max-lg:min-h-0 landscape:max-lg:px-0.5 landscape:max-lg:py-0.5 lg:min-h-[5rem]'
      : 'min-h-[4rem] px-1 py-2',
    canDrop && isOver && 'bg-muted ring-2 ring-inset ring-foreground/25',
    canDrop && !isOver && isDraggingSomething && 'ring-1 ring-inset ring-foreground/15',
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
          layout === 'table'
            ? 'h-full min-h-[4.5rem] landscape:max-lg:min-h-[2.5rem] landscape:max-lg:py-2 lg:min-h-[5rem]'
            : 'min-h-[3.5rem]',
          canDrop && isOver && 'bg-muted ring-2 ring-inset ring-foreground/25',
          canDrop && !isOver && isDraggingSomething && 'ring-1 ring-inset ring-foreground/15',
        )}
        aria-label={`Add ${sportLabel} workout on ${date}`}
      >
        <Plus
          strokeWidth={1.5}
          className={cn(
            'h-5 w-5 shrink-0 transition-all',
            tableCell
              ? // Match month view: visible on touch; on hover devices only after cell hover
                'text-muted-foreground/50 group-hover:text-muted-foreground opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100'
              : 'text-muted-foreground/20 group-hover:text-muted-foreground/60',
          )}
        />
      </button>
      <WorkoutEditorDialog open={open} onOpenChange={setOpen} date={date} sport={sport} />
    </>
  )
}
