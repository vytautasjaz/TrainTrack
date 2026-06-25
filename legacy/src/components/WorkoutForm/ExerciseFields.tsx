import type { Exercise } from '../../types/workout'

type ExerciseFieldsProps = {
  exercises: Exercise[]
  onChange: (exercises: Exercise[]) => void
}

const emptyExercise = (): Exercise => ({
  name: '',
  sets: undefined,
  reps: undefined,
  weight: undefined,
})

export function ExerciseFields({ exercises, onChange }: ExerciseFieldsProps) {
  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== index) return ex
        if (field === 'name') return { ...ex, name: value }
        const num = value === '' ? undefined : Number(value)
        return { ...ex, [field]: num }
      }),
    )
  }

  return (
    <div className="space-y-3">
      {exercises.map((exercise, index) => (
        <div key={index} className="rounded-xl border border-slate-200 p-3">
          <input
            type="text"
            value={exercise.name}
            onChange={(e) => updateExercise(index, 'name', e.target.value)}
            placeholder="Exercise name"
            className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min="0"
              value={exercise.sets ?? ''}
              onChange={(e) => updateExercise(index, 'sets', e.target.value)}
              placeholder="Sets"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
            <input
              type="number"
              min="0"
              value={exercise.reps ?? ''}
              onChange={(e) => updateExercise(index, 'reps', e.target.value)}
              placeholder="Reps"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={exercise.weight ?? ''}
              onChange={(e) => updateExercise(index, 'weight', e.target.value)}
              placeholder="kg"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...exercises, emptyExercise()])}
        className="text-sm text-slate-600 hover:text-slate-800"
      >
        + Another exercise
      </button>
    </div>
  )
}
