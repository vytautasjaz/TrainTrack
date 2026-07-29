'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CalculatorCustomRowProps = {
  title?: string
  input: ReactNode
  resultLabel?: string
  result: ReactNode
  className?: string
}

export function CalculatorCustomRow({
  title = 'Custom distance',
  input,
  resultLabel = 'Predicted time',
  result,
  className,
}: CalculatorCustomRowProps) {
  return (
    <section className={cn('card-elevated p-4 sm:p-5', className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end sm:gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {input}
        </div>
        <div className="space-y-2 sm:border-l sm:border-border/40 sm:pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {resultLabel}
          </p>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{result}</div>
        </div>
      </div>
    </section>
  )
}
