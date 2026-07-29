'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export const SELECT_DROPDOWN_CONTENT_CLASS =
  'z-[200] max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-border bg-card py-1 shadow-lg'

export type SelectDropdownOption = { value: string; label: string }

export function SelectDropdownItem({ option }: { option: SelectDropdownOption }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      className="relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export function SelectDropdownContent({
  children,
  align = 'start',
  className,
}: {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(SELECT_DROPDOWN_CONTENT_CLASS, className)}
        position="popper"
        sideOffset={4}
        align={align}
      >
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}
