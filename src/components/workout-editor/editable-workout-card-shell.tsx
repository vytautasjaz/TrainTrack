'use client'

import type { MouseEvent, ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Clock, Link2 } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { DistanceUnit, DurationUnit, WorkoutPrimaryMetric } from '@/lib/workout-editor/types'
import { cn } from '@/lib/utils'

function metricValueWidthCh(value: string, placeholder: string, minChars = 2) {
  const len = Math.max(value.length, placeholder.length, minChars)
  return `${len}ch`
}

function heroGradientClass(sportType: WorkoutType) {
  switch (sportType) {
    case WorkoutType.RUN:
      return 'from-white to-orange-100'
    case WorkoutType.BIKE:
      return 'from-white to-sky-100'
    case WorkoutType.SWIM:
      return 'from-white to-cyan-100'
    case WorkoutType.STRENGTH:
      return 'from-white to-emerald-100'
    case WorkoutType.HYROX:
      return 'from-white to-rose-100'
    case WorkoutType.TRIATHLON:
      return 'from-white to-violet-100'
    default:
      return 'from-white to-slate-100'
  }
}

function AutoTextButton({
  active,
  onClick,
  disabled,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap text-[11px] font-medium transition',
        active
          ? 'text-muted-foreground/70'
          : 'text-muted-foreground/45 hover:text-muted-foreground/70',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      Auto
    </button>
  )
}

function SourceToggle({
  isAuto,
  locked,
  onToggle,
}: {
  isAuto: boolean
  locked?: boolean
  onToggle: () => void
}) {
  if (locked) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground/45">Auto</span>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-[11px] font-medium text-muted-foreground/55 transition hover:text-muted-foreground"
    >
      {isAuto ? 'Auto' : 'Manual'}
    </button>
  )
}

