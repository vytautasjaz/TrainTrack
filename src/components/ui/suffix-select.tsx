'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import {
  SelectDropdownContent,
  SelectDropdownItem,
  type SelectDropdownOption,
} from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

type SuffixSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectDropdownOption[]
  'aria-label'?: string
}

/** Unit/type suffix inside a bordered value+unit field */
export function SuffixSelect({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
}: SuffixSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className="inline-flex h-full min-w-[2.75rem] items-center justify-center gap-0.5 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0 data-[state=open]:text-foreground"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectDropdownContent align="end">
        {options.map((option) => (
          <SelectDropdownItem key={option.value} option={option} />
        ))}
      </SelectDropdownContent>
    </SelectPrimitive.Root>
  )
}

type FillSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectDropdownOption[]
  placeholder: string
  align?: 'start' | 'end'
}

/** Full-width select inside a bordered value+unit field */
export function FillSelect({
  value,
  onValueChange,
  options,
  placeholder,
  align = 'start',
}: FillSelectProps) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-7 w-full items-center gap-0.5 px-2 text-left text-xs font-medium focus:outline-none focus-visible:ring-0',
          !value && 'text-muted-foreground',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectDropdownContent align={align}>
        {options.map((option) => (
          <SelectDropdownItem key={option.value} option={option} />
        ))}
      </SelectDropdownContent>
    </SelectPrimitive.Root>
  )
}
