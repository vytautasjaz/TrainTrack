'use client'

import type { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutBlock } from '@/lib/workout-builder/types'
import { describeEstimatedSegment } from '@/lib/workout-builder/segment-estimation'
import {
  primaryTarget,
  recoveryTarget,
  setRecoveryTarget,
  setWorkTarget,
} from '@/lib/workout-builder/target-helpers'
import {
  BlockCard,
  DurationFieldGroup,
  IntervalRow,
  RepeatsRow,
} from '@/components/workout-builder/builder-segment-editor'
import { Caption } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

type IntervalBlockRowProps = {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  sportType: WorkoutType
  athletePreferences?: AthletePreferences | null
  className?: string
  embedded?: boolean
}

export function IntervalBlockRow({
  block,
  onChange,
  sportType,
  athletePreferences,
  className,
  embedded,
}: IntervalBlockRowProps) {
  const work = block.work ?? { mode: 'distance' as const, value: 1000, unit: 'm' as const }
  const recovery = block.recovery ?? { mode: 'time' as const, value: 2, unit: 'min' as const }
  const workTarget = primaryTarget({ targets: block.targets }, sportType)
  const restTarget = recoveryTarget(block.targets, sportType)
  const workEstimate = describeEstimatedSegment(work, 'work', block.targets, athletePreferences)
  const recoveryEstimate = describeEstimatedSegment(
    recovery,
    'recovery',
    block.targets,
    athletePreferences,
  )
  const estimate = [workEstimate, recoveryEstimate].filter(Boolean).join(' · ')

  return (
    <div className={cn('min-w-0', className)}>
      <BlockCard>
        <RepeatsRow
          value={block.repetitions ?? 1}
          onChange={(repetitions) => onChange({ repetitions })}
        />
        <IntervalRow
          rowLabel="Interval"
          segment={work}
          onSegmentChange={(work) => onChange({ work })}
          target={workTarget}
          onTargetChange={(target) =>
            onChange({ targets: setWorkTarget(block.targets, target, sportType) })
          }
          sportType={sportType}
          bordered
        />
        <IntervalRow
          rowLabel="Rest"
          segment={recovery}
          onSegmentChange={(recovery) => onChange({ recovery })}
          target={restTarget}
          onTargetChange={(target) =>
            onChange({ targets: setRecoveryTarget(block.targets, target, sportType) })
          }
          sportType={sportType}
        />
      </BlockCard>
      {estimate ? <Caption className="mt-1.5 truncate px-0.5 text-[11px]">{estimate}</Caption> : null}
    </div>
  )
}

type RepetitionBlockRowProps = {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  className?: string
  embedded?: boolean
}

export function RepetitionBlockRow({ block, onChange, className, embedded }: RepetitionBlockRowProps) {
  const work = block.work ?? { mode: 'distance' as const, value: 100, unit: 'm' as const }

  return (
    <BlockCard className={className}>
      <RepeatsRow
        value={block.repetitions ?? 1}
        onChange={(repetitions) => onChange({ repetitions })}
      />
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="w-20 shrink-0 pt-1 text-xs font-semibold text-foreground">Effort</span>
        <DurationFieldGroup
          segment={work}
          onChange={(work) => onChange({ work })}
          className="min-w-0 flex-1"
        />
      </div>
    </BlockCard>
  )
}
