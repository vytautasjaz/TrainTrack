import { cn } from '@/lib/utils'
import type { RacePriority } from '@prisma/client'
import { RACE_PRIORITY_LABELS } from '@/lib/constants'

const PRIORITY_BADGE: Record<RacePriority, string> = {
  A: 'border-rose-300 bg-rose-50 text-rose-800',
  B: 'border-amber-300 bg-amber-50 text-amber-900',
  C: 'border-sky-300 bg-sky-50 text-sky-800',
}

/** Icon / text color for priority markers. */
const PRIORITY_DOT: Record<RacePriority, string> = {
  A: 'text-rose-600',
  B: 'text-amber-600',
  C: 'text-sky-600',
}

/** Full marker chip: tinted fill + matching contour. */
const PRIORITY_MARKER: Record<RacePriority, string> = {
  A: 'border-rose-400 bg-rose-50 text-rose-600',
  B: 'border-amber-400 bg-amber-50 text-amber-600',
  C: 'border-sky-400 bg-sky-50 text-sky-600',
}

type PriorityBadgeProps = {
  priority: RacePriority
  className?: string
  /** Compact letter-only badge. */
  compact?: boolean
}

export function PriorityBadge({
  priority,
  className,
  compact = false,
}: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        PRIORITY_BADGE[priority],
        className,
      )}
    >
      {compact ? priority : `${priority} ${RACE_PRIORITY_LABELS[priority]}`}
    </span>
  )
}

export function priorityMarkerClass(priority: RacePriority): string {
  return PRIORITY_DOT[priority]
}

export function priorityMarkerSurfaceClass(priority: RacePriority): string {
  return PRIORITY_MARKER[priority]
}
