import { cn } from '@/lib/utils'

export function CoachingThreadSkeleton({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn('animate-pulse space-y-2.5', className)}
      aria-hidden
    >
      <div
        className={cn(
          'rounded-lg bg-muted/55',
          compact ? 'h-9 w-[72%]' : 'h-10 w-[68%]',
        )}
      />
      <div
        className={cn(
          'ml-auto rounded-lg bg-muted/40',
          compact ? 'h-9 w-[58%]' : 'h-10 w-[52%]',
        )}
      />
      <div
        className={cn(
          'rounded-lg bg-muted/45',
          compact ? 'h-9 w-[64%]' : 'h-10 w-[60%]',
        )}
      />
      <div
        className={cn(
          'rounded-md bg-muted/35',
          compact ? 'mt-1 h-16' : 'mt-2 h-[4.5rem]',
        )}
      />
    </div>
  )
}
