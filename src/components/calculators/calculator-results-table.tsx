import { cn } from '@/lib/utils'
import { formatRaceTime } from '@/lib/calculators/race-time'
import { Input } from '@/components/ui/input'

export const TIME_VALUE = 'text-body text-tabular'

export const thBase =
  'px-4 py-2.5 text-label font-medium normal-case'
export const tdBase = 'px-4 py-3 align-middle'
export const timeTd = cn(tdBase, 'text-center')
export const totalTh = cn(thBase, 'bg-muted/50 text-center text-foreground border-l border-border/50')
export const totalTd = cn(timeTd, 'bg-muted/50 border-l border-border/50')

export function SplitTime({
  minutes,
  emphasis = false,
  fallback = '—',
}: {
  minutes: number | null | undefined
  emphasis?: boolean
  fallback?: string
}) {
  return (
    <span
      className={cn(
        TIME_VALUE,
        minutes != null
          ? emphasis
            ? 'font-bold text-foreground'
            : 'text-muted-foreground'
          : 'text-muted-foreground/40',
      )}
    >
      {minutes != null ? formatRaceTime(minutes) : fallback}
    </span>
  )
}

export function DistanceInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        aria-label={ariaLabel}
        size="compact"
        align="center"
      />
      <span className="shrink-0 text-caption">km</span>
    </div>
  )
}

export function formatDistanceKm(km: number): string {
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`
}

export function DistanceLabel({ km }: { km: number }) {
  return <span className={cn(TIME_VALUE, 'text-muted-foreground')}>{formatDistanceKm(km)}</span>
}
