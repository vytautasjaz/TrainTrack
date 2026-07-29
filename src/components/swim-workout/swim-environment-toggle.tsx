'use client'

import { SwimEnvironment } from '@prisma/client'
import { cn } from '@/lib/utils'

type SwimEnvironmentToggleProps = {
  value: SwimEnvironment
  onChange: (value: SwimEnvironment) => void
}

export function SwimEnvironmentToggle({ value, onChange }: SwimEnvironmentToggleProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => onChange(SwimEnvironment.POOL)}
        className={cn(
          'rounded-full px-2 py-0.5 transition',
          value === SwimEnvironment.POOL
            ? 'bg-muted/80 text-foreground'
            : 'hover:bg-muted/40 hover:text-foreground',
        )}
      >
        Pool
      </button>
      <span className="text-muted-foreground/40">·</span>
      <button
        type="button"
        onClick={() => onChange(SwimEnvironment.OPEN_WATER)}
        className={cn(
          'rounded-full px-2 py-0.5 transition',
          value === SwimEnvironment.OPEN_WATER
            ? 'bg-muted/80 text-foreground'
            : 'hover:bg-muted/40 hover:text-foreground',
        )}
      >
        Open water
      </button>
    </div>
  )
}
