import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

type AthleteAddedBadgeProps = {
  /** Coach sees "Athlete added"; athlete sees "Self-added". */
  forCoach?: boolean
  className?: string
}

export function AthleteAddedBadge({ forCoach = false, className }: AthleteAddedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400',
        className,
      )}
    >
      <PenLine className="h-3 w-3" aria-hidden />
      {forCoach ? 'Athlete added' : 'Self-added'}
    </span>
  )
}
