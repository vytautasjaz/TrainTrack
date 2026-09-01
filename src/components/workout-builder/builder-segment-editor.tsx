'use client'

import type { ReactNode } from 'react'
import type { WorkoutType } from '@prisma/client'
import type { Segment, SegmentUnit, Target, TargetType, WorkoutBlock } from '@/lib/workout-builder/types'
import {
  PROGRESSIVE_STEP_PRESET_OPTIONS,
  progressiveStepPresetId,
  stepEveryFromPreset,
  type ProgressiveStepPresetId,
} from '@/lib/workout-builder/progressive'
import {
  HR_ZONE_PRESETS,
  RPE_PRESETS,
  SEGMENT_UNIT_LABELS,
  intensitySuggestions,
  isBikeSport,
  primaryTarget,
  simpleTargetTypeLabel,
  simpleTargetTypesForSport,
  targetPlaceholder,
  targetTypeLabel,
  targetTypesForSport,
  updateSegmentUnit,
  updateSegmentValue,
} from '@/lib/workout-builder/target-helpers'
import { Input } from '@/components/ui/input'
import { NumberInput, editableInputDragHandlers } from '@/components/ui/number-input'
import { FillSelect } from '@/components/ui/suffix-select'
import { VALUE_UNIT_SHELL_CLASS, ValueUnitField } from '@/components/ui/value-unit-field'
import { SuggestableInput } from '@/components/swim-workout/suggestable-input'
import { PaceValueInput } from '@/components/workout-builder/pace-value-input'
import { cn } from '@/lib/utils'

const SEGMENT_UNITS: SegmentUnit[] = ['km', 'm', 'min', 'sec']

const embeddedInputClass = 'px-2 text-xs font-medium'
type CustomIntensityOptionValue = 'standingRecovery' | 'walkingRecovery' | 'jogRecovery'
type IntensityOptionValue = TargetType | CustomIntensityOptionValue

export type IntensityOption = {
  value: IntensityOptionValue
  label: string
  targetType: TargetType
  /** Optional preset text applied when this option is selected. */
  presetValue?: string
}

type DurationFieldGroupProps = {
  segment: Segment
  onChange: (segment: Segment) => void
  className?: string
  label?: string
  shellClassName?: string
}

export function DurationFieldGroup({
  segment,
  onChange,
  className,
  label = 'Duration',
  shellClassName,
}: DurationFieldGroupProps) {
  const unitOptions = SEGMENT_UNITS.map((unit) => ({
    value: unit,
    label: SEGMENT_UNIT_LABELS[unit],
  }))

  return (
    <div className={cn('min-w-0', className)}>
      <ValueUnitField
        label={label}
        unitValue={segment.unit}
        onUnitChange={(unit) => onChange(updateSegmentUnit(segment, unit as SegmentUnit))}
        unitOptions={unitOptions}
        unitAriaLabel={`${label} unit`}
        shellClassName={cn('bg-white', shellClassName)}
      >
        <NumberInput
          value={segment.value}
          onChange={(next) => onChange(updateSegmentValue(segment, next))}
          min={0}
          inputMode="decimal"
          className={cn(
            'h-7 w-full rounded-none border-0 bg-transparent shadow-none outline-none focus:ring-0',
            embeddedInputClass,
          )}
          aria-label={`${label} amount`}
        />
      </ValueUnitField>
    </div>
  )
}

function intensityValueMode(type: TargetType): 'text' | 'rpe' | 'zone' {
  if (type === 'rpe') return 'rpe'
  if (type === 'heartRateZone' || type === 'powerZone') return 'zone'
  return 'text'
}

type IntensityFieldGroupProps = {
  target: Target
  onChange: (target: Target) => void
  sportType: WorkoutType
  className?: string
  shellClassName?: string
  fieldLabel?: string
  /** When true (default), only Effort/Pace or Effort/Watts with free-text suggestions. */
  simple?: boolean
  intensityOptions?: IntensityOption[]
}

