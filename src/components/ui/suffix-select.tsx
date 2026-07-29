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
        className="inline-flex h-full min-w-[3.75rem] items-center justify-center gap-1 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0 data-[state=open]:text-foreground"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
          'flex h-10 w-full items-center gap-1 px-3 text-left text-sm font-medium focus:outline-none focus-visible:ring-0',
          !value && 'text-muted-foreground',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
