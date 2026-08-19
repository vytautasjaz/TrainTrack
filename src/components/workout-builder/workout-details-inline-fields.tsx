'use client'

import { useState } from 'react'
import type { WorkoutType } from '@prisma/client'
import type {
  Segment,
  SegmentUnit,
  Target,
  WorkoutBlock,
} from '@/lib/workout-builder/types'
import {
  intensitySuggestions,
  primaryTarget,
  recoveryTarget,
  setRecoveryTarget,
  setWorkTarget,
  simpleTargetTypeLabel,
  simpleTargetTypesForSport,
  targetPlaceholder,
  updateSegmentUnit,
  updateSegmentValue,
} from '@/lib/workout-builder/target-helpers'
import { SuggestableInput } from '@/components/swim-workout/suggestable-input'
import type { IntensityOption } from '@/components/workout-builder/builder-segment-editor'
import { NumberInput } from '@/components/ui/number-input'
import { cn } from '@/lib/utils'

const GHOST_INPUT =
  'min-w-0 bg-transparent text-[13px] font-semibold tabular-nums text-[#111827] outline-none placeholder:font-normal placeholder:text-muted-foreground/40'

/** Unit / type selects — sentence case like mockup (Pace, min, m), not UPPERCASE. */
const GHOST_SELECT =
  'shrink-0 appearance-none bg-transparent text-[11px] font-medium normal-case tracking-normal text-muted-foreground outline-none'

/** Shared with Continuous so duration / @ intensity columns line up across blocks. */
const INLINE_METRIC_GRID =
  'grid w-max max-w-full flex-none grid-cols-[3.25rem_4.75rem_auto] items-center gap-x-2 gap-y-0.5 sm:gap-x-3'

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

type WorkoutDetailsInlineFieldsProps = {
  block: WorkoutBlock
  sportType: WorkoutType
  onChange: (block: WorkoutBlock) => void
  className?: string
}

function IntensityInline({
  target,
  onChange,
  sportType,
  ariaLabel,
  className,
  intensityOptions,
  compact = false,
}: {
  target: Target
  onChange: (target: Target) => void
  sportType: WorkoutType
  ariaLabel: string
  className?: string
  intensityOptions?: IntensityOption[]
  /** Shrink-wrap; don't stretch value field across remaining row width. */
  compact?: boolean
}) {
  const types = simpleTargetTypesForSport(sportType)
  const fallbackType = types.includes(target.type) ? target.type : types[0]!
  const valueNorm = (target.value ?? '').trim().toLowerCase()
  const matchedPreset = intensityOptions?.find(
    (option) =>
      Boolean(option.presetValue) &&
      option.targetType === target.type &&
      valueNorm === option.presetValue!.trim().toLowerCase(),
  )
  const matchedTypeOption = intensityOptions?.find(
    (option) => option.targetType === target.type && !option.presetValue,
  )
  const matchedCustom = matchedPreset ?? matchedTypeOption
  const type = matchedCustom?.targetType ?? fallbackType
  const selectedValue = matchedCustom?.value ?? type

  const options: IntensityOption[] =
    intensityOptions ??
    types.map((t) => ({
      value: t,
      label: simpleTargetTypeLabel(t),
      targetType: t,
    }))

  const selectedOption = options.find((item) => String(item.value) === String(selectedValue))
  const isPreset = Boolean(selectedOption?.presetValue)
  /** Visible type label stays short (Effort/Pace/HR) even when a recovery preset is selected. */
  const displayTypeLabel = isPreset
    ? simpleTargetTypeLabel(selectedOption!.targetType)
    : (selectedOption?.label ?? simpleTargetTypeLabel(type))

  return (
    <div className={cn('flex items-center gap-1.5', compact ? 'w-max max-w-full' : 'min-w-0', className)}>
      <div className="flex shrink-0 items-center gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground">@</span>
        <div className="relative inline-grid w-[3.25rem] shrink-0">
          <span
            aria-hidden
            className="col-start-1 row-start-1 whitespace-nowrap text-[11px] font-medium normal-case tracking-normal text-muted-foreground"
          >
            {displayTypeLabel}
          </span>
          <select
            value={selectedValue}
            onChange={(e) => {
              const option = options.find((item) => String(item.value) === e.target.value)
              if (!option) return
              onChange({
                type: option.targetType,
                value:
                  option.presetValue ??
                  (target.type === option.targetType && !selectedOption?.presetValue
                    ? target.value
                    : ''),
              })
            }}
            aria-label={`${ariaLabel} type`}
            className={cn(
              GHOST_SELECT,
              'col-start-1 row-start-1 w-full min-w-0 cursor-pointer p-0 opacity-0',
            )}
          >
            {options.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isPreset ? (
        <span className="whitespace-nowrap text-[13px] font-normal text-[#111827]">
          {selectedOption?.presetValue}
        </span>
      ) : (
        <SuggestableInput
          value={target.value ?? ''}
          onChange={(value) => onChange({ type, value })}
          suggestions={intensitySuggestions(type, sportType)}
          placeholder={targetPlaceholder(type, sportType)}
          aria-label={ariaLabel}
          className={cn(
            'pl-0 font-normal text-[#111827]',
            compact ? 'w-[4.5rem] flex-none sm:w-[5rem]' : 'min-w-[2.75rem] flex-1 sm:min-w-[3.25rem]',
          )}
        />
      )}
    </div>
  )
}

