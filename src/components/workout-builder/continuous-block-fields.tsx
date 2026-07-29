'use client'

import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock } from '@/lib/workout-builder/types'
import { ContinuousBlockRow } from '@/components/workout-builder/builder-segment-editor'
import { cn } from '@/lib/utils'

type ContinuousBlockFieldsProps = {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  sportType: WorkoutType
  intensityLabel?: string
  className?: string
  embedded?: boolean
}

export function ContinuousBlockFields({
  block,
  onChange,
  sportType,
  className,
  embedded,
}: ContinuousBlockFieldsProps) {
  return (
    <ContinuousBlockRow
      block={block}
      onChange={onChange}
      sportType={sportType}
      rowLabel="Session"
      showIntensity={block.type !== 'REST'}
      className={cn(className)}
      embedded={embedded}
    />
  )
}
