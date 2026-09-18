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
  addTrainingPlanSessionFromTemplate,
  moveTrainingPlanSession,
  moveTrainingPlanRacePlaceholder,
  deleteTrainingPlanSession,
  createTemplateFromTrainingPlanSession,
} from '@/app/actions/training-plans'
import { toUserMessage } from '@/lib/action-error'
import { FormError } from '@/components/ui/form-error'
import { parsePlanSlotKey } from '@/lib/training-plan'
import { useRouter } from 'next/navigation'

export type DragPlanCanvasSession = {
  kind: 'session'
  id: string
  sport: WorkoutType
  slotKey: string
}

export type DragPlanCanvasRace = {
  kind: 'race'
  id: string
  sport: WorkoutType
  slotKey: string
}

export type DragPlanCanvasTemplate = {
  kind: 'template'
  templateId: string
  sport: WorkoutType
}

export type PlanCanvasDragItem =
  | DragPlanCanvasSession
  | DragPlanCanvasRace
  | DragPlanCanvasTemplate

type PlanCanvasDndContextValue = {
  planId: string
  dragItem: PlanCanvasDragItem | null
  setDragItem: (item: PlanCanvasDragItem | null) => void
  isMoving: boolean
  actionError: string | null
  clearActionError: () => void
  moveSessionToSlot: (sessionId: string, slotKey: string) => void
  moveRaceToSlot: (raceId: string, slotKey: string) => void
  scheduleTemplateToSlot: (templateId: string, slotKey: string) => void
  deleteSession: (sessionId: string) => void
  savePlanSessionToLibrary: (
    sessionId: string,
    folderId?: string | null,
  ) => void
}

const PlanCanvasDndContext = createContext<PlanCanvasDndContextValue | null>(
  null,
)

export function PlanCanvasDndProvider({
  planId,
  children,
}: {
  planId: string
  children: ReactNode
}) {
  const router = useRouter()
  const [dragItem, setDragItem] = useState<PlanCanvasDragItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isMoving, startTransition] = useTransition()

  function clearActionError() {
    setActionError(null)
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

  function moveSessionToSlot(sessionId: string, slotKey: string) {
    const slot = parsePlanSlotKey(slotKey)
    if (!slot) return
    runAction(async () => {
      await moveTrainingPlanSession({
        sessionId,
        weekIndex: slot.weekIndex,
        dayOfWeek: slot.dayOfWeek,
      })
    }, 'Could not move session')
  }

  function moveRaceToSlot(raceId: string, slotKey: string) {
    const slot = parsePlanSlotKey(slotKey)
    if (!slot) return
    runAction(async () => {
      await moveTrainingPlanRacePlaceholder({
        raceId,
        weekIndex: slot.weekIndex,
        dayOfWeek: slot.dayOfWeek,
      })
    }, 'Could not move race')
  }

  function scheduleTemplateToSlot(templateId: string, slotKey: string) {
    const slot = parsePlanSlotKey(slotKey)
    if (!slot) return
    runAction(async () => {
      await addTrainingPlanSessionFromTemplate({
        planId,
        templateId,
        weekIndex: slot.weekIndex,
        dayOfWeek: slot.dayOfWeek,
      })
    }, 'Could not add template')
  }

  function deleteSession(sessionId: string) {
    runAction(async () => {
      await deleteTrainingPlanSession(sessionId)
    }, 'Could not delete session')
  }

  function savePlanSessionToLibrary(
    sessionId: string,
    folderId?: string | null,
  ) {
    runAction(async () => {
      await createTemplateFromTrainingPlanSession({
        sessionId,
        folderId: folderId ?? null,
      })
    }, 'Could not save to library')
  }

  return (
    <PlanCanvasDndContext.Provider
      value={{
        planId,
        dragItem,
        setDragItem,
        isMoving,
        actionError,
        clearActionError,
        moveSessionToSlot,
        moveRaceToSlot,
        scheduleTemplateToSlot,
        deleteSession,
        savePlanSessionToLibrary,
      }}
    >
      {children}
    </PlanCanvasDndContext.Provider>
  )
}

export function PlanCanvasDndErrorBanner({ className }: { className?: string }) {
  const dnd = useContext(PlanCanvasDndContext)
  if (!dnd?.actionError) return null
  return <FormError message={dnd.actionError} className={className} />
}

export function usePlanCanvasDnd() {
  return useContext(PlanCanvasDndContext)
}
