import { WORKOUT_TYPES, type WorkoutType } from '../../types/workout'
import { WorkoutTypeIcon } from '../Icons/WorkoutTypeIcon'

type WorkoutTypePickerProps = {
  value: WorkoutType | null
  onChange: (type: WorkoutType) => void
}

export function WorkoutTypePicker({ value, onChange }: WorkoutTypePickerProps) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-3 block text-xs font-medium text-gray-500">
        Choose activity
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {WORKOUT_TYPES.map((type) => {
          const selected = value === type.value
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 ${
                selected
                  ? 'border-brand text-brand'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={selected ? 'text-brand' : 'text-gray-400'}>
                <WorkoutTypeIcon type={type.value} className="h-7 w-7" />
              </span>
              <span
                className={`text-center text-xs font-medium leading-tight ${
                  selected ? 'text-brand' : 'text-gray-600'
                }`}
              >
                {type.label}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
