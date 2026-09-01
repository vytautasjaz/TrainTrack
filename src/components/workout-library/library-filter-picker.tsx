'use client'

import type { ReactNode } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

export type LibraryFilterOption = {
  value: string
  label: string
  icon?: ReactNode
  count?: number
}

export function LibraryFilterPicker({
  label,
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: LibraryFilterOption[]
  'aria-label'?: string
}) {
  const selected = options.find((option) => option.value === value)

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="w-14 shrink-0 text-[0.5625rem] font-medium uppercase tracking-[0.1em] text-[var(--tt-ink-faint,#9a9a9a)]">
        {label}
      </p>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          aria-label={ariaLabel}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-[6px] py-1 text-left outline-none transition hover:bg-[var(--tt-sidebar,#f5f5f5)] focus-visible:bg-[var(--tt-sidebar,#f5f5f5)]"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {selected?.icon ? (
              <span className="flex shrink-0 items-center justify-center">
                {selected.icon}
              </span>
            ) : null}
            <span className="truncate text-[13px] font-semibold text-[var(--tt-ink,#111)]">
              {selected?.label ?? 'Select…'}
            </span>
            {selected?.count != null ? (
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                {selected.count}
              </span>
            ) : null}
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)] transition group-data-[state=open]:rotate-180"
              strokeWidth={1.75}
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-[200] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--tt-line,#ebebeb)] bg-white shadow-md"
            position="popper"
            sideOffset={4}
            align="start"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-2 pr-3 text-[13px] outline-none data-[highlighted]:bg-[var(--tt-sidebar,#f5f5f5)] data-[state=checked]:font-semibold"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check
                        className="h-3.5 w-3.5 text-[var(--tt-ink,#111)]"
                        strokeWidth={2}
                      />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  {option.icon ? (
                    <span className="flex shrink-0 items-center justify-center">
                      {option.icon}
                    </span>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  {option.count != null ? (
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                      {option.count}
                    </span>
                  ) : null}
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}
