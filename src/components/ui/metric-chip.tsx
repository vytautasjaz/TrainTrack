import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type MetricChipProps = {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  className?: string
}

export function MetricChip({ icon: Icon, value, label, className }: MetricChipProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/80">
        <Icon className="h-5 w-5 text-brand" strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
