import { Activity, ClipboardCheck, PenLine } from 'lucide-react'
import type { WorkoutCompletionSource } from '@/lib/workout-history'
import { COMPLETION_SOURCE_LABELS } from '@/lib/workout-history'
import { cn } from '@/lib/utils'

const SOURCE_STYLES: Record<
  WorkoutCompletionSource,
  { className: string; icon: typeof Activity }
> = {
  strava: {
    className: 'bg-[#FC4C02]/15 text-[#FC4C02]',
    icon: Activity,
  },
  manual: {
    className: 'bg-green-500/15 text-green-700 dark:text-green-400',
    icon: ClipboardCheck,
  },
  self_logged: {
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    icon: PenLine,
  },
}

type CompletionSourceBadgeProps = {
  source: WorkoutCompletionSource
  className?: string
}

export function CompletionSourceBadge({ source, className }: CompletionSourceBadgeProps) {
  const { className: style, icon: Icon } = SOURCE_STYLES[source]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        style,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {COMPLETION_SOURCE_LABELS[source]}
    </span>
  )
}
