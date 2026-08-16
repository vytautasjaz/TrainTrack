'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { DraggableWorkoutItem } from '@/components/plan/draggable-workout-item'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type AddWorkoutCellProps = {
  date: string
  sport: WorkoutType
  workouts: PlanWorkoutDetail[]
  isCoach: boolean
  layout?: 'table' | 'mobile'
  /** Enables dragging workouts out of this cell (drop targets live on the day cell). */
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
  const sportLabel = WORKOUT_TYPE_LABELS[sport]
  const hasWorkouts = workouts.length > 0
  const tableCell = layout === 'table'

  const cellClass = cn(
    'flex w-full flex-col transition-colors',
    // Table cells: padding lives on the <td> (same as notes/events). Mobile keeps a little inset.
    tableCell
      ? 'min-h-[5rem] landscape:max-lg:min-h-0 lg:min-h-[5rem]'
      : 'min-h-[4rem] px-1 py-2',
  )

  if (hasWorkouts) {
    return (
      <div className={cellClass}>
        <div className="space-y-1">
          {workouts.map((w) => (
            <DraggableWorkoutItem
              key={w.id}
              workout={w}
              isCoach={isCoach}
              draggable={dragEnabled}
              tableCell={tableCell}
            />
          ))}
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
        className={cn(
          'group flex w-full items-center justify-center transition-colors hover:bg-muted/20',
          layout === 'table'
            ? 'h-full min-h-[4.5rem] landscape:max-lg:min-h-[2.5rem] landscape:max-lg:py-2 lg:min-h-[5rem]'
            : 'min-h-[3.5rem] rounded-lg',
        )}
        aria-label={`Add ${sportLabel} workout on ${date}`}
      >
        <Plus
          strokeWidth={1.5}
          className={cn(
            'h-5 w-5 shrink-0 transition-all',
            tableCell
              ? 'text-muted-foreground/50 group-hover:text-muted-foreground opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100'
              : 'text-muted-foreground/20 group-hover:text-muted-foreground/60',
          )}
        />
      </button>
      <WorkoutEditorDialog open={open} onOpenChange={setOpen} date={date} sport={sport} />
    </>
  )
}
