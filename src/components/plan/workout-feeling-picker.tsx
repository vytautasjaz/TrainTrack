'use client'

import { cn } from '@/lib/utils'
import {
  WORKOUT_FEELING_MAX,
  WORKOUT_FEELING_MIN,
  WORKOUT_FEELING_SWATCH_CLASS,
  workoutFeelingLabel,
  workoutFeelingTone,
} from '@/lib/workout-feeling'

const VALUES = Array.from(
  { length: WORKOUT_FEELING_MAX - WORKOUT_FEELING_MIN + 1 },
  (_, i) => i + WORKOUT_FEELING_MIN,
)

type WorkoutFeelingPickerProps = {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function WorkoutFeelingPicker({
  value,
  onChange,
  disabled = false,
}: WorkoutFeelingPickerProps) {
  return (
    <fieldset className="min-w-0 space-y-1.5" disabled={disabled}>
      <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        How did you feel?
      </legend>
      <div className="grid grid-cols-10 gap-0.5">
        {VALUES.map((n) => {
          const selected = value === n
          const stepTone = workoutFeelingTone(n)
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${n} of 10, ${workoutFeelingLabel(n)}`}
              onClick={() => onChange(n)}
              className={cn(
                'flex h-7 min-w-0 items-center justify-center rounded-[6px] border text-[11px] font-semibold tabular-nums transition',
                selected
                  ? WORKOUT_FEELING_SWATCH_CLASS[stepTone]
                  : 'border-border/70 bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Rough</span>
        <span>
          {value != null
            ? `${value}/10 · ${workoutFeelingLabel(value)}`
            : 'Select a rating'}
        </span>
        <span>Great</span>
      </div>
    </fieldset>
  )
}
