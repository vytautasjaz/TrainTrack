'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import type { Target, WorkoutBlock } from '@/lib/workout-builder/types'
import {
  PROGRESSIVE_STEP_PRESET_OPTIONS,
  progressiveStepPresetId,
  stepEveryFromPreset,
  type ProgressiveStepPresetId,
} from '@/lib/workout-builder/progressive'
import {
  isBikeSport,
  primaryTarget,
  recoveryTarget,
  setRecoveryTarget,
  setWorkTarget,
} from '@/lib/workout-builder/target-helpers'
import {
  DurationFieldGroup,
  IntensityFieldGroup,
  blockToDurationSegment,
  durationSegmentToBlock,
  type IntensityOption,
} from '@/components/workout-builder/builder-segment-editor'
import { FieldGroupLabel } from '@/components/ui/field-group-label'
import { FieldSelect } from '@/components/ui/field-select'
import { NumberInput } from '@/components/ui/number-input'
import { Textarea } from '@/components/ui/textarea'
import { ValueUnitField } from '@/components/ui/value-unit-field'
import { cn } from '@/lib/utils'

const FIELD = 'w-[7rem] shrink-0 sm:w-[7.75rem]'
const FIELD_WIDE = 'w-[8.25rem] shrink-0 sm:w-[9rem]'

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

function progressiveIntensityOptions(sportType: WorkoutType): IntensityOption[] {
  return isBikeSport(sportType)
    ? [
        { value: 'power', label: 'Watts', targetType: 'power' },
        { value: 'powerZone', label: '% FTP', targetType: 'powerZone' },
        { value: 'heartRate', label: 'HR', targetType: 'heartRate' },
        { value: 'heartRateZone', label: 'Zone', targetType: 'heartRateZone' },
        { value: 'rpe', label: 'Effort', targetType: 'rpe' },
      ]
    : [
        { value: 'pace', label: 'Pace', targetType: 'pace' },
        { value: 'heartRate', label: 'HR', targetType: 'heartRate' },
        { value: 'heartRateZone', label: 'Zone', targetType: 'heartRateZone' },
        { value: 'rpe', label: 'Effort', targetType: 'rpe' },
      ]
}

function FieldsRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-end gap-2', className)}>{children}</div>
}

