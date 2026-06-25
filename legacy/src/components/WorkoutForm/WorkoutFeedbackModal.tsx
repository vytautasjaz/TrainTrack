import { useState, type FormEvent } from 'react'
import type {
  EnduranceDetails,
  Exercise,
  UpdateWorkoutExecutionInput,
  Workout,
  WorkoutExecutionStatus,
} from '../../types/workout'
import {
  getWorkoutTypeLabel,
  isEnduranceType,
  usesExercises,
} from '../../types/workout'
import { formatWorkoutSummary, resolveWorkoutType } from '../../utils/workoutDisplay'
import { EnduranceFields } from './EnduranceFields'
import { ExerciseFields } from './ExerciseFields'

type WorkoutFeedbackFormProps = {
  workout: Workout
  onClose: () => void
  onSave: (input: UpdateWorkoutExecutionInput) => Promise<void>
}

const FEEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Rough',
  2: 'Hard',
  3: 'OK',
  4: 'Good',
  5: 'Great',
}

const STATUS_OPTIONS: { value: WorkoutExecutionStatus; label: string }[] = [
  { value: 'completed', label: 'Completed as planned' },
  { value: 'partial', label: 'Partially completed' },
  { value: 'skipped', label: 'Skipped' },
]

function buildExecutionState(workout: Workout) {
  const execution = workout.execution
  return {
    status: execution?.status ?? ('completed' as WorkoutExecutionStatus),
    feedback: execution?.feedback ?? '',
    feelRating: execution?.feelRating ?? (3 as 1 | 2 | 3 | 4 | 5),
    actualEndurance: execution?.actualEndurance ?? workout.endurance ?? {},
    actualExercises: execution?.actualExercises?.length
      ? execution.actualExercises
      : workout.exercises?.length
        ? workout.exercises
        : [{ name: '', sets: undefined, reps: undefined, weight: undefined }],
  }
}

function WorkoutFeedbackForm({ workout, onClose, onSave }: WorkoutFeedbackFormProps) {
  const initial = buildExecutionState(workout)
  const workoutType = resolveWorkoutType(workout.type)

  const [status, setStatus] = useState<WorkoutExecutionStatus>(initial.status)
  const [feedback, setFeedback] = useState(initial.feedback)
  const [feelRating, setFeelRating] = useState<1 | 2 | 3 | 4 | 5>(initial.feelRating)
  const [actualEndurance, setActualEndurance] = useState<EnduranceDetails>(initial.actualEndurance)
  const [actualExercises, setActualExercises] = useState<Exercise[]>(initial.actualExercises)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planSummary = formatWorkoutSummary(workout)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const cleanedExercises = actualExercises
      .map((ex) => ({ ...ex, name: ex.name.trim() }))
      .filter((ex) => ex.name.length > 0)

    try {
      await onSave({
        status,
        feedback: feedback.trim() || undefined,
        feelRating,
        actualEndurance: isEnduranceType(workoutType) ? actualEndurance : undefined,
        actualExercises:
          usesExercises(workoutType) && cleanedExercises.length > 0
            ? cleanedExercises
            : undefined,
      })
      onClose()
    } catch {
      setError('Could not save feedback. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand">Log workout</h2>
          <p className="mt-0.5 text-sm text-gray-600">{workout.title}</p>
          <p className="text-xs text-muted">{getWorkoutTypeLabel(workoutType)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {planSummary && (
        <p className="mb-4 border-b border-gray-100 pb-3 text-sm text-gray-500">
          Coach plan: {planSummary}
        </p>
      )}

      {workout.notes && (
        <p className="mb-4 text-sm text-gray-500">Coach notes: {workout.notes}</p>
      )}

      <fieldset className="mb-4">
        <legend className="mb-2 block text-sm font-medium text-slate-700">How did it go?</legend>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="execution-status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">How did you feel?</span>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setFeelRating(rating)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                feelRating === rating
                  ? 'border-brand text-brand'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {rating}
              <span className="mt-0.5 block text-[10px] font-normal text-muted">
                {FEEL_LABELS[rating]}
              </span>
            </button>
          ))}
        </div>
      </label>

      {status !== 'skipped' && isEnduranceType(workoutType) && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-700">What you actually did</p>
          <EnduranceFields value={actualEndurance} onChange={setActualEndurance} />
        </div>
      )}

      {status !== 'skipped' && usesExercises(workoutType) && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-700">What you actually did</p>
          <ExerciseFields exercises={actualExercises} onChange={setActualExercises} />
        </div>
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Comments</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="How the session felt, anything the coach should know…"
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
        />
      </label>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save feedback'}
        </button>
      </div>
    </form>
  )
}

type WorkoutFeedbackModalProps = {
  workout: Workout | null
  open: boolean
  onClose: () => void
  onSave: (input: UpdateWorkoutExecutionInput) => Promise<void>
}

export function WorkoutFeedbackModal({
  workout,
  open,
  onClose,
  onSave,
}: WorkoutFeedbackModalProps) {
  if (!open || !workout) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white">
        <WorkoutFeedbackForm key={workout.id} workout={workout} onClose={onClose} onSave={onSave} />
      </div>
    </div>
  )
}