function DurationInline({
  segment,
  onChange,
  ariaLabel = 'Duration',
  className,
}: {
  segment: Segment
  onChange: (segment: Segment) => void
  ariaLabel?: string
  className?: string
}) {
  const units: SegmentUnit[] = ['km', 'm', 'min', 'sec']
  return (
    <div className={cn('flex shrink-0 items-baseline gap-0.5 tabular-nums', className)}>
      <input
        type="number"
        min={0}
        step="any"
        value={segment.value || ''}
        onChange={(e) =>
          onChange(updateSegmentValue(segment, parseFloat(e.target.value) || 0))
        }
        placeholder="0"
        aria-label={ariaLabel}
        className={cn(GHOST_INPUT, 'w-12 text-center')}
      />
      <select
        value={segment.unit}
        onChange={(e) =>
          onChange(updateSegmentUnit(segment, e.target.value as SegmentUnit))
        }
        aria-label={`${ariaLabel} unit`}
        className={GHOST_SELECT}
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  )
}

function continuousSegment(block: WorkoutBlock): Segment {
  if (block.durationType === 'distance') {
    return {
      mode: 'distance',
      value: block.distance ?? 0,
      unit: block.distanceUnit === 'm' ? 'm' : 'km',
    }
  }
  return { mode: 'time', value: block.time ?? 0, unit: 'min' }
}

function applyContinuousSegment(
  block: WorkoutBlock,
  next: Segment,
): Partial<WorkoutBlock> {
  if (next.unit === 'm' || next.unit === 'km') {
    return {
      durationType: 'distance',
      distance: next.value,
      distanceUnit: next.unit,
      time: undefined,
    }
  }
  return {
    durationType: 'time',
    time: next.value,
    distance: undefined,
  }
}

