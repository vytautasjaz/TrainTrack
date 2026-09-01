import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FieldGroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'mb-0.5 block text-[10px] font-medium leading-none tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}
