'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  workoutNeedsDetailFetch,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { coachOpensPlanWorkoutEditor } from '@/lib/plan-workout-modal'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import {
  invalidatePlanWorkoutDetailCache,
  prefetchPlanWorkoutDetail,
  readPlanWorkoutDetailCache,
} from '@/lib/plan-workout-detail-prefetch'

type PlanWorkoutModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Plan/training workout modal — coaches edit planned sessions; logged ones open the detail view. */
export function PlanWorkoutModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: PlanWorkoutModalProps) {
  const needsEditor = coachOpensPlanWorkoutEditor(isCoach, workout)
  const needsFetch = workoutNeedsDetailFetch(workout)
  const [detail, setDetail] = useState<PlanWorkoutDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) invalidatePlanWorkoutDetailCache(workout.id)
    onOpenChange(next)
  }

  // Coach editor needs full structure when present — load before opening the builder.
  useEffect(() => {
    if (!open || workout.isRace || !needsEditor) {
      setDetail(null)
      setFailed(false)
      setLoading(false)
      return
    }

    if (!needsFetch) {
      setDetail(workout)
      setFailed(false)
      setLoading(false)
      return
    }

    const cached = readPlanWorkoutDetailCache(workout.id)
    if (cached) {
      setDetail(cached)
      setFailed(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFailed(false)

    void prefetchPlanWorkoutDetail(workout.id).then((result) => {
      if (cancelled) return
      if (!result) {
        setDetail(null)
        setFailed(true)
      } else {
        setDetail(result)
        setFailed(false)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, workout, workout.isRace, needsEditor, needsFetch])

  if (workout.isRace) {
    return (
      <RaceDetailModal
        workout={workout}
        open={open}
        onOpenChange={handleOpenChange}
        isCoach={isCoach}
      />
    )
  }

  if (needsEditor) {
    if (open && loading && !detail) {
      return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-sm">
            <DialogTitle className="sr-only">Loading workout</DialogTitle>
            <DialogDescription className="sr-only">
              Loading workout details
            </DialogDescription>
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          </DialogContent>
        </Dialog>
      )
    }

    if (open && failed && !detail) {
      return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Workout unavailable</DialogTitle>
            <DialogDescription>
              This workout could not be loaded. It may have been removed.
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )
    }

    const resolved = detail ?? workout
    return (
      <WorkoutEditorDialog
        open={open && Boolean(detail)}
        onOpenChange={handleOpenChange}
        date={resolved.dateKey}
        sport={resolved.type}
        workout={resolved}
      />
    )
  }

  // Athlete / logged workout detail — WorkoutDetailView loads structure itself when needed.
  return (
    <WorkoutDetailModal
      workout={workout}
      isCoach={isCoach}
      open={open}
      onOpenChange={handleOpenChange}
    />
  )
}
