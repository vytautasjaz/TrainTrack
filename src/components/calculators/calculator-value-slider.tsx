'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalculatorValueSliderProps = {
  value: number | null
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  /** Smaller controls for dense table rows. */
  compact?: boolean
  'aria-label': string
  className?: string
}

function stepPrecision(step: number): number {
  const text = String(step)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

function nudgeValue(
  current: number,
  min: number,
  max: number,
  step: number,
  direction: -1 | 1,
): number {
  const stepsFromMin = Math.round((current - min) / step) + direction
  const next = min + stepsFromMin * step
  const rounded = Number(next.toFixed(stepPrecision(step)))
  return Math.min(max, Math.max(min, rounded))
}

/** Thin native range control for calculator hero fields, with ± step buttons. */
export function CalculatorValueSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  compact = false,
  'aria-label': ariaLabel,
  className,
}: CalculatorValueSliderProps) {
  const safeMax = max > min ? max : min + step
  const hasValue = value != null && Number.isFinite(value)
  const clamped = hasValue ? Math.min(safeMax, Math.max(min, value)) : min
  const controlsDisabled = disabled || !hasValue
  const atMin = clamped <= min
  const atMax = clamped >= safeMax

  function stepBy(direction: -1 | 1) {
    if (controlsDisabled) return
    const next = nudgeValue(clamped, min, safeMax, step, direction)
    if (next !== clamped) onChange(next)
  }

  const buttonClass = cn(
    'flex shrink-0 items-center justify-center rounded-[4px] border border-border/60 bg-card text-muted-foreground transition',
    'hover:border-border hover:text-foreground',
    'disabled:pointer-events-none disabled:opacity-40',
    compact ? 'h-4 w-4' : 'h-6 w-6 rounded-[5px]',
  )

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5', className)}>
      <button
        type="button"
        disabled={controlsDisabled || atMin}
        onClick={() => stepBy(-1)}
        aria-label={`Decrease ${ariaLabel}`}
        className={buttonClass}
      >
        <Minus className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.25} />
      </button>

      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        disabled={controlsDisabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className={cn(
          'calculator-value-slider min-w-0 flex-1',
          compact && 'calculator-value-slider--compact',
        )}
      />

      <button
        type="button"
        disabled={controlsDisabled || atMax}
        onClick={() => stepBy(1)}
        aria-label={`Increase ${ariaLabel}`}
        className={buttonClass}
      >
        <Plus className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.25} />
      </button>
    </div>
  )
}
