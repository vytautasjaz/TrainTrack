'use client'

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'

type PillSelectProps = HTMLAttributes<HTMLDivElement>

export function PillSelect({ className, children, ...props }: PillSelectProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  )
}

type PillSelectItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  activeClassName?: string
}

export function PillSelectItem({
  className,
  selected = false,
  activeClassName,
  type = 'button',
  ...props
}: PillSelectItemProps) {
  return (
    <button
      type={type}
      className={cn(
        'pill-select-item',
        selected
          ? activeClassName ?? 'pill-select-item-active'
          : 'pill-select-item-inactive',
        className,
      )}
      {...props}
    />
  )
}
