import { cn } from '@/lib/utils'

export function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn('tt-shimmer', className)} aria-hidden />
}