function MetricFooterControls({
  isAuto,
  locked,
  onToggleSource,
  onCard,
  canHide,
  onToggleCardVisibility,
}: {
  isAuto: boolean
  locked?: boolean
  onToggleSource: () => void
  onCard: boolean
  canHide: boolean
  onToggleCardVisibility: () => void
}) {
  return (
    <div className="flex flex-nowrap items-center justify-center gap-x-2">
      <SourceToggle isAuto={isAuto} locked={locked} onToggle={onToggleSource} />
      <button
        type="button"
        onClick={onToggleCardVisibility}
        disabled={onCard && !canHide}
        aria-pressed={!onCard}
        title={
          onCard
            ? canHide
              ? 'Hide on workout card'
              : 'At least one metric must stay on the card'
            : 'Show on workout card'
        }
        className={cn(
          'shrink-0 whitespace-nowrap text-[11px] font-medium transition',
          onCard
            ? 'text-muted-foreground/55 hover:text-muted-foreground'
            : 'text-muted-foreground/70',
          onCard && !canHide && 'pointer-events-none opacity-40',
        )}
      >
        {onCard ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export type EditableWorkoutCardShellProps = {
  sportType: WorkoutType
  title: string
  subtitle: string
  titleAuto: boolean
  subtitleAuto: boolean
  primaryMetric: WorkoutPrimaryMetric
  durationInput: string
  distanceInput: string
  autoDistanceInput?: string
  autoDurationInput?: string
  durationManual: boolean
  distanceManual: boolean
  secondaryMetricVisible?: boolean
  metricsLocked: boolean
  showDistance?: boolean
  distanceUnit?: DistanceUnit
  durationUnit?: DurationUnit
  allowDurationUnitToggle?: boolean
  onTitleChange: (value: string) => void
  onSubtitleChange: (value: string) => void
  onTitleAutoEnable: () => void
  onSubtitleAutoEnable: () => void
  onDurationChange: (value: string) => void
  onDistanceChange: (value: string) => void
  onPrimaryMetricChange: (metric: WorkoutPrimaryMetric) => void
  onDistanceSourceChange?: (source: 'manual' | 'auto') => void
  onDurationSourceChange?: (source: 'manual' | 'auto') => void
  onSecondaryMetricVisibleChange?: (visible: boolean) => void
  onToggleDurationUnit?: (event: MouseEvent) => void
  distanceLocked?: boolean
  durationLocked?: boolean
  cornerSlot?: ReactNode
  /** Full date line above icon + title, e.g. "Friday, Jul 31 2026". */
  dateLabel?: string | null
  /** Intensity / workout-type control for the first metrics column. */
  intensityControl?: ReactNode
  sportOptions?: WorkoutType[]
  onSportChange?: (sport: WorkoutType) => void
  className?: string
  footer?: ReactNode
}

export function EditableWorkoutCardShell({
  sportType,
  title,
  subtitle,
  titleAuto,
  subtitleAuto,
  primaryMetric,
  durationInput,
  distanceInput,
  autoDistanceInput = '',
  autoDurationInput = '',
  durationManual,
  distanceManual,
  secondaryMetricVisible = true,
  metricsLocked,
  showDistance = true,
  distanceUnit = 'km',
  durationUnit = 'min',
  allowDurationUnitToggle = false,
  onTitleChange,
  onSubtitleChange,
  onTitleAutoEnable,
  onSubtitleAutoEnable,
  onDurationChange,
  onDistanceChange,
  onPrimaryMetricChange,
  onDistanceSourceChange,
  onDurationSourceChange,
  onSecondaryMetricVisibleChange,
  onToggleDurationUnit,
  distanceLocked,
  durationLocked,
  cornerSlot,
  dateLabel,
  intensityControl,
  sportOptions,
  onSportChange,
  className,
  footer,
}: EditableWorkoutCardShellProps) {
  const canChangeSport =
    Boolean(onSportChange) && Boolean(sportOptions && sportOptions.length > 1)
  const durationIsPrimary = primaryMetric === 'duration' || !showDistance
  const distanceIsPrimary = !durationIsPrimary

  const lockDistance = distanceLocked ?? metricsLocked
  const lockDuration = durationLocked ?? metricsLocked

  const durationPlaceholder = durationUnit === 'hours' ? '0:00' : '0'
  const distancePlaceholder = '0'

  const autoDistanceDisplay = autoDistanceInput.trim()
  const autoDurationDisplay = autoDurationInput.trim()

  const distanceSourceIsManual = lockDistance ? false : distanceManual
  const durationSourceIsManual = lockDuration ? false : durationManual

  const shownDistance = distanceSourceIsManual
    ? distanceInput
    : autoDistanceDisplay || distanceInput
  const shownDuration = durationSourceIsManual
    ? durationInput
    : autoDurationDisplay || durationInput

  const distanceIsAuto = !distanceSourceIsManual
  const durationIsAuto = !durationSourceIsManual

  /** Black = shown on plan card; gray = hidden from card (still stored). */
  const distanceOnCard =
    showDistance &&
    (primaryMetric === 'distance' || secondaryMetricVisible)
  const durationOnCard =
    primaryMetric === 'duration' || !showDistance || secondaryMetricVisible
  const canHideDistance = distanceOnCard && durationOnCard
  const canHideDuration = showDistance && distanceOnCard && durationOnCard

  const unitLabel = (unit: DurationUnit) => (unit === 'min' ? 'min' : 'h')

  function selectDistanceSource(source: 'manual' | 'auto') {
    if (lockDistance) return
    if (!distanceIsPrimary) onSecondaryMetricVisibleChange?.(true)
    onDistanceSourceChange?.(source)
  }

  function selectDurationSource(source: 'manual' | 'auto') {
    if (lockDuration) return
    if (!durationIsPrimary) onSecondaryMetricVisibleChange?.(true)
    onDurationSourceChange?.(source)
  }

  function toggleDistanceSource() {
    if (lockDistance) return
    selectDistanceSource(distanceSourceIsManual ? 'auto' : 'manual')
  }

  function toggleDurationSource() {
    if (lockDuration) return
    selectDurationSource(durationSourceIsManual ? 'auto' : 'manual')
  }

  function toggleDistanceCardVisibility() {
    if (distanceOnCard) {
      if (!canHideDistance) return
      if (primaryMetric === 'distance') {
        onPrimaryMetricChange('duration')
      }
      onSecondaryMetricVisibleChange?.(false)
      return
    }
    if (primaryMetric === 'duration') {
      onSecondaryMetricVisibleChange?.(true)
    } else {
      onPrimaryMetricChange('distance')
      onSecondaryMetricVisibleChange?.(true)
    }
  }

  function toggleDurationCardVisibility() {
    if (durationOnCard) {
      if (!canHideDuration) return
      if (primaryMetric === 'duration') {
        onPrimaryMetricChange('distance')
      }
      onSecondaryMetricVisibleChange?.(false)
      return
    }
    if (primaryMetric === 'distance') {
      onSecondaryMetricVisibleChange?.(true)
    } else {
      onPrimaryMetricChange('duration')
      onSecondaryMetricVisibleChange?.(true)
    }
  }

  const valueTone = (onCard: boolean, isPrimary: boolean) =>
    cn(
      'font-bold',
      isPrimary ? 'text-[32px]' : 'text-[18px]',
      onCard ? 'text-[#111827]' : 'text-muted-foreground/45',
    )

  const unitTone = (onCard: boolean, isPrimary: boolean) =>
    cn(
      'font-semibold leading-none tracking-tight',
      onCard ? 'text-[#111827]' : 'text-muted-foreground/45',
      isPrimary ? 'text-base' : 'text-[11px]',
    )

  const sportIcon = canChangeSport ? (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Sport: ${WORKOUT_TYPE_LABELS[sportType]}. Change sport`}
          title="Change sport"
          className="shrink-0 rounded-xl outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <WorkoutSportIcon type={sportType} size="md" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[220] min-w-[10.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
        >
          {sportOptions!.map((sport) => {
            const selected = sport === sportType
            return (
              <DropdownMenu.Item
                key={sport}
                onSelect={() => onSportChange?.(sport)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none',
                  'data-[highlighted]:bg-foreground/[0.04]',
                  selected && 'bg-foreground/[0.06] font-semibold',
                )}
              >
                <WorkoutSportIcon type={sport} size="xs" />
                <span className="flex-1">{WORKOUT_TYPE_LABELS[sport]}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  ) : (
    <WorkoutSportIcon type={sportType} size="md" className="mt-0.5 shrink-0" />
  )

  return (
    <div
      className={cn(
        'relative rounded-none border-0 border-b border-black/20 bg-gradient-to-b px-5 pb-6 pt-5 shadow-none sm:px-6',
        heroGradientClass(sportType),
        cornerSlot && 'pb-14',
        className,
      )}
    >
      {dateLabel ? (
        <p className="mb-2.5 text-[13px] leading-snug text-[#6B7280]">{dateLabel}</p>
      ) : null}

      <div className="flex items-start gap-3">
        {sportIcon}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-8">
          <div className="flex max-w-full min-w-0 items-baseline gap-1.5">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-label="Workout title"
              style={{ width: `${Math.max(title.length + 1, 6)}ch` }}
              className="max-w-[calc(100%-2.75rem)] min-w-0 bg-transparent text-[17px] font-semibold leading-snug text-[#111827] outline-none placeholder:text-muted-foreground/50"
              placeholder="Workout title"
            />
            <AutoTextButton
              active={titleAuto}
              onClick={onTitleAutoEnable}
            />
          </div>

          <div className="flex max-w-full min-w-0 items-baseline gap-1.5">
            <input
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              aria-label="Workout subtitle"
              style={{ width: `${Math.max(subtitle.length + 1, 6)}ch` }}
              className="max-w-[calc(100%-2.75rem)] min-w-0 bg-transparent text-[13px] leading-snug text-[#6B7280] outline-none placeholder:text-muted-foreground/40"
              placeholder="Subtitle"
            />
            <AutoTextButton
              active={subtitleAuto}
              onClick={onSubtitleAutoEnable}
            />
          </div>
        </div>
      </div>

      <div className="mt-[18px] flex min-w-0 items-stretch overflow-hidden">
        {intensityControl ? (
          <>
            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-2 text-center">
              <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Intensity
              </span>
              <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center overflow-hidden">
                {intensityControl}
              </div>
            </div>
            <div className="w-px shrink-0 self-stretch bg-foreground/20" />
          </>
        ) : null}

        {showDistance ? (
          <>
            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center">
              <button
                type="button"
                aria-pressed={distanceIsPrimary && distanceOnCard}
                title={
                  distanceOnCard
                    ? distanceIsPrimary
                      ? 'Primary metric on plan card'
                      : 'Set as primary metric'
                    : 'Show on workout card'
                }
                onClick={() => {
                  onPrimaryMetricChange('distance')
                  onSecondaryMetricVisibleChange?.(true)
                }}
                className={cn(
                  'inline-flex h-4 shrink-0 items-center justify-center gap-1.5',
                  distanceOnCard
                    ? 'text-foreground'
                    : 'text-muted-foreground/40',
                )}
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Distance
                </span>
              </button>

              <div
                className={cn(
                  'mt-1.5 flex h-8 w-full shrink-0 items-center justify-center gap-0.5',
                  !distanceOnCard && 'opacity-90',
                )}
              >
                {distanceIsAuto && shownDistance ? (
                  <span
                    className={cn(
                      'font-semibold leading-none',
                      distanceOnCard
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/40',
                      distanceIsPrimary ? 'text-xl' : 'text-sm',
                    )}
                  >
                    ~
                  </span>
                ) : null}
                {distanceSourceIsManual || lockDistance ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={distanceInput}
                    readOnly={lockDistance}
                    onChange={(e) => onDistanceChange(e.target.value)}
                    onFocus={() => {
                      selectDistanceSource('manual')
                      if (!lockDistance && !durationInput.trim() && !distanceInput.trim()) {
                        onPrimaryMetricChange('distance')
                      }
                    }}
                    placeholder={distancePlaceholder}
                    style={{
                      width: metricValueWidthCh(distanceInput, distancePlaceholder),
                    }}
                    className={cn(
                      'm-0 bg-transparent p-0 text-center tabular-nums leading-none tracking-tight outline-none placeholder:text-muted-foreground/30',
                      valueTone(distanceOnCard, distanceIsPrimary),
                    )}
                  />
                ) : (
                  <span
                    className={cn(
                      'tabular-nums leading-none tracking-tight',
                      valueTone(distanceOnCard, distanceIsPrimary),
                      !shownDistance && 'text-muted-foreground/40',
                    )}
                  >
                    {shownDistance || '—'}
                  </span>
                )}
                <span className={unitTone(distanceOnCard, distanceIsPrimary)}>
                  {distanceUnit}
                </span>
              </div>

              <div className="mt-1.5 flex h-4 shrink-0 items-center justify-center">
                <MetricFooterControls
                  isAuto={distanceIsAuto}
                  locked={lockDistance}
                  onToggleSource={toggleDistanceSource}
                  onCard={distanceOnCard}
                  canHide={canHideDistance}
                  onToggleCardVisibility={toggleDistanceCardVisibility}
                />
              </div>
            </div>
            <div className="w-px shrink-0 self-stretch bg-foreground/20" />
          </>
        ) : null}

        <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center">
          <button
            type="button"
            aria-pressed={durationIsPrimary && durationOnCard}
            title={
              durationOnCard
                ? durationIsPrimary
                  ? 'Primary metric on plan card'
                  : 'Set as primary metric'
                : 'Show on workout card'
            }
            onClick={() => {
              onPrimaryMetricChange('duration')
              onSecondaryMetricVisibleChange?.(true)
            }}
            className={cn(
              'inline-flex h-4 shrink-0 items-center justify-center gap-1.5',
              durationOnCard
                ? 'text-foreground'
                : 'text-muted-foreground/40',
            )}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Time</span>
          </button>

          <div
            className={cn(
              'mt-1.5 flex h-8 w-full shrink-0 items-center justify-center gap-0.5',
              !durationOnCard && 'opacity-90',
            )}
          >
            {durationIsAuto && shownDuration ? (
              <span
                className={cn(
                  'font-semibold leading-none',
                  durationOnCard
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/40',
                  durationIsPrimary ? 'text-xl' : 'text-sm',
                )}
              >
                ~
              </span>
            ) : null}
            {durationSourceIsManual || lockDuration ? (
              <input
                type="text"
                inputMode={durationUnit === 'min' ? 'numeric' : 'text'}
                value={durationInput}
                readOnly={lockDuration}
                onChange={(e) => onDurationChange(e.target.value)}
                onFocus={() => {
                  selectDurationSource('manual')
                  if (!lockDuration && !durationInput.trim() && !distanceInput.trim()) {
                    onPrimaryMetricChange('duration')
                  }
                }}
                placeholder={durationPlaceholder}
                style={{
                  width: metricValueWidthCh(durationInput, durationPlaceholder),
                }}
                className={cn(
                  'm-0 bg-transparent p-0 text-center tabular-nums leading-none tracking-tight outline-none placeholder:text-muted-foreground/30',
                  valueTone(durationOnCard, durationIsPrimary),
                )}
              />
            ) : (
              <span
                className={cn(
                  'tabular-nums leading-none tracking-tight',
                  valueTone(durationOnCard, durationIsPrimary),
                  !shownDuration && 'text-muted-foreground/40',
                )}
              >
                {shownDuration || '—'}
              </span>
            )}
            {allowDurationUnitToggle && onToggleDurationUnit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!lockDuration) onToggleDurationUnit(e)
                }}
                disabled={lockDuration}
                title={`Unit: ${unitLabel(durationUnit)}. Click to switch.`}
                aria-label={`Duration unit ${unitLabel(durationUnit)}. Click to switch between min and hours.`}
                className={cn(
                  unitTone(durationOnCard, durationIsPrimary),
                  'underline-offset-2 hover:underline',
                  lockDuration && 'pointer-events-none opacity-50',
                )}
              >
                {unitLabel(durationUnit)}
              </button>
            ) : (
              <span className={unitTone(durationOnCard, durationIsPrimary)}>
                {unitLabel(durationUnit)}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex h-4 shrink-0 items-center justify-center">
            <MetricFooterControls
              isAuto={durationIsAuto}
              locked={lockDuration}
              onToggleSource={toggleDurationSource}
              onCard={durationOnCard}
              canHide={canHideDuration}
              onToggleCardVisibility={toggleDurationCardVisibility}
            />
          </div>
        </div>
      </div>

      {footer}

      {cornerSlot ? (
        <div className="absolute bottom-3 right-5 flex items-center sm:right-6">
          {cornerSlot}
        </div>
      ) : null}
    </div>
  )
}
