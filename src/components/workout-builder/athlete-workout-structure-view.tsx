'use client'

import { useMemo } from 'react'
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock,
  MapPin,
  Timer,
} from 'lucide-react'
import type { SessionType, WorkoutType } from '@prisma/client'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import {
  buildAthleteStructureDisplay,
  type PhaseBlockDisplay,
} from '@/lib/workout-builder/athlete-structure-display'
import { smartBlockAccentDisplay } from '@/lib/workout-builder/smart-blocks'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { cn } from '@/lib/utils'

type AthleteWorkoutStructureViewProps = {
  structure: WorkoutStructure
  sportType: WorkoutType
  sessionType?: SessionType
  plannedDistance?: number | null
  plannedDuration?: number | null
  variant?: 'full' | 'compact'
  showSummaryMetrics?: boolean
  className?: string
}

type BlockTheme = ReturnType<typeof smartBlockAccentDisplay>

function AthleteWorkoutSummaryMetrics({
  metrics,
  compact,
  size,
  className,
}: {
  metrics: ReturnType<typeof buildAthleteStructureDisplay>['metrics']
  compact?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  if (metrics.length === 0) return null

  const resolvedSize = size ?? (compact ? 'sm' : 'md')
  const icons = [MapPin, Clock, BarChart3]

  return (
    <div
      className={cn(
        'grid grid-cols-3 divide-x divide-border/50',
        className,
      )}
    >
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? BarChart3
        return (
          <div
            key={metric.label}
            className={cn(
              'flex min-w-0 items-center gap-2',
              index === 0 ? 'pr-3' : index === metrics.length - 1 ? 'pl-3' : 'px-3',
              resolvedSize === 'lg' ? 'py-1.5' : resolvedSize === 'sm' ? 'py-1' : 'py-1.5',
            )}
          >
            <Icon
              className={cn(
                'shrink-0 text-muted-foreground',
                resolvedSize === 'lg'
                  ? 'h-3.5 w-3.5'
                  : resolvedSize === 'sm'
                    ? 'h-3.5 w-3.5'
                    : 'h-4 w-4',
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'font-bold tabular-nums leading-none text-foreground',
                  resolvedSize === 'lg'
                    ? 'text-sm'
                    : resolvedSize === 'sm'
                      ? 'text-[11px]'
                      : 'text-sm',
                )}
              >
                {metric.value}
              </p>
              <p
                className={cn(
                  'mt-0.5 leading-none text-muted-foreground',
                  resolvedSize === 'lg'
                    ? 'text-[11px]'
                    : resolvedSize === 'sm'
                      ? 'text-[9px]'
                      : 'text-[10px]',
                )}
              >
                {metric.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function IntervalTimeline({
  preview,
  compact,
}: {
  preview: NonNullable<PhaseBlockDisplay['intervalPreview']>
  compact?: boolean
}) {
  const previewCount = Math.min(3, preview.reps)

  return (
    <div className={cn('flex flex-wrap items-center gap-1', compact ? 'mt-1' : 'mt-2')}>
      {Array.from({ length: previewCount }).map((_, index) => (
        <div key={index} className="flex items-center gap-1">
          <span
            className={cn(
              'rounded-md bg-red-500/15 font-semibold text-red-700 dark:text-red-400',
              compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
            )}
          >
            {preview.work}
          </span>
          {index < previewCount - 1 && (
            <span className={cn('text-muted-foreground', compact ? 'text-[8px]' : 'text-[9px]')}>
              ··· {preview.recovery}
            </span>
          )}
        </div>
      ))}
      {preview.reps > previewCount && (
        <span className={cn('font-medium text-muted-foreground', compact ? 'text-[9px]' : 'text-[10px]')}>
          ··· x{preview.reps}
        </span>
      )}
    </div>
  )
}

function PhaseBlockRow({
  block,
  theme,
  compact,
  showTimeline,
}: {
  block: PhaseBlockDisplay
  theme: BlockTheme
  compact?: boolean
  showTimeline?: boolean
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'font-bold tabular-nums text-foreground',
          compact ? 'text-xs' : 'text-base',
        )}
      >
        {block.primary}
      </p>
      {(block.paceLabel || block.zoneLabel) && (
        <div className={cn('mt-1 flex flex-wrap items-center gap-1', compact && 'gap-0.5')}>
          {block.paceLabel ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-medium',
                theme.badge,
                compact ? 'text-[9px]' : 'text-[10px]',
              )}
            >
              {block.paceLabel}
            </span>
          ) : null}
          {block.zoneLabel ? (
            <span
              className={cn(
                'rounded-full bg-muted/70 px-1.5 py-0.5 font-medium text-muted-foreground',
                compact ? 'text-[9px]' : 'text-[10px]',
              )}
            >
              {block.zoneLabel}
            </span>
          ) : null}
        </div>
      )}
      {block.recoveryNote && !compact ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{block.recoveryNote}</p>
      ) : null}
      {block.notes && !compact ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{block.notes}</p>
      ) : null}
      {showTimeline && block.intervalPreview ? (
        <IntervalTimeline preview={block.intervalPreview} compact={compact} />
      ) : null}
    </div>
  )
}

function PhaseBlockCard({
  block,
  compact,
}: {
  block: PhaseBlockDisplay
  compact?: boolean
}) {
  const theme = smartBlockAccentDisplay(block.accent)
  const showTimeline = Boolean(block.intervalPreview) && !compact

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border-l-[3px]',
        theme.surface,
        theme.border,
        compact ? 'px-2.5 py-2' : 'px-3 py-3',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          theme.iconWrap,
          compact ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Activity className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold uppercase tracking-wide',
            theme.label,
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {block.title}
        </p>
        <PhaseBlockRow
          block={block}
          theme={theme}
          compact={compact}
          showTimeline={showTimeline}
        />
      </div>

      {block.durationLabel ? (
        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5 text-muted-foreground',
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          <Timer className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />
          <span>{block.durationLabel}</span>
          {!compact ? <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden /> : null}
        </div>
      ) : null}
    </div>
  )
}

export function AthleteWorkoutStructureView({
  structure,
  sportType,
  plannedDistance,
  plannedDuration,
  variant = 'full',
  showSummaryMetrics = true,
  className,
}: AthleteWorkoutStructureViewProps) {
  const display = useMemo(
    () =>
      buildAthleteStructureDisplay({
        structure,
        plannedDistance,
        plannedDuration,
        sportType,
      }),
    [structure, plannedDistance, plannedDuration, sportType],
  )

  if (!hasStructureContent(structure) || display.blocks.length === 0) {
    return null
  }

  const compact = variant === 'compact'

  return (
    <div className={cn('space-y-2.5', className)}>
      {showSummaryMetrics ? (
        <AthleteWorkoutSummaryMetrics metrics={display.metrics} compact={compact} />
      ) : null}
      <div className={cn('space-y-2', compact && 'space-y-1.5')}>
        {display.blocks.map((block) => (
          <PhaseBlockCard key={block.id} block={block} compact={compact} />
        ))}
      </div>
    </div>
  )
}

export { AthleteWorkoutSummaryMetrics }
export { buildAthleteStructureDisplay } from '@/lib/workout-builder/athlete-structure-display'
