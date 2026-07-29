'use client'

import type { MouseEvent, ReactNode } from 'react'
import { Clock, Home, Link2 } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { getWorkoutEditorSportTheme } from '@/lib/workout-editor/sport-theme'
import type { DistanceUnit, DurationUnit, WorkoutPrimaryMetric } from '@/lib/workout-editor/types'
import { cn } from '@/lib/utils'

function metricValueWidthCh(value: string, placeholder: string, minChars = 2) {
  const len = Math.max(value.length, placeholder.length, minChars)
  return `${len}ch`
}

function valueSizeClass(active: boolean, heroActive: boolean) {
  if (!active) return 'text-[14px] font-medium text-muted-foreground'
  if (heroActive) return 'text-[28px] font-bold text-[#111827]'
  return 'text-[22px] font-bold text-[#111827]'
}

function unitSizeClass(active: boolean, heroActive: boolean) {
  if (!active) return 'text-[11px] font-medium text-muted-foreground'
  if (heroActive) return 'text-[16px] font-bold text-[#111827]'
  return 'text-[13px] font-bold text-[#111827]'
}

function activeMetricBorderClass(sportType: WorkoutType) {
  switch (sportType) {
    case WorkoutType.RUN:
      return 'ring-1 ring-orange-300/60'
    case WorkoutType.BIKE:
      return 'ring-1 ring-sky-300/60'
    case WorkoutType.SWIM:
      return 'ring-1 ring-cyan-300/60'
    case WorkoutType.STRENGTH:
      return 'ring-1 ring-emerald-300/60'
    case WorkoutType.HYROX:
      return 'ring-1 ring-rose-300/60'
    case WorkoutType.TRIATHLON:
      return 'ring-1 ring-violet-300/60'
    default:
      return 'ring-1 ring-slate-300/60'
  }
}

