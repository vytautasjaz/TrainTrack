'use client'

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
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
  /** Synthetic race row — same-day reorder only (not cross-day move). */
  isRace?: boolean
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
  isRace?: boolean
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
  /** Optimistic same-day reorder — ordered workout/race ids for that date. */
  onDayReordered?: (dateKey: string, orderedIds: string[]) => void
}

const PlanWeekDndContext = createContext<PlanWeekDndContextValue | null>(null)

export function PlanWeekDndProvider({
  children,
  mode = 'coach',
  onWorkoutMoved,
  onDayReordered,
}: {
  children: ReactNode
  mode?: PlanWeekDndMode
  /** Optimistic UI — called with the target date before the server action. */
  onWorkoutMoved?: (workoutId: string, dateKey: string) => void
  /** Optimistic same-day reorder (ids in display order). */
  onDayReordered?: (dateKey: string, orderedIds: string[]) => void
}) {
  const existing = useContext(PlanWeekDndContext)
  if (existing) return <>{children}</>

  return (
    <PlanWeekDndProviderInner
      mode={mode}
      onWorkoutMoved={onWorkoutMoved}
      onDayReordered={onDayReordered}
    >
      {children}
    </PlanWeekDndProviderInner>
  )
}

function PlanWeekDndProviderInner({
  children,
  mode,
  onWorkoutMoved,
  onDayReordered,
}: {
  children: ReactNode
  mode: PlanWeekDndMode
  onWorkoutMoved?: (workoutId: string, dateKey: string) => void
  onDayReordered?: (dateKey: string, orderedIds: string[]) => void
}) {
  const router = useRouter()
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
            isRace: workout.isRace,
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
        router.refresh()
      } catch (error) {
        setActionError(toUserMessage(error, fallbackMessage))
      }
    })
  }

  function moveWorkoutToCell(workoutId: string, dateKey: string) {
    const fromKey =
      dragItem?.kind === 'plan' && dragItem.id === workoutId
        ? dragItem.dateKey
        : null
    onWorkoutMoved?.(workoutId, dateKey)
    setActionError(null)
    startTransition(async () => {
      try {
        if (mode === 'athlete') {
          const formData = new FormData()
          formData.set('workoutId', workoutId)
          formData.set('rescheduledDate', dateKey)
          await rescheduleWorkout(formData)
        } else {
          await moveWorkoutToDate(workoutId, dateKey)
        }
        setDragItem(null)
        router.refresh()
      } catch (error) {
        if (fromKey) onWorkoutMoved?.(workoutId, fromKey)
        setActionError(toUserMessage(error, 'Could not move workout'))
      }
    })
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
        onDayReordered,
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
