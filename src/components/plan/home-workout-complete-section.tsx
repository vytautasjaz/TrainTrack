'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { completeWorkout } from '@/app/actions/workouts'

type HomeWorkoutCompleteSectionProps = {
  workout: PlanWorkoutDetail
  logOnlyMode: boolean
  onLogModeChange: (active: boolean) => void
  onClose: () => void
}

function WorkoutStatsFields({ workout }: { workout: PlanWorkoutDetail }) {
  const result = workout.result

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="text-muted-foreground">Actual distance (km)</span>
        <input
          name="actualDistance"
          type="number"
          step="0.1"
          defaultValue={result?.actualDistance ?? workout.plannedDistance ?? undefined}
          className="input-field mt-1"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Actual duration (min)</span>
        <input
          name="actualDuration"
          type="number"
          defaultValue={result?.actualDuration ?? workout.plannedDuration ?? undefined}
          className="input-field mt-1"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">RPE (1–10)</span>
        <input
          name="rpe"
          type="number"
          min={1}
          max={10}
          defaultValue={result?.rpe ?? 6}
          className="input-field mt-1"
        />
      </label>
    </div>
  )
}

function AthleteNotesField({
  workout,
  skipped,
}: {
  workout: PlanWorkoutDetail
  skipped: boolean
}) {
  const result = workout.result

  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">
        {skipped ? 'Comment for coach' : 'Comments'}
      </span>
      <textarea
        name="athleteNotes"
        defaultValue={result?.athleteNotes ?? ''}
        rows={3}
        placeholder={
          skipped ? 'Why are you skipping this workout?' : 'How did it feel?'
        }
        className="input-field mt-1"
      />
    </label>
  )
}

function LogWorkoutForm({
  workout,
  isEditing,
  onClose,
  onSaved,
}: {
  workout: PlanWorkoutDetail
  isEditing: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const initialStatus =
    workout.status === WorkoutStatus.SKIPPED
      ? WorkoutStatus.SKIPPED
      : WorkoutStatus.COMPLETED
  const [status, setStatus] = useState<WorkoutStatus>(initialStatus)
  const [isSaving, startSave] = useTransition()
  const router = useRouter()
  const isLogged = status === WorkoutStatus.COMPLETED

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('workoutId', workout.id)
    formData.set('status', status)
    startSave(async () => {
      await completeWorkout(formData)
      router.refresh()
      if (isEditing) {
        onSaved()
      } else {
        onClose()
      }
    })
  }

  return (
    <form onSubmit={handleSaveDetails} className="space-y-4">
      <label className="block text-sm">
        <span className="text-muted-foreground">Status</span>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as WorkoutStatus)}
          className="input-field mt-1"
        >
          <option value={WorkoutStatus.COMPLETED}>Logged</option>
          <option value={WorkoutStatus.SKIPPED}>Skipped</option>
        </select>
      </label>
      {isLogged && (
        <>
          <p className="text-sm text-muted-foreground">
            Add your stats and comments if Strava didn&apos;t sync this workout.
          </p>
          <WorkoutStatsFields workout={workout} />
        </>
      )}
      {!isLogged && (
        <p className="text-sm text-muted-foreground">
          Let your coach know why you&apos;re skipping this workout.
        </p>
      )}
      <AthleteNotesField workout={workout} skipped={!isLogged} />
      <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>
        {isSaving ? 'Saving…' : isEditing ? 'Update' : 'Save'}
      </Button>
    </form>
  )
}

export function HomeWorkoutCompleteSection({
  workout,
  logOnlyMode,
  onLogModeChange,
  onClose,
}: HomeWorkoutCompleteSectionProps) {
  const isCompleted = workout.status === WorkoutStatus.COMPLETED
  const isSkipped = workout.status === WorkoutStatus.SKIPPED
  const isLogged = isCompleted || isSkipped

  if (logOnlyMode) {
    return (
      <LogWorkoutForm
        workout={workout}
        isEditing={isLogged}
        onClose={onClose}
        onSaved={() => onLogModeChange(false)}
      />
    )
  }

  if (isLogged) {
    return null
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => onLogModeChange(true)}>
      Done
    </Button>
  )
}
