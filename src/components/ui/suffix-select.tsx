'use client'

import { ChevronDown } from 'lucide-react'
import {
  FixedPortalMenu,
  FixedPortalMenuItem,
} from '@/components/ui/fixed-portal-menu'
import type { SelectDropdownOption } from '@/components/ui/select-dropdown'
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
  const selected = options.find((option) => option.value === value)

  return (
    <FixedPortalMenu
      role="listbox"
      aria-label={ariaLabel}
      align="end"
      trigger={({ open, props }) => (
        <button
          {...props}
          aria-label={ariaLabel}
          className="inline-flex h-full min-w-[2.75rem] items-center justify-center gap-0.5 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-0 data-[state=open]:text-foreground"
          data-state={open ? 'open' : 'closed'}
        >
          <span>{selected?.label ?? value}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
        </button>
      )}
    >
      {(close) =>
        options.map((option) => (
          <FixedPortalMenuItem
            key={option.value}
            role="option"
            selected={option.value === value}
            onSelect={() => {
              onValueChange(option.value)
              close()
            }}
          >
            {option.label}
          </FixedPortalMenuItem>
        ))
      }
    </FixedPortalMenu>
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
  const selected = options.find((option) => option.value === value)

  return (
    <FixedPortalMenu
      role="listbox"
      align={align}
      matchTriggerWidth
      className="w-full"
      trigger={({ props }) => (
        <button
          {...props}
          className={cn(
            'flex h-7 w-full items-center gap-0.5 px-2 text-left text-xs font-medium focus:outline-none focus-visible:ring-0',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
        </button>
      )}
    >
      {(close) =>
        options.map((option) => (
          <FixedPortalMenuItem
            key={option.value}
            role="option"
            selected={option.value === value}
            onSelect={() => {
              onValueChange(option.value)
              close()
            }}
          >
            {option.label}
          </FixedPortalMenuItem>
        ))
      }
    </FixedPortalMenu>
  )
}
