'use client'

import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'

type SegmentedControlProps = HTMLAttributes<HTMLDivElement> & {
  'aria-label': string
}

export function SegmentedControl({ className, children, ...props }: SegmentedControlProps) {
  return (
    <div
      className={cn('segmented-control inline-flex', className)}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

type SegmentedControlItemProps = ButtonHTMLAttributes<HTMLElement> & {
  active?: boolean
  asChild?: boolean
}

export function SegmentedControlItem({
  className,
  active = false,
  asChild = false,
  type,
  ...props
}: SegmentedControlItemProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      role="tab"
      aria-selected={active}
      type={asChild ? undefined : type ?? 'button'}
      className={cn(
        'segmented-control-item',
        active ? 'segmented-control-item-active' : 'segmented-control-item-inactive',
        className,
      )}
      {...props}
    />
  )
}
