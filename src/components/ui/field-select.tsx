'use client'

import type { ReactNode } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
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
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'flex items-center justify-between gap-2 text-left',
          variant === 'default' && 'input-field',
          variant === 'shell' &&
            'h-7 rounded border border-border/70 bg-white px-2 text-xs font-medium shadow-none outline-none focus-visible:ring-0',
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected?.icon}
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className={cn(
              'shrink-0 text-muted-foreground',
              variant === 'shell' ? 'h-3 w-3 text-muted-foreground/80' : 'h-4 w-4',
            )}
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-[100] max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-3 pr-3 text-sm outline-none data-[highlighted]:bg-foreground/[0.04] data-[state=checked]:font-medium"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-brand" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                {option.icon}
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
