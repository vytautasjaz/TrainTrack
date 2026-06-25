import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  variant?: 'default' | 'brand' | 'dark'
  className?: string
}

export function StatCard({ label, value, hint, icon: Icon, variant = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        variant === 'default' && 'card-elevated',
        variant === 'brand' && 'bg-brand text-brand-foreground shadow-[var(--shadow-card)]',
        variant === 'dark' && 'bg-hero text-hero-foreground shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'text-xs font-medium uppercase tracking-wide',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-80',
          )}
        >
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              variant === 'default' ? 'text-brand' : 'opacity-80',
            )}
          />
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && (
        <p
          className={cn(
            'mt-0.5 text-xs',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-75',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
