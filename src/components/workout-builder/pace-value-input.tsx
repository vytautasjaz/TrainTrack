'use client'

import { SuggestableInput } from '@/components/swim-workout/suggestable-input'
import {
  normalizePaceInputValue,
  paceInputDisplayValue,
} from '@/lib/workout-builder/target-helpers'
import { cn } from '@/lib/utils'

type PaceValueInputProps = {
  value: string
  onChange: (value: string) => void
  suggestions: readonly string[]
  placeholder: string
  'aria-label': string
  className?: string
  /** Extra class on the trailing /km unit. */
  unitClassName?: string
}

/**
 * Pace entry as m:ss / mm:ss. `/km` is shown as a suffix and applied on blur.
 */
export function PaceValueInput({
  value,
  onChange,
  suggestions,
  placeholder,
  'aria-label': ariaLabel,
  className,
  unitClassName,
}: PaceValueInputProps) {
  return (
    <div className="flex min-w-0 items-baseline gap-0.5">
      <SuggestableInput
        value={paceInputDisplayValue(value)}
        onChange={onChange}
        onBlur={() => {
          const next = normalizePaceInputValue(paceInputDisplayValue(value))
          if (next !== value) onChange(next)
        }}
        suggestions={suggestions}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
        inputMode="text"
        autoComplete="off"
      />
      <span
        className={cn(
          'shrink-0 text-[10px] font-medium text-muted-foreground/70',
          unitClassName,
        )}
        aria-hidden
      >
        /km
      </span>
    </div>
  )
}
