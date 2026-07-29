'use client'

import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock } from '@/lib/workout-builder/types'
import {
  primaryTarget,
  recoveryTarget,
  setRecoveryTarget,
  setWorkTarget,
} from '@/lib/workout-builder/target-helpers'
import {
  DurationFieldGroup,
  IntensityFieldGroup,
  ProgressiveBlockRow,
  type IntensityOption,
} from '@/components/workout-builder/builder-segment-editor'
import { NumberInput } from '@/components/ui/number-input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-t border-border/40 pt-3 first:border-t-0 first:pt-0', className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

type WorkoutDetailsExpandedFieldsProps = {
  block: WorkoutBlock
  sportType: WorkoutType
  athletePreferences?: unknown
  onChange: (block: WorkoutBlock) => void
}

const RUN_INTERVAL_RECOVERY_OPTIONS: IntensityOption[] = [
  { value: 'rpe', label: 'Effort', targetType: 'rpe' },
  { value: 'pace', label: 'Pace', targetType: 'pace' },
  { value: 'heartRate', label: 'HR', targetType: 'heartRate' },
  {
    value: 'standingRecovery',
    label: 'Standing recovery',
    targetType: 'rpe',
    presetValue: 'Standing recovery',
  },
  {
    value: 'walkingRecovery',
    label: 'Walking recovery',
    targetType: 'rpe',
    presetValue: 'Walking recovery',
  },
  {
    value: 'jogRecovery',
    label: 'Jog recovery',
    targetType: 'rpe',
    presetValue: 'Jog recovery',
  },
]

export function WorkoutDetailsExpandedFields({
  block,
  sportType,
  onChange,
}: WorkoutDetailsExpandedFieldsProps) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  if (block.type === 'FREE_TEXT') {
    return (
      <Textarea
        value={block.text ?? ''}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Coaching notes for this block..."
        rows={3}
        variant="ghost"
        className="min-h-[4rem] text-sm"
      />
    )
  }

  if (block.type === 'PROGRESSIVE') {
    return (
      <ProgressiveBlockRow
        block={block}
        onChange={(patch) => onChange({ ...block, ...patch })}
        sportType={sportType}
      />
    )
  }

  if (block.type === 'INTERVAL') {
    const work = block.work ?? { mode: 'time' as const, value: 10, unit: 'min' as const }
    const recovery = block.recovery ?? { mode: 'time' as const, value: 2, unit: 'min' as const }
    const workTarget = primaryTarget({ targets: block.targets }, sportType)
    const restTarget = recoveryTarget(block.targets, sportType)
    const recoveryOptions =
      sportType === 'RUN' ? RUN_INTERVAL_RECOVERY_OPTIONS : undefined

    return (
      <div className="space-y-3">
        <Section title="Repeat">
          <div className="flex items-center gap-2">
            <NumberInput
              value={block.repetitions ?? 1}
              onChange={(repetitions) => update({ repetitions })}
              min={1}
              integer
              inputMode="numeric"
              className="h-9 w-14 rounded-[6px] border border-border bg-card px-2 text-center text-sm font-semibold"
              aria-label="Repeat count"
            />
            <span className="text-sm text-muted-foreground">times</span>
          </div>
        </Section>
        <Section title="Work">
          <div className="grid gap-3 sm:grid-cols-2">
            <DurationFieldGroup segment={work} onChange={(work) => update({ work })} />
            <IntensityFieldGroup
              target={workTarget}
              onChange={(target) =>
                update({ targets: setWorkTarget(block.targets, target, sportType) })
              }
              sportType={sportType}
              fieldLabel="Target"
            />
          </div>
        </Section>
        <Section title="Recovery">
          <div className="grid gap-3 sm:grid-cols-2">
            <DurationFieldGroup segment={recovery} onChange={(recovery) => update({ recovery })} />
            <IntensityFieldGroup
              target={restTarget}
              onChange={(target) =>
                update({ targets: setRecoveryTarget(block.targets, target, sportType) })
              }
              sportType={sportType}
              fieldLabel="Target"
              intensityOptions={recoveryOptions}
            />
          </div>
        </Section>
      </div>
    )
  }

  if (block.type === 'REPETITION') {
    const work = block.work ?? { mode: 'distance' as const, value: 100, unit: 'm' as const }
    return (
      <div className="space-y-3">
        <Section title="Repeat">
          <div className="flex items-center gap-2">
            <NumberInput
              value={block.repetitions ?? 1}
              onChange={(repetitions) => update({ repetitions })}
              min={1}
              integer
              inputMode="numeric"
              className="h-9 w-14 rounded-[6px] border border-border bg-card px-2 text-center text-sm font-semibold"
              aria-label="Repeat count"
            />
            <span className="text-sm text-muted-foreground">times</span>
          </div>
        </Section>
        <Section title="Effort">
          <DurationFieldGroup segment={work} onChange={(work) => update({ work })} />
        </Section>
      </div>
    )
  }

  const segment =
    block.durationType === 'distance'
      ? {
          mode: 'distance' as const,
          value: block.distance ?? 0,
          unit: (block.distanceUnit === 'm' ? 'm' : 'km') as 'm' | 'km',
        }
      : { mode: 'time' as const, value: block.time ?? 0, unit: 'min' as const }

  const target = primaryTarget({ targets: block.targets }, sportType)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DurationFieldGroup
        segment={segment}
        onChange={(next) => {
          if (next.unit === 'm' || next.unit === 'km') {
            update({
              durationType: 'distance',
              distance: next.value,
              distanceUnit: next.unit,
            })
          } else {
            update({ durationType: 'time', time: next.value })
          }
        }}
      />
      {block.type !== 'REST' ? (
        <IntensityFieldGroup
          target={target}
          onChange={(t) => update({ targets: [t] })}
          sportType={sportType}
          fieldLabel="Target"
        />
      ) : null}
    </div>
  )
}
