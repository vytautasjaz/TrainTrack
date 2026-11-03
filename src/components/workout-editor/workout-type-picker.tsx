'use client'

import { ChevronDown } from 'lucide-react'
import {
  FixedPortalMenu,
  FixedPortalMenuItem,
} from '@/components/ui/fixed-portal-menu'
import { cn } from '@/lib/utils'

export type WorkoutTypePickerOption = { value: string; label: string }

type WorkoutTypePickerProps = {
  label: string
  hasValue: boolean
  options: WorkoutTypePickerOption[]
  selectedValue?: string
  onSelect: (value: string) => void
  className?: string
}

/** Workout-type control for the editor hero. */
export function WorkoutTypePicker({
  label,
  hasValue,
  options,
  selectedValue,
  onSelect,
  className,
}: WorkoutTypePickerProps) {
  return (
    <FixedPortalMenu
      role="listbox"
      aria-label="Workout type"
      align="center"
      className={cn('max-w-full', className)}
      menuClassName="max-h-56"
      trigger={({ open, props }) => (
        <button
          {...props}
          aria-label="Workout type"
          className={cn(
            'group inline-flex max-w-full items-center justify-center gap-1 bg-transparent text-center text-[20px] font-bold leading-tight outline-none',
            hasValue ? 'text-white' : 'text-white/35',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-white/50 transition',
              open && 'rotate-180',
            )}
          />
        </button>
      )}
    >
      {(close) =>
        options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No types available
          </p>
        ) : (
          options.map((option) => (
            <FixedPortalMenuItem
              key={option.value}
              role="option"
              selected={option.value === selectedValue}
              onSelect={() => {
                onSelect(option.value)
                close()
              }}
            >
              {option.label}
            </FixedPortalMenuItem>
          ))
        )
      }
    </FixedPortalMenu>
  )
}
