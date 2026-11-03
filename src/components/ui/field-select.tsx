'use client'

import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  FixedPortalMenu,
  FixedPortalMenuItem,
} from '@/components/ui/fixed-portal-menu'
import { cn } from '@/lib/utils'

export type FieldSelectOption = {
  value: string
  label: string
  icon?: ReactNode
}

type FieldSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: FieldSelectOption[]
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
  'aria-label'?: string
  /** Match compact value+unit shells in the workout builder. */
  variant?: 'default' | 'shell'
}

export function FieldSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  id,
  disabled,
  'aria-label': ariaLabel,
  variant = 'default',
}: FieldSelectProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <FixedPortalMenu
      role="listbox"
      aria-label={ariaLabel}
      matchTriggerWidth
      className="w-full"
      menuClassName="max-h-[min(24rem,50vh)] p-1"
      trigger={({ open, props }) => (
        <button
          {...props}
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'flex w-full items-center justify-between gap-2 text-left',
            variant === 'default' && 'input-field',
            variant === 'shell' &&
              'h-7 rounded border border-border/70 bg-white px-2 text-xs font-medium shadow-none outline-none focus-visible:ring-0',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
            {selected?.icon}
            <span
              className={cn(!selected && 'text-muted-foreground')}
            >
              {selected?.label ?? placeholder ?? 'Select'}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'shrink-0 text-muted-foreground transition',
              variant === 'shell'
                ? 'h-3 w-3 text-muted-foreground/80'
                : 'h-4 w-4',
              open && 'rotate-180',
            )}
          />
        </button>
      )}
    >
      {(close) =>
        options.map((option) => {
          const isSelected = option.value === value
          return (
            <FixedPortalMenuItem
              key={option.value}
              role="option"
              selected={isSelected}
              className="rounded-md"
              onSelect={() => {
                onValueChange(option.value)
                close()
              }}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {isSelected ? (
                  <Check className="h-4 w-4 text-brand" />
                ) : null}
              </span>
              {option.icon}
              <span>{option.label}</span>
            </FixedPortalMenuItem>
          )
        })
      }
    </FixedPortalMenu>
  )
}