export function WorkoutDetailsInlineFields({
  block,
  sportType,
  onChange,
  className,
}: WorkoutDetailsInlineFieldsProps) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  if (block.type === 'FREE_TEXT') {
    return (
      <input
        value={block.text ?? ''}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Notes…"
        aria-label="Block notes"
        className={cn(GHOST_INPUT, 'w-full font-normal', className)}
        onClick={(e) => e.stopPropagation()}
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
      <div
        className={cn(className, INLINE_METRIC_GRID)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-0.5 tabular-nums">
          <NumberInput
            value={block.repetitions ?? 1}
            onChange={(repetitions) => update({ repetitions })}
            min={1}
            integer
            inputMode="numeric"
            aria-label="Repeats"
            className={cn(GHOST_INPUT, 'w-6 text-center')}
          />
          <span className="text-[11px] text-muted-foreground">×</span>
        </div>
        <DurationInline
          segment={work}
          onChange={(next) => update({ work: next })}
          ariaLabel="Work duration"
        />
        <IntensityInline
          target={workTarget}
          onChange={(target) =>
            update({ targets: setWorkTarget(block.targets, target, sportType) })
          }
          sportType={sportType}
          ariaLabel="Work intensity"
          compact
        />

        <span className="pl-1.5 text-[11px] font-medium text-muted-foreground/70">
          Rest
        </span>
        <DurationInline
          segment={recovery}
          onChange={(next) => update({ recovery: next })}
          ariaLabel="Recovery duration"
        />
        <IntensityInline
          target={restTarget}
          onChange={(target) =>
            update({ targets: setRecoveryTarget(block.targets, target, sportType) })
          }
          sportType={sportType}
          ariaLabel="Recovery intensity"
          intensityOptions={recoveryOptions}
          compact
        />
      </div>
    )
  }

  if (block.type === 'PROGRESSIVE') {
    const segment = continuousSegment(block)
    const start =
      block.startIntensity ??
      primaryTarget({ targets: block.targets }, sportType)
    const end =
      block.endIntensity ??
      ({ type: start.type, value: '' } satisfies Target)

    return (
      <div
        className={cn('flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <DurationInline
          segment={segment}
          onChange={(next) => update(applyContinuousSegment(block, next))}
          ariaLabel="Total duration"
        />
        <IntensityInline
          target={start}
          onChange={(target) =>
            update({
              startIntensity: target,
              targets: [target],
            })
          }
          sportType={sportType}
          ariaLabel="Start intensity"
        />
        <span className="text-[12px] text-muted-foreground">→</span>
        <IntensityInline
          target={end}
          onChange={(target) => update({ endIntensity: target })}
          sportType={sportType}
          ariaLabel="End intensity"
        />
      </div>
    )
  }

  if (block.type === 'REPETITION') {
    const work = block.work ?? { mode: 'distance' as const, value: 100, unit: 'm' as const }
    return (
      <div
        className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-0.5 tabular-nums">
          <NumberInput
            value={block.repetitions ?? 1}
            onChange={(repetitions) => update({ repetitions })}
            min={1}
            integer
            inputMode="numeric"
            aria-label="Repeats"
            className={cn(GHOST_INPUT, 'w-8 text-center')}
          />
          <span className="text-[12px] text-muted-foreground">×</span>
        </div>
        <DurationInline segment={work} onChange={(next) => update({ work: next })} />
      </div>
    )
  }

  // CONTINUOUS / RECOVERY / REST — same metric columns as Interval (empty lead / duration / intensity)
  const segment = continuousSegment(block)
  const target = primaryTarget({ targets: block.targets }, sportType)
  const showIntensity = block.type !== 'REST'

  return (
    <div
      className={cn(className, INLINE_METRIC_GRID)}
      onClick={(e) => e.stopPropagation()}
    >
      <span aria-hidden />
      <DurationInline
        segment={segment}
        onChange={(next) => update(applyContinuousSegment(block, next))}
      />
      {showIntensity ? (
        <IntensityInline
          target={target}
          onChange={(t) => update({ targets: [t] })}
          sportType={sportType}
          ariaLabel="Intensity"
          compact
        />
      ) : (
        <span aria-hidden />
      )}
    </div>
  )
}

/** Expanded-only extras: recovery intensity, progressive step, optional notes. */
export function WorkoutDetailsExpandedExtras({
  block,
  sportType: _sportType,
  onChange,
}: {
  block: WorkoutBlock
  sportType: WorkoutType
  onChange: (block: WorkoutBlock) => void
}) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  if (block.type === 'INTERVAL') {
    return <OptionalNotesField value={block.notes ?? ''} onChange={(notes) => update({ notes })} />
  }

  if (block.type === 'PROGRESSIVE') {
    const step = block.stepEvery ?? { mode: 'distance' as const, value: 1, unit: 'km' as const }
    return (
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Step every
          </p>
          <DurationInline
            segment={step}
            onChange={(next) =>
              update({
                stepEvery: {
                  mode: next.mode,
                  value: next.value,
                  unit: next.unit,
                },
              })
            }
            ariaLabel="Step every"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {block.startIntensity?.value?.trim() || '—'} →{' '}
            {block.endIntensity?.value?.trim() || '—'}
            {block.stepEvery
              ? ` · step every ${block.stepEvery.value} ${block.stepEvery.unit}`
              : ''}
          </p>
        </div>
        <OptionalNotesField value={block.notes ?? ''} onChange={(notes) => update({ notes })} />
      </div>
    )
  }

  if (block.type === 'FREE_TEXT') return null

  return <OptionalNotesField value={block.notes ?? ''} onChange={(notes) => update({ notes })} />
}

function OptionalNotesField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(Boolean(value.trim()))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[#166534] transition hover:text-[#166534]/80"
      >
        + Add notes
      </button>
    )
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </p>
        {!value.trim() ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            Hide
          </button>
        ) : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional block notes"
        aria-label="Block notes"
        autoFocus={!value.trim()}
        className="w-full rounded-[4px] border border-border/50 bg-white/70 px-2 py-1.5 text-[12px] text-[#111827] outline-none placeholder:text-muted-foreground/45 focus:border-sky-400/50"
      />
    </div>
  )
}
