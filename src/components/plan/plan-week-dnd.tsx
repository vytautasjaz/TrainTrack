'use client'

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { WorkoutType } from '@prisma/client'
import {
  moveWorkoutToDate,
  createWorkoutFromTemplate,
  createTemplateFromWorkout,
  rescheduleWorkout,
} from '@/app/actions/workouts'

export type DragPlanWorkout = {
  kind: 'plan'
  id: string
  sport: WorkoutType
  dateKey: string
}

export type DragLibraryTemplate = {
  kind: 'template'
  templateId: string
  sport: WorkoutType
}

export type DragItem = DragPlanWorkout | DragLibraryTemplate

/** @deprecated Prefer DragItem — kept for gradual migration of callers. */
export type DragWorkout = {
  id: string
  sport: WorkoutType
  dateKey: string
}

type PlanWeekDndMode = 'coach' | 'athlete'

type PlanWeekDndContextValue = {
  mode: PlanWeekDndMode
  dragItem: DragItem | null
  setDragItem: (item: DragItem | null) => void
  /** Plan-workout drag only (legacy shape). */
  dragWorkout: DragPlanWorkout | null
  setDragWorkout: (workout: DragWorkout | null) => void
  isMoving: boolean
  moveWorkoutToCell: (workoutId: string, dateKey: string) => void
  scheduleTemplateToCell: (templateId: string, dateKey: string) => void
  savePlanWorkoutToLibrary: (workoutId: string) => void
}

const PlanWeekDndContext = createContext<PlanWeekDndContextValue | null>(null)

export function PlanWeekDndProvider({
  children,
  mode = 'coach',
}: {
  children: ReactNode
  mode?: PlanWeekDndMode
}) {
  const existing = useContext(PlanWeekDndContext)
  if (existing) return <>{children}</>

  return <PlanWeekDndProviderInner mode={mode}>{children}</PlanWeekDndProviderInner>
}

function PlanWeekDndProviderInner({
  children,
  mode,
}: {
  children: ReactNode
  mode: PlanWeekDndMode
}) {
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [isMoving, startTransition] = useTransition()

  function setDragWorkout(workout: DragWorkout | null) {
    setDragItem(
      workout
        ? {
            kind: 'plan',
            id: workout.id,
            sport: workout.sport,
            dateKey: workout.dateKey,
          }
        : null,
    )
  }

  function moveWorkoutToCell(workoutId: string, dateKey: string) {
    startTransition(async () => {
      if (mode === 'athlete') {
        const formData = new FormData()
        formData.set('workoutId', workoutId)
        formData.set('rescheduledDate', dateKey)
        await rescheduleWorkout(formData)
      } else {
        await moveWorkoutToDate(workoutId, dateKey)
      }
      setDragItem(null)
    })
  }

  function scheduleTemplateToCell(templateId: string, dateKey: string) {
    if (mode !== 'coach') return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('templateId', templateId)
      formData.set('date', dateKey)
      await createWorkoutFromTemplate(formData)
      setDragItem(null)
    })
  }

  function savePlanWorkoutToLibrary(workoutId: string) {
    if (mode !== 'coach') return
    startTransition(async () => {
      await createTemplateFromWorkout(workoutId)
      setDragItem(null)
    })
  }

  const dragWorkout = dragItem?.kind === 'plan' ? dragItem : null

  return (
    <PlanWeekDndContext.Provider
      value={{
        mode,
        dragItem,
        setDragItem,
        dragWorkout,
        setDragWorkout,
        isMoving,
        moveWorkoutToCell,
        scheduleTemplateToCell,
        savePlanWorkoutToLibrary,
      }}
    >
      {children}
    </PlanWeekDndContext.Provider>
  )
}

export function usePlanWeekDnd() {
  return useContext(PlanWeekDndContext)
}
