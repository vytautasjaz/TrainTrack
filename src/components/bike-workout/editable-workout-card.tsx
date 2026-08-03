'use client'

import { Bike, Clock, Link2, Pencil } from 'lucide-react'
import type { BikePrimaryMetric } from '@/lib/bike-workout/defaults'
import { cn } from '@/lib/utils'
import type { MouseEvent } from 'react'

type DurationUnit = 'min' | 'hours'

function metricValueWidthCh(value: string, placeholder: string, minChars = 2) {
  const len = Math.max(value.length, placeholder.length, minChars)
  return `${len}ch`
}

type EditableWorkoutCardProps = {
  title: string
  subtitle: string
  titleAuto: boolean
  subtitleAuto: boolean
  primaryMetric: BikePrimaryMetric
  durationInput: string
  distanceInput: string
  durationManual: boolean
  distanceManual: boolean
  metricsLocked: boolean
  durationUnit: DurationUnit
  onTitleChange: (value: string) => void
  onSubtitleChange: (value: string) => void
  onTitleAutoEnable: () => void
  onSubtitleAutoEnable: () => void
  onDurationChange: (value: string) => void
  onDistanceChange: (value: string) => void
  onPrimaryMetricChange: (metric: BikePrimaryMetric) => void
  onToggleDurationUnit: (event: MouseEvent) => void
  className?: string
}

