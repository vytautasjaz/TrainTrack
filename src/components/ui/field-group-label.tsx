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
    <span className={cn('mb-1 block text-xs font-medium text-muted-foreground', className)}>
      {children}
    </span>
  )
}
