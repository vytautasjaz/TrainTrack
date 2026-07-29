'use client'

import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type PredictionCardSplit = {
  label: string
  value: string
}

export type PredictionCardItem = {
  id: string
  label: string
  value: string
  icon: LucideIcon
  iconClassName?: string
  placeholder?: string
  editable?: boolean
  invalid?: boolean
  /** Optional leg splits shown under the main value (e.g. swim / bike / run). */
  splits?: PredictionCardSplit[]
  caption?: string
}

type CalculatorPredictionGridProps = {
  title?: string
  items: PredictionCardItem[]
  onValueChange?: (id: string, value: string) => void
  onValueBlur?: (id: string) => void
  onValueFocus?: (id: string) => void
  className?: string
}

export function CalculatorPredictionGrid({
  title = 'Predicted finish times',
  items,
  onValueChange,
  onValueBlur,
  onValueFocus,
  className,
}: CalculatorPredictionGridProps) {
  const hasSplits = items.some((item) => item.splits && item.splits.length > 0)

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div
        className={cn(
          'grid gap-2.5',
          hasSplits ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        {items.map(
          ({
            id,
            label,
            value,
            icon: Icon,
            iconClassName,
            placeholder,
            editable,
            invalid,
            splits,
            caption,
          }) => {
            const detailed = Boolean(splits && splits.length > 0)

            return (
              <div key={id} className="card-elevated flex flex-col gap-2 p-3.5 sm:p-4">
                {detailed ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground',
                          iconClassName,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      {caption ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">{caption}</p>
                      ) : null}
                    </div>
                    <p className="pt-1 text-lg font-bold tabular-nums leading-none tracking-tight sm:text-xl">
                      {value}
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground',
                        iconClassName,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    {editable && onValueChange ? (
                      <div>
                        <Input
                          value={value === '—' ? '' : value}
                          onChange={(e) => onValueChange(id, e.target.value)}
                          onFocus={() => onValueFocus?.(id)}
                          onBlur={() => onValueBlur?.(id)}
                          placeholder={placeholder}
                          inputMode="numeric"
                          variant="ghost"
                          className="w-full text-lg font-bold tabular-nums leading-none tracking-tight sm:text-xl"
                          aria-label={`${label} finish time`}
                        />
                        {invalid ? (
                          <p className="mt-1 text-[10px] text-destructive">Invalid time</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-lg font-bold tabular-nums leading-none tracking-tight sm:text-xl">
                        {value}
                      </p>
                    )}
                  </>
                )}

                {detailed ? (
                  <ul className="mt-1 space-y-1 border-t border-border/40 pt-2">
                    {splits!.map((split) => (
                      <li
                        key={split.label}
                        className="flex items-center justify-between gap-2 text-xs tabular-nums"
                      >
                        <span className="text-muted-foreground">{split.label}</span>
                        <span className="font-medium text-foreground">{split.value}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          },
        )}
      </div>
    </section>
  )
}
