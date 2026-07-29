'use client'

import { Clock, Link2, Pencil, PersonStanding } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RunPrimaryMetric = 'duration' | 'distance'

function metricValueWidthCh(value: string, placeholder: string, minChars = 2) {
  const len = Math.max(value.length, placeholder.length, minChars)
  return `${len}ch`
}

function MetricIconButton({
  metric,
  active,
  onSelect,
}: {
  metric: RunPrimaryMetric
  active: boolean
  onSelect: (metric: RunPrimaryMetric) => void
}) {
  const Icon = metric === 'duration' ? Clock : Link2
  return (
    <button
      type="button"
      aria-pressed={active}
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

type EditableRunWorkoutCardProps = {
  title: string
  subtitle: string
  titleAuto: boolean
  subtitleAuto: boolean
  primaryMetric: RunPrimaryMetric
  durationInput: string
  distanceInput: string
  durationManual: boolean
  distanceManual: boolean
  metricsLocked: boolean
  onTitleChange: (value: string) => void
  onSubtitleChange: (value: string) => void
  onTitleAutoEnable: () => void
  onSubtitleAutoEnable: () => void
  onDurationChange: (value: string) => void
  onDistanceChange: (value: string) => void
  onPrimaryMetricChange: (metric: RunPrimaryMetric) => void
  className?: string
}

export function EditableRunWorkoutCard({
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
  onTitleChange,
  onSubtitleChange,
  onTitleAutoEnable,
  onSubtitleAutoEnable,
  onDurationChange,
  onDistanceChange,
  onPrimaryMetricChange,
  className,
}: EditableRunWorkoutCardProps) {
  const durationIsPrimary = primaryMetric === 'duration'
  const durationEmphasis = durationIsPrimary
  const distanceEmphasis = !durationIsPrimary

  const showDurationApprox =
    !durationIsPrimary && !durationManual && !metricsLocked && durationInput.trim() !== ''
  const showDistanceApprox =
    durationIsPrimary && !distanceManual && !metricsLocked && distanceInput.trim() !== ''

  return (
    <div
      className={cn(
        'rounded-[6px] border border-[#86D39A] bg-[#F3FAF5] p-4 shadow-none sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#86D39A]/35 text-[#166534]">
          <PersonStanding className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
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
              >
                Auto
              </button>
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
                    placeholder="10"
                    style={{ width: metricValueWidthCh(distanceInput, '10') }}
                    className={cn(
                      'm-0 min-w-0 shrink-0 bg-transparent p-0 font-bold leading-none tracking-tight outline-none placeholder:text-muted-foreground/35',
                      distanceEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      distanceManual ? 'text-[#111827]' : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'shrink-0 font-bold leading-none tracking-tight',
                      distanceEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      distanceManual ? 'text-[#111827]' : 'text-muted-foreground',
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
                    inputMode="numeric"
                    value={durationInput}
                    readOnly={metricsLocked}
                    onChange={(e) => onDurationChange(e.target.value)}
                    onFocus={() => {
                      if (!metricsLocked && !durationInput.trim() && !distanceInput.trim()) {
                        onPrimaryMetricChange('duration')
                      }
                    }}
                    placeholder="60"
                    style={{ width: metricValueWidthCh(durationInput, '60') }}
                    className={cn(
                      'm-0 min-w-0 shrink-0 bg-transparent p-0 font-bold leading-none tracking-tight outline-none placeholder:text-muted-foreground/35',
                      durationEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      durationManual ? 'text-[#111827]' : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'shrink-0 font-bold leading-none tracking-tight',
                      durationEmphasis ? 'text-[34px]' : 'text-[14px] font-medium',
                      durationManual ? 'text-[#111827]' : 'text-muted-foreground',
                    )}
                  >
                    min
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
