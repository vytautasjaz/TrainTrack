import { cn } from '@/lib/utils'
import type { RacePriority } from '@prisma/client'
import { RACE_PRIORITY_LABELS } from '@/lib/constants'

const PRIORITY_CLASS: Record<RacePriority, string> = {
  A: 'tt-priority-a',
  B: 'tt-priority-b',
  C: 'tt-priority-c',
}

/** Icon / text color for priority markers. */
const PRIORITY_DOT: Record<RacePriority, string> = {
  A: 'text-[var(--color-accent)]',
  B: 'text-[#3182CE]',
  C: 'text-[#5B6B7A]',
}

/** Full marker chip: tinted fill + matching contour. */
const PRIORITY_MARKER: Record<RacePriority, string> = {
  A: 'border-[var(--color-accent)]/40 bg-accent-subtle text-[var(--color-accent)]',
  B: 'border-[#3182CE]/40 bg-[rgb(49_130_206/0.08)] text-[#3182CE]',
  C: 'border-[#5B6B7A]/35 bg-surface-subtle text-[#5B6B7A]',
}

type PriorityBadgeProps = {
  priority: RacePriority
  className?: string
  /** Compact letter-only badge. */
  compact?: boolean
}

/** Priority badge — A GOAL / B IMPORTANT / C TRAINING. */
export function PriorityBadge({
  priority,
  className,
  compact = false,
}: PriorityBadgeProps) {
  return (
    <span className={cn('tt-priority-badge', PRIORITY_CLASS[priority], className)}>
      {compact ? priority : `${priority} ${RACE_PRIORITY_LABELS[priority].toUpperCase()}`}
    </span>
  )
}

export function priorityMarkerClass(priority: RacePriority): string {
  return PRIORITY_DOT[priority]
}

export function priorityMarkerSurfaceClass(priority: RacePriority): string {
  return PRIORITY_MARKER[priority]
}
