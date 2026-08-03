'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Calculator-style list of zone rows (label left, value right). */
export function PreferenceZoneList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[6px] border border-border/60 bg-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

type PreferenceZoneRowProps = {
  label: string
  hint?: string
  unit?: string
  children: ReactNode
  className?: string
}

export function PreferenceZoneRow({
  label,
  hint,
  unit,
  children,
  className,
}: PreferenceZoneRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0 sm:gap-4 sm:px-4 sm:py-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-baseline justify-end gap-1">
        {children}
        {unit ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Bold tabular value input — same language as Tools calculators. */
export const PREFERENCE_VALUE_INPUT_CLASS =
  'w-[5.75rem] text-right text-xl font-bold tabular-nums tracking-tight placeholder:font-semibold placeholder:text-muted-foreground/35 sm:w-[6.5rem] sm:text-2xl'
