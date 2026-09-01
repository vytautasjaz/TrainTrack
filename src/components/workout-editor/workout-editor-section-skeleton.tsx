import { CoachingThreadSkeleton } from '@/components/inbox/coaching-thread-skeleton'
import { cn } from '@/lib/utils'

export type WorkoutEditorSectionSkeletonVariant =
  | 'chat'
  | 'swim'
  | 'blocks'
  | 'include'
  | 'generic'

export function WorkoutEditorSectionSkeleton({
  variant = 'generic',
  className,
}: {
  variant?: WorkoutEditorSectionSkeletonVariant
  className?: string
}) {
  if (variant === 'chat') {
    return <CoachingThreadSkeleton compact className={className} />
  }

  return (
    <div
      className={cn('animate-pulse space-y-3 py-1', className)}
      aria-hidden
    >
      <div
        className={cn(
          'rounded-lg bg-muted/55',
          variant === 'swim' ? 'h-28' : variant === 'blocks' ? 'h-32' : 'h-20',
        )}
      />
      <div className="h-10 rounded-lg bg-muted/45" />
      <div className="h-10 w-[88%] rounded-lg bg-muted/40" />
      {variant === 'swim' || variant === 'blocks' ? (
        <div className="h-24 rounded-lg bg-muted/35" />
      ) : null}
    </div>
  )
}

export function WorkoutEditorSectionLoading({
  label = 'Loading…',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <p className={cn('py-2 text-sm text-muted-foreground', className)} role="status">
      {label}
    </p>
  )
}
