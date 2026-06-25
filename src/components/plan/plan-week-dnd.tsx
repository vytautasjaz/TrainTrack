'use client'

import { createContext, useContext, useState, useTransition, type ReactNode } from 'react'
import { WorkoutType } from '@prisma/client'
import { moveWorkoutToDate } from '@/app/actions/workouts'

export type DragWorkout = {
  id: string
  sport: WorkoutType
  dateKey: string
}

type PlanWeekDndContextValue = {
  dragWorkout: DragWorkout | null
  setDragWorkout: (workout: DragWorkout | null) => void
  isMoving: boolean
  moveWorkoutToCell: (workoutId: string, dateKey: string) => void
}

const PlanWeekDndContext = createContext<PlanWeekDndContextValue | null>(null)

export function PlanWeekDndProvider({ children }: { children: ReactNode }) {
  const [dragWorkout, setDragWorkout] = useState<DragWorkout | null>(null)
  const [isMoving, startTransition] = useTransition()

  function moveWorkoutToCell(workoutId: string, dateKey: string) {
    startTransition(async () => {
      await moveWorkoutToDate(workoutId, dateKey)
      setDragWorkout(null)
    })
  }

  return (
    <PlanWeekDndContext.Provider
      value={{ dragWorkout, setDragWorkout, isMoving, moveWorkoutToCell }}
    >
      {children}
    </PlanWeekDndContext.Provider>
  )
}

export function usePlanWeekDnd() {
  return useContext(PlanWeekDndContext)
}
