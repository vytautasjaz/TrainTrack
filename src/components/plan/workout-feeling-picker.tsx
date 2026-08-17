'use client'

import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  WORKOUT_FEELING_DEFAULT,
  WORKOUT_FEELING_INK,
  WORKOUT_FEELING_MAX,
  WORKOUT_FEELING_MIN,
  WORKOUT_FEELING_SCALE_GRADIENT,
  WORKOUT_FEELING_SWATCH_CLASS,
  workoutFeelingLabel,
  workoutFeelingTone,
} from '@/lib/workout-feeling'

const VALUES = Array.from(
  { length: WORKOUT_FEELING_MAX - WORKOUT_FEELING_MIN + 1 },
  (_, i) => i + WORKOUT_FEELING_MIN,
)

const FACE: Record<ReturnType<typeof workoutFeelingTone>, LucideIcon> = {
  bad: Frown,
  ok: Meh,
  good: Smile,
}

type WorkoutFeelingPickerProps = {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function WorkoutFeelingPicker({
  value,
  onChange,
  disabled = false,
}: WorkoutFeelingPickerProps) {
  const current = value || WORKOUT_FEELING_DEFAULT
  const tone = workoutFeelingTone(current)

  return (
    <fieldset className="min-w-0 space-y-1.5" disabled={disabled}>
      <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        How did you feel?
      </legend>
      <div className="grid grid-cols-10 gap-0.5">
        {VALUES.map((n) => {
          const selected = current === n
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
      <div className="px-0.5">
        <input
          type="range"
          min={WORKOUT_FEELING_MIN}
          max={WORKOUT_FEELING_MAX}
          step={1}
          value={current}
          disabled={disabled}
          aria-label="Workout feeling"
          aria-valuetext={`${current} of 10, ${workoutFeelingLabel(current)}`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tt-feeling-slider"
          style={
            {
              '--tt-feeling-track': WORKOUT_FEELING_SCALE_GRADIENT,
              '--tt-feeling-thumb': WORKOUT_FEELING_INK[tone],
            } as CSSProperties
          }
        />
      </div>
      <div className="grid grid-cols-10 gap-0.5">
        {VALUES.map((n) => {
          const selected = current === n
          const stepTone = workoutFeelingTone(n)
          const Icon = FACE[stepTone]
          return (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onChange(n)}
              className={cn(
                'flex items-center justify-center py-0.5',
                selected ? 'opacity-100' : 'opacity-70 hover:opacity-100',
              )}
            >
              <Icon
                className="h-3.5 w-3.5"
                strokeWidth={selected ? 2.4 : 2}
                color={WORKOUT_FEELING_INK[stepTone]}
              />
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Rough</span>
        <span>
          {current}/10 · {workoutFeelingLabel(current)}
        </span>
        <span>Great</span>
      </div>
    </fieldset>
  )
}
