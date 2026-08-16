import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

type SelfAddedBadgeProps = {
  /** Icon-only for dense calendar cards. */
  compact?: boolean
  className?: string
}

/** Marks workouts the athlete added (not coach-planned). Visible to coach and athlete. */
export function SelfAddedBadge({ compact = false, className }: SelfAddedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-0.5 font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300',
        compact
          ? 'text-sky-600 dark:text-sky-400'
          : 'rounded-[3px] bg-sky-500/12 px-1 py-px text-[9px] leading-none',
        className,
      )}
      title="Added by athlete — not on the original plan"
    >
      <PenLine
        className={compact ? 'h-2.5 w-2.5' : 'h-2.5 w-2.5'}
        strokeWidth={2}
        aria-hidden
      />
      {compact ? (
        <span className="sr-only">Self-added</span>
      ) : (
        <span>Self-added</span>
      )}
    </span>
  )
}
