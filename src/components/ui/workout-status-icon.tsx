'use client'

import type { ComponentProps } from 'react'
import { CalendarClock, CheckCircle2, Circle, XCircle } from 'lucide-react'
import { WorkoutStatus } from '@prisma/client'
import type { AthleteLogType } from '@prisma/client'
import { AthleteLogTypeValues } from '@/lib/athlete-log-type'
import { cn } from '@/lib/utils'

/** Canonical workout / log status icons — use these everywhere. */
export const WorkoutStatusIcons = {
  completed: CheckCircle2,
  skipped: XCircle,
  planned: Circle,
  adjusted: CalendarClock,
} as const

export type WorkoutStatusIconKind = keyof typeof WorkoutStatusIcons

const SIZE_CLASS = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
} as const

export type WorkoutStatusIconSize = keyof typeof SIZE_CLASS

export function workoutStatusIconClass(size: WorkoutStatusIconSize = 'md') {
  return SIZE_CLASS[size]
}

/** Done/Skip — thin outer ring only; check / X keep default stroke. */
const QUICK_ACTION_RING_CLASS: Record<WorkoutStatusIconSize, string> = {
  xs: '[&>circle]:![stroke-width:1.25]',
  sm: '[&>circle]:![stroke-width:1.5]',
  md: '[&>circle]:![stroke-width:1.5]',
  lg: '[&>circle]:![stroke-width:1.75]',
}

export function workoutQuickActionIconClass(size: WorkoutStatusIconSize = 'md') {
  return cn(workoutStatusIconClass(size), QUICK_ACTION_RING_CLASS[size])
}

export function workoutStatusKindFromStatus(
  status: WorkoutStatus,
): Exclude<WorkoutStatusIconKind, 'adjusted'> {
  if (status === WorkoutStatus.COMPLETED) return 'completed'
  if (status === WorkoutStatus.SKIPPED) return 'skipped'
  return 'planned'
}

export function workoutStatusKindFromLogType(
  logType: AthleteLogType,
): WorkoutStatusIconKind {
  if (logType === AthleteLogTypeValues.COMPLETED) return 'completed'
  if (logType === AthleteLogTypeValues.SKIPPED) return 'skipped'
  if (
    logType === AthleteLogTypeValues.ADJUSTED ||
    logType === AthleteLogTypeValues.RESCHEDULED
  ) {
    return 'adjusted'
  }
  return 'planned'
}

const ACTIVE_TEXT: Record<WorkoutStatusIconKind, string> = {
  completed: 'text-success',
  skipped: 'text-destructive',
  planned: 'text-muted-foreground/45',
  adjusted: 'text-success',
}

const IDLE_TEXT = 'text-muted-foreground/50'

type WorkoutStatusIconProps = {
  kind?: WorkoutStatusIconKind
  status?: WorkoutStatus
  size?: WorkoutStatusIconSize
  /** When false, uses muted idle color (for unselected action buttons). */
  active?: boolean
  className?: string
  title?: string
  'aria-label'?: string
} & Omit<ComponentProps<'svg'>, 'children'>

export function WorkoutStatusIcon({
  kind,
  status,
  size = 'md',
  active = true,
  className,
  title,
  'aria-label': ariaLabel,
  ...svgProps
}: WorkoutStatusIconProps) {
  const resolved = kind ?? (status ? workoutStatusKindFromStatus(status) : 'planned')
  const Icon = WorkoutStatusIcons[resolved]
  const label =
    ariaLabel ??
    (resolved === 'completed'
      ? 'Completed'
      : resolved === 'skipped'
        ? 'Skipped'
        : resolved === 'adjusted'
          ? 'Adjusted'
          : 'Not completed')
  const hidden = Boolean(svgProps['aria-hidden'])

  const tip = title ?? (hidden ? undefined : label)

  return (
    <span title={tip} className="inline-flex">
      <Icon
        className={cn(
          workoutStatusIconClass(size),
          'shrink-0',
          active ? ACTIVE_TEXT[resolved] : IDLE_TEXT,
          className,
        )}
        aria-label={hidden ? undefined : label}
        {...svgProps}
      />
    </span>
  )
}
