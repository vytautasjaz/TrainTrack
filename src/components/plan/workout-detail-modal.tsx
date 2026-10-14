'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import {
  formatWorkoutDetailDate,
  WorkoutDetailView,
  type WorkoutDetailCloseHandle,
} from '@/components/plan/workout-detail-view'
import { canEditPlanWorkout } from '@/lib/plan-workout-modal'
import { prefetchWorkoutCoachingThread } from '@/lib/coaching-thread-prefetch'
import {
  invalidatePlanWorkoutDetailCache,
  prefetchPlanWorkoutDetail,
  readPlanWorkoutDetailCache,
} from '@/lib/plan-workout-detail-prefetch'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type WorkoutDetailModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkoutDetailModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: WorkoutDetailModalProps) {
  const closeHandleRef = useRef<WorkoutDetailCloseHandle | null>(null)
  const [editing, setEditing] = useState(false)
  const [editorWorkout, setEditorWorkout] = useState(workout)
  const canEdit = canEditPlanWorkout(isCoach, workout)

  useEffect(() => {
    if (!open) {
      setEditing(false)
      return
    }
    prefetchWorkoutCoachingThread(workout.id)
    setEditorWorkout(workout)
  }, [open, workout])

  useEffect(() => {
    if (!open || !editing) return
    const cached = readPlanWorkoutDetailCache(workout.id)
    if (cached) {
      setEditorWorkout(cached)
      return
    }
    let cancelled = false
    void prefetchPlanWorkoutDetail(workout.id).then((detail) => {
      if (!cancelled && detail) setEditorWorkout(detail)
    })
    return () => {
      cancelled = true
    }
  }, [open, editing, workout.id])

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true)
      return
    }
    if (closeHandleRef.current) {
      closeHandleRef.current.tryClose()
      return
    }
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open && !editing} onOpenChange={handleOpenChange}>
        <DialogContent
          hideCloseButton
          overlayClassName="bg-black/50"
          onEscapeKeyDown={(e) => {
            if (document.querySelector("[data-tt-activity-map-overlay]")) {
              e.preventDefault()
              return
            }
            if (closeHandleRef.current && !closeHandleRef.current.tryClose()) {
              e.preventDefault()
            }
          }}
          className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden border border-white/20 bg-white p-0 shadow-[0_0_0_1px_rgba(15,18,39,0.35),0_20px_56px_rgba(0,0,0,0.42)]"
        >
          <DialogTitle className="sr-only">{workout.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {formatWorkoutDetailDate(workout.dateKey)}
          </DialogDescription>
          <WorkoutDetailView
            workout={workout}
            isCoach={isCoach}
            active={open && !editing}
            onClose={() => onOpenChange(false)}
            closeHandleRef={closeHandleRef}
            className="min-h-0 max-h-[90vh]"
            onRequestEdit={canEdit ? () => setEditing(true) : undefined}
          />
        </DialogContent>
      </Dialog>

      {canEdit ? (
        <WorkoutEditorDialog
          open={open && editing}
          onOpenChange={(next) => {
            if (!next) setEditing(false)
          }}
          date={editorWorkout.dateKey}
          sport={editorWorkout.type}
          workout={editorWorkout}
          selfLoggedCreate={!isCoach}
          onSaved={() => {
            setEditing(false)
            invalidatePlanWorkoutDetailCache(workout.id)
            void prefetchPlanWorkoutDetail(workout.id)
          }}
        />
      ) : null}
    </>
  )
}