type WorkoutDetailsInlineFieldsProps = {
  block: WorkoutBlock
  sportType: WorkoutType
  onChange: (block: WorkoutBlock) => void
  className?: string
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
      <div className={cn(className)} onClick={(e) => e.stopPropagation()}>
        <ValueUnitField label="Notes" showUnit={false} className="w-full max-w-xl">
          <input
            value={block.text ?? ''}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Notes…"
            aria-label="Block notes"
            className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-xs outline-none"
          />
        </ValueUnitField>
      </div>
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
      <div className={cn('space-y-2', className)} onClick={(e) => e.stopPropagation()}>
        <FieldsRow>
          <div className="w-[4.25rem] shrink-0">
            <ValueUnitField label="Repeat" showUnit={false}>
              <NumberInput
                value={block.repetitions ?? 1}
                onChange={(repetitions) => update({ repetitions: Math.max(1, Math.round(repetitions)) })}
                min={1}
                integer
                inputMode="numeric"
                aria-label="Repeats"
                className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-xs font-medium shadow-none outline-none focus:ring-0"
              />
            </ValueUnitField>
          </div>
        </FieldsRow>
        <FieldsRow>
          <DurationFieldGroup
            label="Work"
            segment={work}
            onChange={(next) => update({ work: next })}
            className={FIELD}
          />
          <IntensityFieldGroup
            target={workTarget}
            onChange={(target) =>
              update({ targets: setWorkTarget(block.targets, target, sportType) })
            }
            sportType={sportType}
            fieldLabel="Target"
            className={FIELD_WIDE}
          />
        </FieldsRow>
        <FieldsRow>
          <DurationFieldGroup
            label="Rest"
            segment={recovery}
            onChange={(next) => update({ recovery: next })}
            className={FIELD}
          />
          <IntensityFieldGroup
            target={restTarget}
            onChange={(target) =>
              update({ targets: setRecoveryTarget(block.targets, target, sportType) })
            }
            sportType={sportType}
            fieldLabel="Intensity"
            intensityOptions={recoveryOptions}
            className={FIELD_WIDE}
          />
        </FieldsRow>
      </div>
    )
  }

  if (block.type === 'PROGRESSIVE') {
    const segment = blockToDurationSegment(block)
    const start =
      block.startIntensity ?? primaryTarget({ targets: block.targets }, sportType)
    const end = block.endIntensity ?? ({ type: start.type, value: '' } satisfies Target)
    const preset = progressiveStepPresetId(block.stepEvery)
    const customStep =
      block.stepEvery ?? { mode: 'distance' as const, value: 1, unit: 'km' as const }
    const intensityOptions = progressiveIntensityOptions(sportType)

    return (
      <div className={cn('space-y-2', className)} onClick={(e) => e.stopPropagation()}>
        <FieldsRow>
          <DurationFieldGroup
            label="Duration"
            segment={segment}
            onChange={(next) => update(durationSegmentToBlock(next))}
            className={FIELD}
          />
        </FieldsRow>
        <FieldsRow>
          <IntensityFieldGroup
            target={start}
            onChange={(t) =>
              update({
                startIntensity: t,
                targets: [t],
                endIntensity:
                  end.type === t.type ? end : { type: t.type, value: end.value ?? '' },
              })
            }
            sportType={sportType}
            fieldLabel="Start"
            intensityOptions={intensityOptions}
            className={FIELD_WIDE}
          />
          <span className="mb-1.5 flex h-7 items-center text-muted-foreground/70" aria-hidden>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          <IntensityFieldGroup
            target={end}
            onChange={(t) => update({ endIntensity: t })}
            sportType={sportType}
            fieldLabel="Finish"
            intensityOptions={intensityOptions}
            className={FIELD_WIDE}
          />
        </FieldsRow>
        <FieldsRow>
          <div className="w-[9.5rem] shrink-0 sm:w-[10.5rem]">
            <FieldGroupLabel>Step</FieldGroupLabel>
            <FieldSelect
              value={preset}
              onValueChange={(next) => {
                const id = next as ProgressiveStepPresetId
                const step = stepEveryFromPreset(id)
                update({ stepEvery: step ?? undefined })
              }}
              options={PROGRESSIVE_STEP_PRESET_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              aria-label="Progression step"
              variant="shell"
              className="w-full min-w-0"
            />
          </div>
          {preset === 'custom' ? (
            <DurationFieldGroup
              label="Every"
              segment={customStep}
              onChange={(next) =>
                update({
                  stepEvery: {
                    mode: next.mode,
                    value: next.value,
                    unit: next.unit,
                  },
                })
              }
              className={FIELD}
            />
          ) : null}
        </FieldsRow>
      </div>
    )
  }

  if (block.type === 'REPETITION') {
    const work = block.work ?? { mode: 'distance' as const, value: 100, unit: 'm' as const }
    return (
      <div className={cn(className)} onClick={(e) => e.stopPropagation()}>
        <FieldsRow>
          <div className="w-[4.25rem] shrink-0">
            <ValueUnitField label="Repeat" showUnit={false}>
              <NumberInput
                value={block.repetitions ?? 1}
                onChange={(repetitions) => update({ repetitions: Math.max(1, Math.round(repetitions)) })}
                min={1}
                integer
                inputMode="numeric"
                aria-label="Repeats"
                className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-xs font-medium shadow-none outline-none focus:ring-0"
              />
            </ValueUnitField>
          </div>
          <DurationFieldGroup
            label="Work"
            segment={work}
            onChange={(next) => update({ work: next })}
            className={FIELD}
          />
        </FieldsRow>
      </div>
    )
  }

  // CONTINUOUS / RECOVERY / REST / WARM_UP / COOL_DOWN
  const segment = blockToDurationSegment(block)
  const target = primaryTarget({ targets: block.targets }, sportType)
  const showIntensity = block.type !== 'REST'

  return (
    <div className={cn(className)} onClick={(e) => e.stopPropagation()}>
      <FieldsRow>
        <DurationFieldGroup
          segment={segment}
          onChange={(next) => update(durationSegmentToBlock(next))}
          className={FIELD}
        />
        {showIntensity ? (
          <IntensityFieldGroup
            target={target}
            onChange={(t) => update({ targets: [t] })}
            sportType={sportType}
            className={FIELD_WIDE}
          />
        ) : null}
      </FieldsRow>
    </div>
  )
}

/** Expanded-only extras: optional notes (main fields stay in the card). */
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el || !open) return
    el.style.height = '0px'
    el.style.height = `${Math.max(el.scrollHeight, 56)}px`
  }, [value, open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        + Add note (optional)
      </button>
    )
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <FieldGroupLabel className="mb-0">Notes</FieldGroupLabel>
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
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional block notes"
        aria-label="Block notes"
        rows={2}
        autoFocus={!value.trim()}
        className="min-h-[3.5rem] w-full resize-none overflow-hidden rounded border border-border/70 bg-white px-2.5 py-2 text-xs font-medium text-[#111827] shadow-none [field-sizing:content] placeholder:text-muted-foreground/45 focus:border-sky-400/50 focus:outline-none focus:ring-0"
      />
    </div>
  )
}