function MetricIconButton({
  metric,
  active,
  onSelect,
}: {
  metric: BikePrimaryMetric
  active: boolean
  onSelect: (metric: BikePrimaryMetric) => void
}) {
  const Icon = metric === 'duration' ? Clock : Link2
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={metric === 'duration' ? 'Duration as primary metric' : 'Distance as primary metric'}
      title="Primary metric"
      onClick={() => onSelect(metric)}
      className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border transition',
        active
          ? 'border-[#86D39A] bg-[#86D39A]/25 text-[#166534]'
          : 'border-transparent text-muted-foreground/55 hover:border-border hover:bg-white/60 hover:text-muted-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function EditableWorkoutCard({
  title,
  subtitle,
  titleAuto,
  subtitleAuto,
  primaryMetric,
  durationInput,
  distanceInput,
  durationManual,
  distanceManual,
  metricsLocked,
  durationUnit,
  onTitleChange,
  onSubtitleChange,
  onTitleAutoEnable,
  onSubtitleAutoEnable,
  onDurationChange,
  onDistanceChange,
  onPrimaryMetricChange,
  onToggleDurationUnit,
  className,
}: EditableWorkoutCardProps) {
  const durationIsPrimary = primaryMetric === 'duration'
  const durationEmphasis = durationIsPrimary
  const distanceEmphasis = !durationIsPrimary

  const durationManualStyle = metricsLocked
    ? false
    : durationManual
  const distanceManualStyle = metricsLocked
    ? false
    : distanceManual

  const showDurationApprox =
    !durationIsPrimary && !durationManualStyle && !metricsLocked && durationInput.trim() !== ''
  const showDistanceApprox =
    durationIsPrimary && !distanceManualStyle && !metricsLocked && distanceInput.trim() !== ''

  return (
    <div
      className={cn(
        'relative rounded-[6px] border border-[#86D39A] bg-[#F3FAF5] p-4 shadow-none sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#86D39A]/35 text-[#166534]">
          <Bike className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-2 pr-8">
          <div className="group/title relative">
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
                  titleAuto
                    ? 'bg-[#86D39A]/35 text-[#166534]'
                    : 'border border-[#86D39A]/35 text-[#166534]/70 hover:bg-[#86D39A]/15',
                )}
                aria-pressed={titleAuto}
                title={titleAuto ? 'Title updates automatically' : 'Use automatic title'}
              >
                Auto
              </button>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition group-hover/title:opacity-100" />
            </div>
          </div>

          <div className="group/subtitle relative">
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
                  subtitleAuto
                    ? 'bg-[#86D39A]/35 text-[#166534]'
                    : 'border border-[#86D39A]/35 text-[#166534]/70 hover:bg-[#86D39A]/15',
                )}
                aria-pressed={subtitleAuto}
                title={subtitleAuto ? 'Subtitle updates automatically' : 'Use automatic subtitle'}
              >
                Auto
              </button>
              <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 transition group-hover/subtitle:opacity-100" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <MetricIconButton
                metric="distance"
                active={!durationIsPrimary}
                onSelect={onPrimaryMetricChange}
              />
              <div className="flex min-w-0 flex-1 items-baseline gap-1">
                {showDistanceApprox ? (
                  <span
                    className={cn(
                      'font-medium text-muted-foreground',
                      distanceEmphasis ? 'text-[34px] leading-none' : 'text-[14px]',
                    )}
                  >
                    ~
                  </span>
                ) : null}
                <span className="inline-flex min-w-0 items-baseline gap-[0.15em]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={distanceInput}
                    readOnly={metricsLocked}
                    onChange={(e) => onDistanceChange(e.target.value)}
                    onFocus={() => {
                      if (!metricsLocked && !durationInput.trim() && !distanceInput.trim()) {
                        onPrimaryMetricChange('distance')
                      }
                    }}
                    placeholder="70"
                    title={metricsLocked ? 'Calculated from workout details' : undefined}
                    aria-label="Distance in kilometers"
                    style={{ width: metricValueWidthCh(distanceInput, '70') }}
                    className={cn(
                      'm-0 min-w-0 shrink-0 bg-transparent p-0 font-bold leading-none tracking-tight outline-none placeholder:text-muted-foreground/35',
                      distanceEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      distanceManualStyle ? 'text-[#111827]' : 'text-muted-foreground',
                      !distanceEmphasis && !distanceManualStyle && 'text-[#6B7280]',
                      metricsLocked && 'cursor-default',
                    )}
                  />
                  <span
                    className={cn(
                      'shrink-0 font-bold leading-none tracking-tight',
                      distanceEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      distanceManualStyle ? 'text-[#111827]' : 'text-muted-foreground',
                      !distanceEmphasis && !distanceManualStyle && 'text-[#6B7280]',
                    )}
                  >
                    km
                  </span>
                </span>
              </div>
            </div>

            <div className="flex min-w-0 items-baseline gap-2">
              <MetricIconButton
                metric="duration"
                active={durationIsPrimary}
                onSelect={onPrimaryMetricChange}
              />
              <div className="flex min-w-0 flex-1 items-baseline gap-1">
                {showDurationApprox ? (
                  <span
                    className={cn(
                      'font-medium text-muted-foreground',
                      durationEmphasis ? 'text-[34px] leading-none' : 'text-[14px]',
                    )}
                  >
                    ~
                  </span>
                ) : null}
                <span className="inline-flex min-w-0 items-baseline gap-[0.15em]">
                  <input
                    type="text"
                    inputMode={durationUnit === 'min' ? 'numeric' : 'text'}
                    value={durationInput}
                    readOnly={metricsLocked}
                    onChange={(e) => onDurationChange(e.target.value)}
                    onFocus={() => {
                      if (!metricsLocked && !durationInput.trim() && !distanceInput.trim()) {
                        onPrimaryMetricChange('duration')
                      }
                    }}
                    placeholder={durationUnit === 'min' ? '90' : '1:30'}
                    title={metricsLocked ? 'Calculated from workout details' : undefined}
                    aria-label={durationUnit === 'min' ? 'Duration in minutes' : 'Duration as hh:mm'}
                    style={{
                      width: metricValueWidthCh(
                        durationInput,
                        durationUnit === 'min' ? '90' : '1:30',
                      ),
                    }}
                    className={cn(
                      'm-0 min-w-0 shrink-0 bg-transparent p-0 font-bold leading-none tracking-tight outline-none placeholder:text-muted-foreground/35',
                      durationEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      durationManualStyle ? 'text-[#111827]' : 'text-muted-foreground',
                      !durationEmphasis && !durationManualStyle && 'text-[#6B7280]',
                      metricsLocked && 'cursor-default',
                    )}
                  />
                  <button
                    type="button"
                    onClick={onToggleDurationUnit}
                    disabled={metricsLocked}
                    className={cn(
                      'shrink-0 rounded p-0 font-bold leading-none tracking-tight transition',
                      durationEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      durationManualStyle || durationEmphasis
                        ? durationIsPrimary
                          ? 'text-[#166534] hover:bg-[#86D39A]/25'
                          : 'text-[#6B7280] hover:bg-muted/60'
                        : 'text-muted-foreground hover:bg-muted/60',
                      metricsLocked && 'pointer-events-none opacity-50',
                    )}
                    aria-label={`Duration unit ${durationUnit}. Click to switch.`}
                    title="Click to switch between min and hours"
                  >
                    {durationUnit === 'min' ? 'min' : 'h'}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
