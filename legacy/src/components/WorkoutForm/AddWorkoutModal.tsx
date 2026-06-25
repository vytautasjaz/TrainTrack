import { useState, type FormEvent } from 'react'
import type {
  BrickSegment,
  CreateWorkoutInput,
  EnduranceDetails,
  EnduranceSport,
  Exercise,
  Workout,
  WorkoutType,
} from '../../types/workout'
import {
  ENDURANCE_SPORTS,
  getWorkoutTypeLabel,
  isEnduranceType,
  usesExercises,
} from '../../types/workout'
import { resolveWorkoutType } from '../../utils/workoutDisplay'
import { EnduranceFields } from './EnduranceFields'
import { ExerciseFields } from './ExerciseFields'
import { WorkoutTypePicker } from './WorkoutTypePicker'

type WorkoutFormProps = {
  defaultDate: string
  workout?: Workout
  onClose: () => void
  onSave: (input: CreateWorkoutInput) => Promise<void>
}

const emptyEndurance = (): EnduranceDetails => ({})
const emptyExercise = (): Exercise => ({
  name: '',
  sets: undefined,
  reps: undefined,
  weight: undefined,
})

const defaultBrick = (): BrickSegment[] => [
  { sport: 'cycling', details: {} },
  { sport: 'running', details: {} },
]

function buildFormState(workout?: Workout) {
  if (!workout) {
    return {
      workoutType: null as WorkoutType | null,
      title: '',
      notes: '',
      endurance: emptyEndurance(),
      brick: defaultBrick(),
      exercises: [emptyExercise()],
    }
  }

  const type = resolveWorkoutType(workout.type)
  return {
    workoutType: type,
    title: workout.title,
    notes: workout.notes ?? '',
    endurance: workout.endurance ?? emptyEndurance(),
    brick: workout.brick ?? defaultBrick(),
    exercises: workout.exercises?.length ? workout.exercises : [emptyExercise()],
  }
}

function WorkoutForm({ defaultDate, workout, onClose, onSave }: WorkoutFormProps) {
  const isEditing = Boolean(workout)
  const initial = buildFormState(workout)

  const [date, setDate] = useState(workout?.date ?? defaultDate)
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(initial.workoutType)
  const [title, setTitle] = useState(initial.title)
  const [notes, setNotes] = useState(initial.notes)
  const [endurance, setEndurance] = useState<EnduranceDetails>(initial.endurance)
  const [brick, setBrick] = useState<BrickSegment[]>(initial.brick)
  const [exercises, setExercises] = useState<Exercise[]>(initial.exercises)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = (type: WorkoutType) => {
    setWorkoutType(type)
    if (!title.trim()) {
      setTitle(getWorkoutTypeLabel(type))
    }
    if (type === 'brick') {
      setBrick(defaultBrick())
    }
    if (usesExercises(type) && exercises.length === 0) {
      setExercises([emptyExercise()])
    }
  }

  const updateBrickSport = (index: 0 | 1, sport: EnduranceSport) => {
    setBrick((prev) =>
      prev.map((segment, i) => (i === index ? { ...segment, sport } : segment)),
    )
  }

  const updateBrickDetails = (index: 0 | 1, details: EnduranceDetails) => {
    setBrick((prev) =>
      prev.map((segment, i) => (i === index ? { ...segment, details } : segment)),
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!workoutType) {
      setError('Please choose a workout type.')
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }

    if (!date) {
      setError('Please choose a date.')
      return
    }

    if (workoutType === 'brick') {
      if (brick[0].sport === brick[1].sport) {
        setError('Brick workouts need two different sports.')
        return
      }
    }

    const cleanedExercises = exercises
      .map((ex) => ({ ...ex, name: ex.name.trim() }))
      .filter((ex) => ex.name.length > 0)

    setSaving(true)
    setError(null)
    try {
      await onSave({
        date,
        type: workoutType,
        title: trimmedTitle,
        notes: notes.trim() || undefined,
        endurance: isEnduranceType(workoutType) ? endurance : undefined,
        brick: workoutType === 'brick' ? brick : undefined,
        exercises: usesExercises(workoutType) && cleanedExercises.length > 0
          ? cleanedExercises
          : undefined,
      })
      onClose()
    } catch {
      setError(`Could not ${isEditing ? 'update' : 'save'} workout. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand">
            {isEditing ? 'Edit workout' : 'Assign workout'}
          </h2>
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

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Date *</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
        />
      </label>

      <WorkoutTypePicker value={workoutType} onChange={handleTypeChange} />

      {workoutType && (
        <>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${getWorkoutTypeLabel(workoutType)} session`}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
            />
          </label>

          {isEnduranceType(workoutType) && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Details</p>
              <EnduranceFields value={endurance} onChange={setEndurance} />
            </div>
          )}

          {workoutType === 'brick' && (
            <div className="mb-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Two sports combined</p>
              {([0, 1] as const).map((index) => (
                <div key={index} className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      Sport {index + 1}
                    </span>
                    <select
                      value={brick[index].sport}
                      onChange={(e) =>
                        updateBrickSport(index, e.target.value as EnduranceSport)
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-brand focus:ring-2"
                    >
                      {ENDURANCE_SPORTS.map((sport) => (
                        <option key={sport.value} value={sport.value}>
                          {sport.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <EnduranceFields
                    label={`${getWorkoutTypeLabel(brick[index].sport)} details`}
                    value={brick[index].details ?? {}}
                    onChange={(details) => updateBrickDetails(index, details)}
                  />
                </div>
              ))}
            </div>
          )}

          {usesExercises(workoutType) && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-slate-700">
                {workoutType === 'hyrox' ? 'Stations / exercises' : 'Exercises'}
              </p>
              <ExerciseFields exercises={exercises} onChange={setExercises} />
            </div>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Coach notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions, pacing, focus areas…"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
            />
          </label>
        </>
      )}

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
          disabled={saving || !workoutType}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save workout'}
        </button>
      </div>
    </form>
  )
}

type WorkoutModalProps = {
  defaultDate: string
  workout?: Workout
  formKey: number
  open: boolean
  onClose: () => void
  onSave: (input: CreateWorkoutInput) => Promise<void>
}

export function WorkoutModal({
  defaultDate,
  workout,
  formKey,
  open,
  onClose,
  onSave,
}: WorkoutModalProps) {
  if (!open) return null

  const formInstanceKey = workout ? `${formKey}-${workout.id}` : `${formKey}-new`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white">
        <WorkoutForm
          key={formInstanceKey}
          defaultDate={defaultDate}
          workout={workout}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  )
}

// Keep backward-compatible export name
export const AddWorkoutModal = WorkoutModal