export function IntensityFieldGroup({
  target,
  onChange,
  sportType,
  className,
  shellClassName,
  fieldLabel = 'Intensity',
  simple = true,
  intensityOptions,
}: IntensityFieldGroupProps) {
  const types = simple ? simpleTargetTypesForSport(sportType) : targetTypesForSport(sportType)
  const fallbackType = types.includes(target.type) ? target.type : types[0]!
  const valueNorm = (target.value ?? '').trim().toLowerCase()
  const matchedCustom = intensityOptions?.find((option) => {
    if (option.targetType !== target.type) return false
    if (!option.presetValue) return true
    return valueNorm === option.presetValue.trim().toLowerCase()
  })
  const effectiveType = matchedCustom?.targetType ?? fallbackType
  const selectedTypeValue = matchedCustom?.value ?? effectiveType
  const mode = intensityValueMode(effectiveType)

  const typeOptions: IntensityOption[] =
    intensityOptions ??
    types.map((type) => ({
      value: type,
      label: simple ? simpleTargetTypeLabel(type) : targetTypeLabel(type),
      targetType: type,
    }))

  function setType(value: IntensityOptionValue) {
    const option = typeOptions.find((item) => item.value === value)
    if (!option) return
    onChange({
      type: option.targetType,
      value: option.presetValue ?? (target.type === option.targetType ? target.value : ''),
    })
  }

  const valueOptions =
    mode === 'zone'
      ? HR_ZONE_PRESETS.map((zone) => ({ value: zone, label: zone }))
      : mode === 'rpe'
        ? RPE_PRESETS.map((preset) => ({ value: preset, label: preset }))
        : []

  function renderValueControl() {
    if (simple) {
      if (effectiveType === 'pace') {
        return (
          <PaceValueInput
            value={target.value ?? ''}
            onChange={(value) => onChange({ type: effectiveType, value })}
            suggestions={intensitySuggestions(effectiveType, sportType)}
            placeholder={targetPlaceholder(effectiveType, sportType)}
            aria-label="Intensity value"
            className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-xs font-medium"
            unitClassName="pr-1.5 text-[10px]"
          />
        )
      }
      return (
        <SuggestableInput
          value={target.value ?? ''}
          onChange={(value) => onChange({ type: effectiveType, value })}
          suggestions={intensitySuggestions(effectiveType, sportType)}
          placeholder={targetPlaceholder(effectiveType, sportType)}
          aria-label="Intensity value"
          className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-xs font-medium"
        />
      )
    }

    if (mode === 'zone' || mode === 'rpe') {
      return (
        <FillSelect
          value={target.value ?? ''}
          onValueChange={(value) => onChange({ ...target, value })}
          options={valueOptions}
          placeholder={mode === 'zone' ? 'Select zone' : 'Select effort'}
        />
      )
    }

    return (
      <Input
        type="text"
        variant="embedded"
        value={target.value ?? ''}
        onChange={(e) => onChange({ ...target, value: e.target.value })}
        placeholder={targetPlaceholder(target.type, sportType)}
        className="h-7 px-2 text-xs"
        aria-label="Intensity value"
        {...editableInputDragHandlers}
      />
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <ValueUnitField
        label={fieldLabel}
        unitValue={selectedTypeValue}
        onUnitChange={(value) => setType(value as IntensityOptionValue)}
        unitOptions={typeOptions}
        unitAriaLabel="Intensity type"
        shellClassName={cn('bg-white', shellClassName)}
      >
        {renderValueControl()}
      </ValueUnitField>
    </div>
  )
}

type IntervalRowProps = {
  rowLabel: string
  segment: Segment
  onSegmentChange: (segment: Segment) => void
  target: Target
  onTargetChange: (target: Target) => void
  sportType: WorkoutType
  bordered?: boolean
  intensityOptions?: IntensityOption[]
}

export function IntervalRow({
  rowLabel,
  segment,
  onSegmentChange,
  target,
  onTargetChange,
  sportType,
  bordered,
  intensityOptions,
}: IntervalRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:gap-4',
        bordered && 'border-b border-border/50',
      )}
    >
      <span className="w-20 shrink-0 pt-7 text-xs font-semibold text-foreground">
        {rowLabel}
      </span>
      <DurationFieldGroup segment={segment} onChange={onSegmentChange} className="min-w-0 flex-1" />
      <IntensityFieldGroup
        target={target}
        onChange={onTargetChange}
        sportType={sportType}
        className="min-w-0 flex-1"
        intensityOptions={intensityOptions}
      />
    </div>
  )
}

