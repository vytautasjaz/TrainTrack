'use client'

import { useMemo } from 'react'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import {
  buildStructureChart,
  type StructureChartSegmentKind,
} from '@/lib/workout-builder/structure-chart'
import { cn } from '@/lib/utils'

const SEGMENT_CLASS: Record<StructureChartSegmentKind, string> = {
  warmup: 'bg-muted-foreground/35',
  work: 'bg-brand',
  recovery: 'bg-brand/30',
  easy: 'bg-sky-400/50 dark:bg-sky-400/40',
  cooldown: 'bg-muted-foreground/25',
  rest: 'bg-border/80',
}

const TONE_SEGMENT_CLASS = {
  muted: 'bg-neutral-400/55 dark:bg-neutral-400/45',
  completed: 'bg-emerald-500/70',
  skipped: 'bg-red-400/75',
} as const

export type StructureChartTone = 'default' | 'muted' | 'completed' | 'skipped'

type ChartSize = 'xs' | 'card' | 'cardLg' | 'sm' | 'md'

type WorkoutStructureChartProps = {
  structure: WorkoutStructure | null | undefined
  size?: ChartSize
  showCaption?: boolean
  /** Monochrome modes for plan data cards; default keeps multi-color builder chart. */
  tone?: StructureChartTone
  className?: string
}

/** `sm`/`md` preserve builder & detail chart heights; `xs`/`card*` are plan data-card sizes. */
const HEIGHT: Record<ChartSize, string> = {
  xs: 'h-3',
  card: 'h-4',
  cardLg: 'h-5',
  sm: 'h-7',
  md: 'h-9',
}

export function WorkoutStructureChart({
  structure,
  size = 'sm',
  showCaption = true,
  tone = 'default',
  className,
}: WorkoutStructureChartProps) {
  const model = useMemo(() => buildStructureChart(structure), [structure])

  if (!model) return null

  const chartHeight = HEIGHT[size]
    const monochrome = tone === 'muted' || tone === 'completed' || tone === 'skipped'

  return (
    <div className={cn('min-w-0', className)}>
      <div
        className={cn(
          'relative w-full',
          chartHeight,
          !monochrome && 'border-b border-border/50',
        )}
        role="img"
        aria-label={model.caption || 'Workout intensity profile'}
      >
        <div className="absolute inset-0 flex items-end gap-px">
          {model.segments.map((segment, index) => (
            <div
              key={`${segment.kind}-${index}`}
              className={cn(
                'min-w-px shrink-0 rounded-t-[2px]',
                monochrome ? TONE_SEGMENT_CLASS[tone] : SEGMENT_CLASS[segment.kind],
              )}
              style={{
                flexGrow: segment.weight,
                flexBasis: 0,
                height: `${Math.max(12, Math.round(segment.intensity * 100))}%`,
              }}
            />
          ))}
        </div>
      </div>
      {showCaption && model.caption && (
        <p
          className={cn(
            'mt-1 truncate text-muted-foreground',
            size === 'md' ? 'text-xs leading-snug' : 'text-[10px] leading-snug',
          )}
        >
          {model.caption}
        </p>
      )}
    </div>
  )
}
