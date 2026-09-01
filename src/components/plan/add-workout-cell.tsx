'use client'

import { useState } from 'react'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { DraggableWorkoutItem } from '@/components/plan/draggable-workout-item'
import {
  WeekAddPlusMark,
  weekAddPlusButtonClass,
} from '@/components/plan/week-add-plus'
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
    // Row min-height comes from `.tt-table-frame[data-card-size] .tt-week-sport-cell`
    !tableCell && 'min-h-[4rem] px-1 py-2',
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
          tableCell
            ? cn(weekAddPlusButtonClass.cell, 'absolute inset-0 min-h-0')
            : 'flex min-h-[3.5rem] w-full items-center justify-center rounded-lg text-[13px] text-[var(--tt-ink-faint,#9a9a9a)] opacity-40 transition hover:opacity-100',
        )}
        aria-label={`Add ${sportLabel} workout on ${date}`}
      >
        <WeekAddPlusMark size="cell" />
      </button>
      <WorkoutEditorDialog open={open} onOpenChange={setOpen} date={date} sport={sport} />
    </>
  )
}