type RepeatsRowProps = {
  value: number
  onChange: (value: number) => void
}

export function RepeatsRow({ value, onChange }: RepeatsRowProps) {
  return (
    <div className="flex items-center gap-4 border-b border-border/50 px-3 py-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-foreground">Repeat</span>
      <div className={cn(VALUE_UNIT_SHELL_CLASS, 'min-w-[6rem]')}>
        <span className="flex items-center pl-3 text-sm text-muted-foreground">×</span>
        <NumberInput
          value={value}
          onChange={onChange}
          min={1}
          integer
          inputMode="numeric"
          className="h-7 w-10 rounded-none border-0 bg-transparent px-1 text-center text-xs font-semibold shadow-none outline-none focus:ring-0"
          aria-label="Repeat count"
        />
        <div className="flex items-center pr-3 text-xs text-muted-foreground">times</div>
      </div>
    </div>
  )
}

export function blockToDurationSegment(block: WorkoutBlock): Segment {
  if (block.durationType === 'distance') {
    return {
      mode: 'distance',
      value: block.distance ?? 0,
      unit: block.distanceUnit === 'm' ? 'm' : 'km',
    }
  }
  return { mode: 'time', value: block.time ?? 0, unit: 'min' }
}

export function durationSegmentToBlock(segment: Segment): Partial<WorkoutBlock> {
  if (segment.unit === 'm' || segment.unit === 'km') {
    return {
      durationType: 'distance',
      distance: segment.value,
      distanceUnit: segment.unit,
    }
  }
  return { durationType: 'time', time: segment.value }
}

type BlockCardProps = {
  children: ReactNode
  className?: string
}

export function BlockCard({ children, className }: BlockCardProps) {
  return (
    <div className={cn('min-w-0 overflow-hidden bg-transparent', className)}>
      {children}
    </div>
  )
}

type ContinuousBlockRowProps = {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  sportType: WorkoutType
  rowLabel?: string
  showIntensity?: boolean
  className?: string
  embedded?: boolean
}

export function ContinuousBlockRow({
  block,
  onChange,
  sportType,
  rowLabel = 'Session',
  showIntensity = true,
  className,
}: ContinuousBlockRowProps) {
  const segment = blockToDurationSegment(block)
  const target = primaryTarget({ targets: block.targets }, sportType)

  return (
    <BlockCard className={className}>
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="w-20 shrink-0 pt-7 text-xs font-semibold text-foreground">
          {rowLabel}
        </span>
        <DurationFieldGroup
          segment={segment}
          onChange={(next) => onChange(durationSegmentToBlock(next))}
          className="min-w-0 flex-1"
        />
        {showIntensity ? (
          <IntensityFieldGroup
            target={target}
            onChange={(t) => onChange({ targets: [t] })}
            sportType={sportType}
            className="min-w-0 flex-1"
          />
        ) : null}
      </div>
    </BlockCard>
  )
}

type ProgressiveBlockRowProps = {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  sportType: WorkoutType
  className?: string
}

