'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  SelectDropdownContent,
  SelectDropdownItem,
  type SelectDropdownOption,
} from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

const inlineSelectTriggerClass = cn(
  'bg-transparent text-center font-bold text-sm text-foreground outline-none',
  'inline-flex w-auto cursor-pointer items-center justify-center gap-0.5 rounded-none px-0.5 pb-0.5',
  'border-b border-border/70 transition-colors hover:border-border hover:text-foreground/80',
  'focus:border-foreground/50 focus:outline-none data-[state=open]:text-foreground',
)

type InlineInputProps = Omit<React.ComponentProps<typeof Input>, 'variant'> & {
  variant?: never
}

export function InlineInput({ className, align = 'center', ...props }: InlineInputProps) {
  return (
    <Input
      variant="inline"
      align={align}
      className={cn('font-bold tabular-nums', className)}
      {...props}
    />
  )
}

type InlineSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectDropdownOption[]
  'aria-label'?: string
  className?: string
}

export function InlineSelect({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  className,
}: InlineSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger aria-label={ariaLabel} className={cn(inlineSelectTriggerClass, className)}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectDropdownContent>
        {options.map((option) => (
          <SelectDropdownItem key={option.value} option={option} />
        ))}
      </SelectDropdownContent>
    </SelectPrimitive.Root>
  )
}

type PageTitleInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  className?: string
}

export function PageTitleInput({ className, ...props }: PageTitleInputProps) {
  return (
    <input
      type="text"
      className={cn(
        'w-full min-w-0 bg-transparent text-lg font-bold text-foreground outline-none',
        'rounded-none px-0.5 py-0.5 cursor-text',
        'border-b border-transparent transition-colors',
        'hover:border-border/50 focus:border-border/70',
        'placeholder:text-muted-foreground/40',
        className,
      )}
      {...props}
    />
  )
}
