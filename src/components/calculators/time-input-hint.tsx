import { cn } from '@/lib/utils'

export const TIME_FORMAT_HINT = 'Use minutes:seconds (45:30) or hours:minutes:seconds (1:45:00)'

export const TRANSITION_TIME_HINT = 'Minutes:seconds, e.g. 3:00'

type TimeInputHintProps = {
  className?: string
  variant?: 'race' | 'transition'
}

export function TimeInputHint({ className, variant = 'race' }: TimeInputHintProps) {
  return (
    <p className={cn('text-[11px] leading-snug text-muted-foreground', className)}>
      {variant === 'transition' ? TRANSITION_TIME_HINT : TIME_FORMAT_HINT}
    </p>
  )
}

export function TimeParseError({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="text-xs text-destructive">
      Could not read that time. {TIME_FORMAT_HINT}
    </p>
  )
}
