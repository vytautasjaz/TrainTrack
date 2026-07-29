'use client'

import type { ReactNode } from 'react'
import { FieldGroupLabel } from '@/components/ui/field-group-label'
import { SuffixSelect } from '@/components/ui/suffix-select'
import type { SelectDropdownOption } from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

export const VALUE_UNIT_SHELL_CLASS =
  'inline-flex h-10 max-w-full min-w-[8.5rem] items-stretch overflow-visible rounded-md border border-border/80 bg-transparent'

type ValueUnitFieldProps = {
  label: string
  unitValue: string
  onUnitChange: (value: string) => void
  unitOptions: SelectDropdownOption[]
  unitAriaLabel?: string
  children: ReactNode
  className?: string
  shellClassName?: string
}

export function ValueUnitField({
  label,
  unitValue,
  onUnitChange,
  unitOptions,
  unitAriaLabel,
  children,
  className,
  shellClassName,
}: ValueUnitFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <FieldGroupLabel>{label}</FieldGroupLabel>
      <div className={cn(VALUE_UNIT_SHELL_CLASS, shellClassName)}>
        <div className="relative min-w-0 flex-1">{children}</div>
        <div className="w-px shrink-0 self-stretch bg-border" />
        <div className="relative shrink-0">
          <SuffixSelect
            value={unitValue}
            onValueChange={onUnitChange}
            options={unitOptions}
            aria-label={unitAriaLabel}
          />
        </div>
      </div>
    </div>
  )
}
