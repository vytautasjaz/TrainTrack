import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ActivityMetricRowProps = {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: string
  iconClassName?: string
  className?: string
}

export function ActivityMetricRow({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
  className,
}: ActivityMetricRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[6px] border border-border bg-card px-3 py-3.5 shadow-none',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-muted',
          iconClassName,
        )}
      >
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums tracking-tight">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />
    </div>
  )
}
