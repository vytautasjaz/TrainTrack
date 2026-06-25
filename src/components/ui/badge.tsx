import { cn } from '@/lib/utils'
import * as React from 'react'

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
      {...props}
    />
  )
}
