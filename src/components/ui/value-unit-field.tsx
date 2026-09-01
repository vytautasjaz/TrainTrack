'use client'

import type { ReactNode } from 'react'
import { FieldGroupLabel } from '@/components/ui/field-group-label'
import { SuffixSelect } from '@/components/ui/suffix-select'
import type { SelectDropdownOption } from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

export const VALUE_UNIT_SHELL_CLASS =
  'inline-flex h-7 max-w-full min-w-[6.5rem] items-stretch overflow-visible rounded border border-border/70 bg-white'

type ValueUnitFieldProps = {
  label: string
  children: ReactNode
  className?: string
  shellClassName?: string
  /** When false, render value-only (no unit select). */
  showUnit?: boolean
  unitValue?: string
  onUnitChange?: (value: string) => void
  unitOptions?: SelectDropdownOption[]
  unitAriaLabel?: string
}

export function ValueUnitField({
  label,
  children,
  className,
  shellClassName,
  showUnit = true,
  unitValue,
  onUnitChange,
  unitOptions,
  unitAriaLabel,
}: ValueUnitFieldProps) {
  const withUnit =
    showUnit && unitValue != null && onUnitChange != null && unitOptions != null

  return (
    <div className={cn('min-w-0', className)}>
      <FieldGroupLabel>{label}</FieldGroupLabel>
      <div className={cn(VALUE_UNIT_SHELL_CLASS, shellClassName)}>
        <div className="relative min-w-0 flex-1">{children}</div>
        {withUnit ? (
          <>
            <div className="w-px shrink-0 self-stretch bg-border" />
            <div className="relative shrink-0">
              <SuffixSelect
                value={unitValue}
                onValueChange={onUnitChange}
                options={unitOptions}
                aria-label={unitAriaLabel}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