export function ProgressiveBlockRow({
  block,
  onChange,
  sportType,
  className,
}: ProgressiveBlockRowProps) {
  const segment = blockToDurationSegment(block)
  const start =
    block.startIntensity ?? primaryTarget({ targets: block.targets }, sportType)
  const end = block.endIntensity ?? { type: start.type, value: '' }
  const preset = progressiveStepPresetId(block.stepEvery)
  const customStep =
    block.stepEvery ?? { mode: 'distance' as const, value: 1, unit: 'km' as const }

  const intensityOptions: IntensityOption[] = isBikeSport(sportType)
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

  function setProgression(id: ProgressiveStepPresetId) {
    const next = stepEveryFromPreset(id)
    if (next == null) {
      onChange({ stepEvery: undefined })
      return
    }
    onChange({ stepEvery: next })
  }

  return (
    <BlockCard className={className}>
      <div className="space-y-1.5 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 text-[10px] font-medium text-muted-foreground">
            Total
          </span>
          <DurationFieldGroup
            segment={segment}
            onChange={(next) => onChange(durationSegmentToBlock(next))}
            className="min-w-0"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 text-[10px] font-medium text-muted-foreground">
            Start
          </span>
          <IntensityFieldGroup
            target={start}
            onChange={(t) =>
              onChange({
                startIntensity: t,
                targets: [t],
                endIntensity:
                  end.type === t.type ? end : { type: t.type, value: end.value ?? '' },
              })
            }
            sportType={sportType}
            fieldLabel="Start"
            intensityOptions={intensityOptions}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 text-[10px] font-medium text-muted-foreground">
            End
          </span>
          <IntensityFieldGroup
            target={end}
            onChange={(t) => onChange({ endIntensity: t })}
            sportType={sportType}
            fieldLabel="End"
            intensityOptions={intensityOptions}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-9 shrink-0 text-[10px] font-medium text-muted-foreground">
            Step
          </span>
          <select
            value={preset}
            onChange={(e) =>
              setProgression(e.target.value as ProgressiveStepPresetId)
            }
            aria-label="Progression type"
            className="h-8 rounded-md border border-border bg-card px-1.5 text-xs"
          >
            {PROGRESSIVE_STEP_PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {preset === 'custom' ? (
            <DurationFieldGroup
              segment={customStep}
              onChange={(next) =>
                onChange({
                  stepEvery: {
                    mode: next.mode,
                    value: next.value,
                    unit: next.unit,
                  },
                })
              }
            />
          ) : null}
        </div>
      </div>
    </BlockCard>
  )
}

export function SegmentRow(props: {
  label: string
  segment: Segment
  onSegmentChange: (segment: Segment) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-20 shrink-0 pt-7 text-xs font-semibold text-foreground">
        {props.label}
      </span>
      <DurationFieldGroup segment={props.segment} onChange={props.onSegmentChange} className="flex-1" />
    </div>
  )
}

export function SegmentEditor(props: {
  label: string
  segment: Segment
  onChange: (segment: Segment) => void
}) {
  return (
    <SegmentRow label={props.label} segment={props.segment} onSegmentChange={props.onChange} />
  )
}

export function IntensityEditor(props: {
  target: Target
  onChange: (target: Target) => void
  sportType: WorkoutType
  className?: string
}) {
  return (
    <IntensityFieldGroup
      target={props.target}
      onChange={props.onChange}
      sportType={props.sportType}
      className={props.className}
    />
  )
}

export function BuilderSegmentLine({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0', className)}>{children}</div>
}

export function RepeatsEditor(props: { value: number; onChange: (value: number) => void }) {
  return <RepeatsRow value={props.value} onChange={props.onChange} />
}

export function RepeatsLeading(props: { value: number; onChange: (value: number) => void }) {
  return <RepeatsRow value={props.value} onChange={props.onChange} />
}

export function BlockCardDivider() {
  return <div className="border-t border-border/60" />
}

export function AmountUnitControl({
  segment,
  onChange,
  className,
}: {
  segment: Segment
  onChange: (segment: Segment) => void
  className?: string
}) {
  return <DurationFieldGroup segment={segment} onChange={onChange} className={className} />
}

export function IntensityControl({
  target,
  onChange,
  sportType,
  className,
}: {
  target: Target
  onChange: (target: Target) => void
  sportType: WorkoutType
  className?: string
}) {
  return (
    <IntensityFieldGroup
      target={target}
      onChange={onChange}
      sportType={sportType}
      className={className}
    />
  )
}
