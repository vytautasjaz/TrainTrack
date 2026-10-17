'use client'

import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { topicTitleWithOrangeDot } from '@/components/ui/title-with-dot'
import type { PredictionConfidence } from '@/lib/calculators/race-predictor'
import { cn } from '@/lib/utils'

export type PredictionCardSplit = {
  label: string
  value: string
}

export type PredictionCardQuality = {
  band: PredictionConfidence
  label: string
  detail?: string | null
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
  /** Visible prediction-quality badge (Race Predictor). */
  quality?: PredictionCardQuality
}

const QUALITY_BADGE_CLASS: Record<PredictionConfidence, string> = {
  high: 'bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25',
  medium: 'bg-amber-500/15 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  low: 'bg-orange-500/15 text-orange-800 ring-1 ring-inset ring-orange-500/30',
}

const QUALITY_CARD_CLASS: Record<PredictionConfidence, string> = {
  high: 'ring-1 ring-emerald-500/20',
  medium: 'ring-1 ring-amber-500/25',
  low: 'ring-1 ring-orange-500/25',
}

export function PredictionQualityBadge({
  quality,
  className,
}: {
  quality: PredictionCardQuality
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        QUALITY_BADGE_CLASS[quality.band],
        className,
      )}
    >
      {quality.label} confidence
    </span>
  )
}

type CalculatorPredictionGridProps = {
  title?: string
  items: PredictionCardItem[]
  onValueChange?: (id: string, value: string) => void
  onValueBlur?: (id: string) => void
  onValueFocus?: (id: string) => void
  /** Force a fixed column count (e.g. 5 for interval distances). */
  columns?: number
  /** Strong charcoal labels (Race Predictor on gradient). */
  ink?: 'default' | 'strong'
  className?: string
}

export function CalculatorPredictionGrid({
  title = 'Predicted finish times',
  items,
  onValueChange,
  onValueBlur,
  onValueFocus,
  columns,
  ink = 'default',
  className,
}: CalculatorPredictionGridProps) {
  const hasSplits = items.some((item) => item.splits && item.splits.length > 0)
  const compactRow = columns != null && columns >= 5
  const strongInk = ink === 'strong'
  const metaClass = strongInk ? 'text-[#111315]/80' : 'text-muted-foreground'
  const titleClass = strongInk
    ? 'text-sm font-semibold tracking-tight text-[#111315]'
    : 'text-sm font-semibold tracking-tight'

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className={titleClass}>
        {topicTitleWithOrangeDot(title)}
      </h3>
      <div
        className={cn(
          'grid gap-2',
          hasSplits
            ? 'grid-cols-1 sm:grid-cols-2'
            : columns != null
              ? null
              : 'grid-cols-2 sm:grid-cols-4',
          compactRow && 'gap-1.5 sm:gap-2',
        )}
        style={
          columns != null && !hasSplits
            ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
            : undefined
        }
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
            quality,
          }) => {
            const detailed = Boolean(splits && splits.length > 0)
            const qualityDetail = quality?.detail ?? caption

            return (
              <div
                key={id}
                className={cn(
                  'card-elevated flex flex-col gap-2',
                  compactRow ? 'gap-1.5 p-2 sm:p-3' : 'p-3.5 sm:p-4',
                  quality ? QUALITY_CARD_CLASS[quality.band] : null,
                )}
              >
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
                      <p className={cn('text-xs font-medium', metaClass)}>{label}</p>
                      {quality ? (
                        <div className="mt-1.5 space-y-1">
                          <PredictionQualityBadge quality={quality} />
                          {qualityDetail ? (
                            <p className={cn('text-[11px] leading-snug', metaClass)}>
                              {qualityDetail}
                            </p>
                          ) : null}
                        </div>
                      ) : caption ? (
                        <p className={cn('mt-0.5 text-[10px]', metaClass)}>{caption}</p>
                      ) : null}
                    </div>
                    <p className="pt-1 text-lg font-bold tabular-nums leading-none tracking-tight sm:text-xl">
                      {value}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-xl bg-muted/70 text-muted-foreground',
                          compactRow ? 'h-7 w-7' : 'h-8 w-8',
                          iconClassName,
                        )}
                      >
                        <Icon className={cn(compactRow ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
                      </div>
                      {quality ? <PredictionQualityBadge quality={quality} /> : null}
                    </div>
                    <p
                      className={cn(
                        'font-medium',
                        metaClass,
                        compactRow ? 'text-[10px] sm:text-xs' : 'text-xs',
                      )}
                    >
                      {label}
                    </p>
                    {editable && onValueChange ? (
                      <div>
                        <Input
                          value={value === '—' ? '' : value}
                          onChange={(e) => onValueChange(id, e.target.value)}
                          onFocus={() => onValueFocus?.(id)}
                          onBlur={() => onValueBlur?.(id)}
                          placeholder={placeholder}
                          inputMode="decimal"
                          variant="ghost"
                          className={cn(
                            'w-full font-bold tabular-nums leading-none tracking-tight',
                            compactRow
                              ? 'text-sm sm:text-base'
                              : 'text-lg sm:text-xl',
                          )}
                          aria-label={`${label} finish time`}
                        />
                        {invalid ? (
                          <p className="mt-1 text-[10px] text-destructive">Invalid time</p>
                        ) : null}
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'font-bold tabular-nums leading-none tracking-tight',
                          strongInk && 'text-[#111315]',
                          compactRow
                            ? 'text-sm sm:text-base'
                            : 'text-lg sm:text-xl',
                        )}
                      >
                        {value}
                      </p>
                    )}
                    {qualityDetail ? (
                      <p className={cn('text-[11px] leading-snug', metaClass)}>
                        {qualityDetail}
                      </p>
                    ) : null}
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
