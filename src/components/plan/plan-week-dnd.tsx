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
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'

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
  actionError: string | null
  clearActionError: () => void
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
  const [actionError, setActionError] = useState<string | null>(null)
  const [isMoving, startTransition] = useTransition()

  function clearActionError() {
    setActionError(null)
  }

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

  function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await action()
        setDragItem(null)
      } catch (error) {
        setActionError(toUserMessage(error, fallbackMessage))
      }
    })
  }

  function moveWorkoutToCell(workoutId: string, dateKey: string) {
    runAction(async () => {
      if (mode === 'athlete') {
        const formData = new FormData()
        formData.set('workoutId', workoutId)
        formData.set('rescheduledDate', dateKey)
        await rescheduleWorkout(formData)
      } else {
        await moveWorkoutToDate(workoutId, dateKey)
      }
    }, 'Could not move workout')
  }

  function scheduleTemplateToCell(templateId: string, dateKey: string) {
    if (mode !== 'coach') return
    runAction(async () => {
      const formData = new FormData()
      formData.set('templateId', templateId)
      formData.set('date', dateKey)
      await createWorkoutFromTemplate(formData)
    }, 'Could not schedule template')
  }

  function savePlanWorkoutToLibrary(workoutId: string) {
    if (mode !== 'coach') return
    runAction(async () => {
      await createTemplateFromWorkout(workoutId)
    }, 'Could not save to library')
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
        actionError,
        clearActionError,
        moveWorkoutToCell,
        scheduleTemplateToCell,
        savePlanWorkoutToLibrary,
      }}
    >
      {children}
    </PlanWeekDndContext.Provider>
  )
}

export function PlanWeekDndErrorBanner({ className }: { className?: string }) {
  const dnd = useContext(PlanWeekDndContext)
  if (!dnd?.actionError) return null

  return (
    <FormError
      message={dnd.actionError}
      className={className}
    />
  )
}

export function usePlanWeekDnd() {
  return useContext(PlanWeekDndContext)
}