function MetricHeroButton({
  metric,
  active,
  onSelect,
  controlOnClass,
}: {
  metric: WorkoutPrimaryMetric
  active: boolean
  onSelect: (metric: WorkoutPrimaryMetric) => void
  controlOnClass: string
}) {
  const Icon = metric === 'duration' ? Clock : Link2
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        metric === 'duration'
          ? 'Show duration as primary on plan card'
          : 'Show distance as primary on plan card'
      }
      title={active ? 'Primary metric (shown big on plan card)' : 'Set as primary metric'}
      onClick={() => onSelect(metric)}
      className={cn(
        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border transition',
        active
          ? controlOnClass
          : 'border-transparent text-muted-foreground/40 hover:border-border hover:bg-white/50 hover:text-muted-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function MetricSourceCell({
  children,
  badge,
  active,
  activeBorderClass,
  locked,
  disabled,
  onClick,
}: {
  children: ReactNode
  badge: 'Manual' | 'Auto'
  active: boolean
  activeBorderClass: string
  locked?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={locked || disabled}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1.5 rounded-[6px] px-2.5 py-2 text-left transition',
        active
          ? cn('bg-white/75', activeBorderClass)
          : 'bg-transparent opacity-55 hover:opacity-80',
        (locked || disabled) && 'pointer-events-none',
      )}
    >
      <div className="flex min-h-[28px] items-baseline gap-[0.15em] leading-none tracking-tight">
        {children}
      </div>
      <span
        className={cn(
          'self-start rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
          active
            ? badge === 'Manual'
              ? 'bg-[#111827]/10 text-[#111827]'
              : 'bg-sky-500/15 text-sky-800'
            : 'bg-muted/50 text-muted-foreground',
        )}
      >
        {badge}
      </span>
    </button>
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
  /** Auto-estimated value for distance (shown in the Auto cell). */
  autoDistanceInput?: string
  /** Auto-estimated value for duration (shown in the Auto cell). */
  autoDurationInput?: string
  durationManual: boolean
  distanceManual: boolean
  /** When false, secondary (non-primary) metric is dimmed and hidden on plan cards. */
  secondaryMetricVisible?: boolean
  metricsLocked: boolean
  showDistance?: boolean
  distanceUnit?: DistanceUnit
  durationUnit?: DurationUnit
  allowDurationUnitToggle?: boolean
  isIndoor?: boolean
  showIndoorToggle?: boolean
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
  onIndoorToggle?: () => void
  distanceLocked?: boolean
  durationLocked?: boolean
  cornerSlot?: ReactNode
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
  isIndoor = false,
  showIndoorToggle = false,
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
  onIndoorToggle,
  distanceLocked,
  durationLocked,
  cornerSlot,
  className,
  footer,
}: EditableWorkoutCardShellProps) {
  const theme = getWorkoutEditorSportTheme(sportType)
  const activeBorderClass = activeMetricBorderClass(sportType)
  const durationIsPrimary = primaryMetric === 'duration' || !showDistance
  const distanceIsPrimary = !durationIsPrimary

  const lockDistance = distanceLocked ?? metricsLocked
  const lockDuration = durationLocked ?? metricsLocked

  const durationPlaceholder = durationUnit === 'hours' ? '0:00' : '0'
  const distancePlaceholder = '0'

  const autoDistanceDisplay = autoDistanceInput.trim()
  const autoDurationDisplay = autoDurationInput.trim()

  // Locked metrics (from structured details) count as auto-sourced
  const distanceSourceIsManual = lockDistance ? false : distanceManual
  const durationSourceIsManual = lockDuration ? false : durationManual

  const distanceRowActive = distanceIsPrimary || secondaryMetricVisible
  const durationRowActive = durationIsPrimary || secondaryMetricVisible

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

  function handleSelectDistanceSource(source: 'manual' | 'auto') {
    if (lockDistance) return
    const alreadyActive =
      distanceRowActive &&
      ((source === 'manual' && distanceSourceIsManual) ||
        (source === 'auto' && !distanceSourceIsManual))
    if (!distanceIsPrimary && alreadyActive) {
      onSecondaryMetricVisibleChange?.(false)
      return
    }
    selectDistanceSource(source)
  }

  function handleSelectDurationSource(source: 'manual' | 'auto') {
    if (lockDuration) return
    const alreadyActive =
      durationRowActive &&
      ((source === 'manual' && durationSourceIsManual) ||
        (source === 'auto' && !durationSourceIsManual))
    if (!durationIsPrimary && alreadyActive) {
      onSecondaryMetricVisibleChange?.(false)
      return
    }
    selectDurationSource(source)
  }

  function handlePrimaryMetricChange(metric: WorkoutPrimaryMetric) {
    onPrimaryMetricChange(metric)
  }

  return (
    <div
      className={cn(
        'relative rounded-[6px] border p-4 shadow-none sm:p-5',
        theme.card,
        cornerSlot && 'pb-12',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            theme.iconWrap,
          )}
        >
          <WorkoutSportIcon
            type={sportType}
            size="sm"
            className="!h-10 !w-10 !rounded-full !bg-transparent"
          />
        </span>

        <div className={cn('min-w-0 flex-1 space-y-2', showIndoorToggle && 'pr-8')}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-label="Workout title"
              className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold leading-snug text-[#111827] outline-none placeholder:text-muted-foreground/50"
              placeholder="Workout title"
            />
            <button
              type="button"
              onClick={onTitleAutoEnable}
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition',
                titleAuto ? theme.chipOn : theme.chipOff,
              )}
              aria-pressed={titleAuto}
            >
              Auto
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              aria-label="Workout subtitle"
              className="min-w-0 flex-1 bg-transparent text-[13px] leading-snug text-[#6B7280] outline-none placeholder:text-muted-foreground/40"
              placeholder="Subtitle"
            />
            <button
              type="button"
              onClick={onSubtitleAutoEnable}
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition',
                subtitleAuto ? theme.chipOn : theme.chipOff,
              )}
              aria-pressed={subtitleAuto}
            >
              Auto
            </button>
          </div>

          <div className="space-y-1.5 pt-1.5">
            {showDistance ? (
              <div
                className={cn(
                  'flex items-stretch gap-2 rounded-[10px] px-1 py-1 transition',
                  distanceIsPrimary && 'bg-white/40',
                )}
              >
                <MetricHeroButton
                  metric="distance"
                  active={distanceIsPrimary}
                  onSelect={handlePrimaryMetricChange}
                  controlOnClass={theme.controlOn}
                />

                <div className="flex min-w-0 flex-1 gap-1">
                  <MetricSourceCell
                    badge="Manual"
                    active={distanceRowActive && distanceSourceIsManual}
                    activeBorderClass={activeBorderClass}
                    locked={lockDistance}
                    onClick={() => handleSelectDistanceSource('manual')}
                  >
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
                        'm-0 min-w-0 shrink-0 bg-transparent p-0 leading-none tracking-tight outline-none placeholder:text-muted-foreground/30',
                        valueSizeClass(distanceRowActive && distanceSourceIsManual, distanceIsPrimary),
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Keep typing focused without toggling secondary off
                        selectDistanceSource('manual')
                      }}
                    />
                    <span
                      className={cn(
                        'shrink-0 leading-none tracking-tight',
                        unitSizeClass(distanceRowActive && distanceSourceIsManual, distanceIsPrimary),
                      )}
                    >
                      {distanceUnit}
                    </span>
                  </MetricSourceCell>

                  {!lockDistance ? (
                    <MetricSourceCell
                      badge="Auto"
                      active={distanceRowActive && !distanceSourceIsManual}
                      activeBorderClass={activeBorderClass}
                      onClick={() => handleSelectDistanceSource('auto')}
                    >
                      <span
                        className={cn(
                          'leading-none tracking-tight tabular-nums',
                          valueSizeClass(distanceRowActive && !distanceSourceIsManual, distanceIsPrimary),
                          !autoDistanceDisplay && 'text-muted-foreground/40',
                        )}
                      >
                        {autoDistanceDisplay || '—'}
                      </span>
                      {autoDistanceDisplay ? (
                        <span
                          className={cn(
                            'shrink-0 leading-none tracking-tight',
                            unitSizeClass(distanceRowActive && !distanceSourceIsManual, distanceIsPrimary),
                          )}
                        >
                          {distanceUnit}
                        </span>
                      ) : null}
                    </MetricSourceCell>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                'flex items-stretch gap-2 rounded-[10px] px-1 py-1 transition',
                durationIsPrimary && 'bg-white/40',
              )}
            >
              <MetricHeroButton
                metric="duration"
                active={durationIsPrimary}
                onSelect={handlePrimaryMetricChange}
                controlOnClass={theme.controlOn}
              />

              <div className="flex min-w-0 flex-1 gap-1">
                <MetricSourceCell
                  badge="Manual"
                  active={durationRowActive && durationSourceIsManual}
                  activeBorderClass={activeBorderClass}
                  locked={lockDuration}
                  onClick={() => handleSelectDurationSource('manual')}
                >
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
                      'm-0 min-w-0 shrink-0 bg-transparent p-0 leading-none tracking-tight outline-none placeholder:text-muted-foreground/30',
                      valueSizeClass(durationRowActive && durationSourceIsManual, durationIsPrimary),
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      selectDurationSource('manual')
                    }}
                  />
                  {allowDurationUnitToggle && onToggleDurationUnit ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!lockDuration) onToggleDurationUnit(e)
                      }}
                      disabled={lockDuration}
                      className={cn(
                        'shrink-0 leading-none tracking-tight transition',
                        unitSizeClass(durationRowActive && durationSourceIsManual, durationIsPrimary),
                        lockDuration && 'pointer-events-none opacity-50',
                      )}
                    >
                      {unitLabel(durationUnit)}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'shrink-0 leading-none tracking-tight',
                        unitSizeClass(durationRowActive && durationSourceIsManual, durationIsPrimary),
                      )}
                    >
                      {unitLabel(durationUnit)}
                    </span>
                  )}
                </MetricSourceCell>

                {!lockDuration ? (
                  <MetricSourceCell
                    badge="Auto"
                    active={durationRowActive && !durationSourceIsManual}
                    activeBorderClass={activeBorderClass}
                    onClick={() => handleSelectDurationSource('auto')}
                  >
                    <span
                      className={cn(
                        'leading-none tracking-tight tabular-nums',
                        valueSizeClass(durationRowActive && !durationSourceIsManual, durationIsPrimary),
                        !autoDurationDisplay && 'text-muted-foreground/40',
                      )}
                    >
                      {autoDurationDisplay || '—'}
                    </span>
                    {autoDurationDisplay ? (
                      <span
                        className={cn(
                          'shrink-0 leading-none tracking-tight',
                          unitSizeClass(durationRowActive && !durationSourceIsManual, durationIsPrimary),
                        )}
                      >
                        {unitLabel(durationUnit)}
                      </span>
                    ) : null}
                  </MetricSourceCell>
                ) : null}
              </div>
            </div>
          </div>

          {footer}
        </div>
      </div>

      {showIndoorToggle && onIndoorToggle ? (
        <button
          type="button"
          onClick={onIndoorToggle}
          className={cn(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[6px] border transition',
            isIndoor
              ? theme.controlOn
              : 'border-transparent text-muted-foreground/55 hover:border-border hover:bg-white/60',
          )}
          aria-pressed={isIndoor}
          title={isIndoor ? 'Indoor' : 'Outdoor'}
        >
          <Home className="h-4 w-4" />
        </button>
      ) : null}

      {cornerSlot ? (
        <div className="absolute bottom-3 right-3 flex items-center">{cornerSlot}</div>
      ) : null}
    </div>
  )
}
