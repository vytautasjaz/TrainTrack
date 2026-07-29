'use client'

import type { WorkoutType } from '@prisma/client'
import type { Target } from '@/lib/workout-builder/types'
import { primaryTarget } from '@/lib/workout-builder/target-helpers'
import { IntensityFieldGroup } from '@/components/workout-builder/builder-segment-editor'
import { cn } from '@/lib/utils'

type IntensityTargetInputProps = {
  sportType: WorkoutType
  targets?: Target[]
  onChange: (targets: Target[]) => void
  label?: string
  className?: string
  compact?: boolean
}

export function IntensityTargetInput({
  sportType,
  targets,
  onChange,
  label = 'Intensity',
  className,
  compact = false,
}: IntensityTargetInputProps) {
  const target = primaryTarget({ targets }, sportType)

  if (compact) {
    return (
      <IntensityFieldGroup
        target={target}
        onChange={(t) => onChange([t])}
        sportType={sportType}
        className={className}
      />
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <IntensityFieldGroup target={target} onChange={(t) => onChange([t])} sportType={sportType} />
    </div>
  )
}
