'use client'

import type { WorkoutBlock } from '@/lib/workout-builder/types'
import { getBlockCompactDisplay } from '@/lib/workout-builder/block-compact-display'
import { cn } from '@/lib/utils'

type WorkoutBlockCompactSummaryProps = {
  block: WorkoutBlock
  className?: string
  /** Interval blocks: stack columns on very narrow widths */
  dense?: boolean
}

function Column({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0 flex-1 px-2 first:pl-0', className)}>
      <p className="truncate text-[13px] font-semibold leading-snug text-[#111827]">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

export function WorkoutBlockCompactSummary({
  block,
  className,
  dense,
}: WorkoutBlockCompactSummaryProps) {
  const display = getBlockCompactDisplay(block)

  if (display.layout === 'text') {
    return (
      <p className={cn('truncate text-[13px] text-[#6B7280]', className)}>{display.preview}</p>
    )
  }

  if (display.layout === 'continuous') {
    return (
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center justify-end gap-4 text-right sm:gap-6',
          className,
        )}
      >
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#111827]">
          {display.duration}
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium text-[#6B7280] sm:max-w-[8rem]">
          {display.intensity}
        </span>
      </div>
    )
  }

  if (display.layout === 'progressive') {
    return (
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center justify-end gap-4 text-right sm:gap-6',
          className,
        )}
      >
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#111827]">
          {display.duration}
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium text-[#6B7280] sm:max-w-[14rem]">
          {display.preview}
        </span>
      </div>
    )
  }

  if (display.layout === 'repetition') {
    return (
      <div
        className={cn(
          'flex min-w-0 flex-1 items-stretch divide-x divide-border/50',
          dense && 'flex-col divide-x-0 divide-y',
          className,
        )}
      >
        <Column label="Repeat" value={display.repeat} />
        <Column label="Effort" value={display.effort} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-stretch divide-x divide-border/50',
        dense ? 'flex-col gap-2 divide-x-0' : 'mt-0 sm:mt-0',
        className,
      )}
    >
      {display.columns.map((col, i) => (
        <Column key={col.label} label={col.label} value={col.value} className={i === 0 ? 'sm:max-w-[4.5rem]' : undefined} />
      ))}
    </div>
  )
}
