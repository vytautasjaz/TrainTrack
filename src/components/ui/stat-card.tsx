import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  variant?: 'default' | 'brand' | 'dark' | 'flat'
  layout?: 'stacked' | 'row'
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = 'default',
  layout = 'stacked',
  className,
}: StatCardProps) {
  const isRow = layout === 'row'

  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        variant === 'default' && 'card-elevated',
        variant === 'flat' && 'bg-muted/50',
        variant === 'brand' && 'bg-brand text-brand-foreground shadow-[var(--shadow-card)]',
        variant === 'dark' && 'bg-hero text-hero-foreground shadow-[var(--shadow-card)]',
        isRow && 'flex items-center gap-3 p-3',
        className,
      )}
    >
      {Icon && isRow && (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            variant === 'default' || variant === 'flat' ? 'bg-brand-soft' : 'bg-white/15',
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              variant === 'default' || variant === 'flat' ? 'text-brand' : 'opacity-90',
            )}
            strokeWidth={2}
          />
        </div>
      )}
      <div className={cn('min-w-0', isRow && 'flex-1')}>
        <div className={cn('flex items-start justify-between gap-2', isRow && 'items-center')}>
          <p
            className={cn(
              'text-xs font-medium',
              variant === 'default' || variant === 'flat'
                ? 'text-muted-foreground'
                : 'opacity-80',
              !isRow && 'uppercase tracking-wide',
            )}
          >
            {label}
          </p>
          {Icon && !isRow && (
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                variant === 'default' || variant === 'flat' ? 'text-brand' : 'opacity-80',
              )}
            />
          )}
        </div>
        <p
          className={cn(
            'font-bold tabular-nums tracking-tight',
            isRow ? 'mt-0.5 text-xl leading-none' : 'mt-2 text-2xl',
          )}
        >
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              'text-xs leading-snug',
              isRow && 'mt-0.5',
              variant === 'default' || variant === 'flat'
                ? 'text-muted-foreground'
                : 'opacity-75',
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
