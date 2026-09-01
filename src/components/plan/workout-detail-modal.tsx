'use client'

import { useEffect, useRef } from 'react'
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
import { coachOpensPlanWorkoutEditor } from '@/lib/plan-workout-modal'
import { prefetchWorkoutCoachingThread } from '@/lib/coaching-thread-prefetch'
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

  useEffect(() => {
    if (open) prefetchWorkoutCoachingThread(workout.id)
  }, [open, workout.id])

  // Coaches jump straight into the editor (skip read-only preview).
  if (coachOpensPlanWorkoutEditor(isCoach, workout)) {
    return (
      <WorkoutEditorDialog
        open={open}
        onOpenChange={onOpenChange}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
      />
    )
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        overlayClassName="bg-black/50"
        onEscapeKeyDown={(e) => {
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
          active={open}
          onClose={() => onOpenChange(false)}
          closeHandleRef={closeHandleRef}
          className="min-h-0 max-h-[90vh]"
        />
      </DialogContent>
    </Dialog>
  )
}
