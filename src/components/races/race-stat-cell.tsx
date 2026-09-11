import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RaceStatCellProps = {
  icon: LucideIcon
  label: string
  children: ReactNode
  className?: string
}

/** Shared preview/report cell — icon + uppercase label + value. */
export function RaceStatCell({
  icon: Icon,
  label,
  children,
  className,
}: RaceStatCellProps) {
  return (
    <div
      className={cn(
        'flex h-full min-w-0 items-start gap-2.5 bg-background px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 text-sm font-semibold leading-snug text-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}
