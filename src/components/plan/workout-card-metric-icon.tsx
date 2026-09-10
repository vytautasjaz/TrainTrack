import { Clock, Route } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WorkoutCardMetricKind = 'distance' | 'duration'

export function WorkoutCardMetricIcon({
  kind,
  className,
}: {
  kind: WorkoutCardMetricKind
  className?: string
}) {
  const Icon = kind === 'duration' ? Clock : Route
  return (
    <Icon
      className={cn('h-3 w-3 shrink-0', className)}
      aria-hidden
      strokeWidth={1.75}
    />
  )
}
