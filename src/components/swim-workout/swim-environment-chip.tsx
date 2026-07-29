'use client'

import { ChevronDown } from 'lucide-react'
import { SwimEnvironment } from '@prisma/client'
import { swimEnvironmentShortLabel } from '@/lib/swim-workout/ui'
import { cn } from '@/lib/utils'

type SwimEnvironmentChipProps = {
  value: SwimEnvironment
  onChange: (value: SwimEnvironment) => void
  className?: string
}

/** Compact Pool / Open Water control for the workout card corner. */
export function SwimEnvironmentChip({ value, onChange, className }: SwimEnvironmentChipProps) {
  function toggle() {
    onChange(
      value === SwimEnvironment.POOL ? SwimEnvironment.OPEN_WATER : SwimEnvironment.POOL,
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-sky-800 shadow-none transition hover:bg-sky-50',
        className,
      )}
      aria-label={`Environment: ${swimEnvironmentShortLabel(value)}. Click to switch.`}
      title="Toggle pool / open water"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          value === SwimEnvironment.POOL ? 'bg-sky-500' : 'bg-cyan-600',
        )}
        aria-hidden
      />
      {swimEnvironmentShortLabel(value)}
      <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
    </button>
  )
}
