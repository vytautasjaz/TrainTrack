import { ShimmerBlock } from '@/components/ui/shimmer'
import { cn } from '@/lib/utils'

type RouteSkeletonProps = {
  className?: string
}

/** Shared attrs for route `loading.tsx` shells (nav progress reads this). */
const ROUTE_PENDING = {
  'data-tt-route-pending': 'true',
  'aria-busy': true as const,
  'aria-label': 'Loading',
}

const BLOCK = 'rounded-[var(--radius-xl)]'

/** Default in-app route placeholder — up to 6 large blocks. */
export function GenericPageSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl space-y-4 pt-2 lg:pt-4', className)} {...ROUTE_PENDING}>
      <ShimmerBlock className={cn(BLOCK, 'h-12 w-56 sm:h-14 sm:w-72')} />
      <ShimmerBlock className={cn(BLOCK, 'h-40 w-full')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ShimmerBlock className={cn(BLOCK, 'h-32')} />
        <ShimmerBlock className={cn(BLOCK, 'h-32')} />
      </div>
      <ShimmerBlock className={cn(BLOCK, 'h-48 w-full')} />
    </div>
  )
}

/** Athlete home — hero + week + widgets (5 blocks). */
export function AthleteHomeSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div
      className={cn('tt-athlete-home-v2', className)}
      {...ROUTE_PENDING}
      aria-label="Loading home"
    >
      <div className="tt-athlete-home-v2-shell tt-v2-mod-stack">
        <ShimmerBlock className={cn(BLOCK, 'tt-shimmer--on-dark h-40 w-full sm:h-44')} />
        <ShimmerBlock className={cn(BLOCK, 'h-56 w-full sm:h-64')} />
        <div className="tt-v2-mod-widgets grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShimmerBlock className={cn(BLOCK, 'h-36')} />
          <ShimmerBlock className={cn(BLOCK, 'h-36')} />
          <ShimmerBlock className={cn(BLOCK, 'h-36 sm:col-span-2 lg:col-span-1')} />
        </div>
      </div>
    </div>
  )
}

/** Tools / calculators — hero + panel blocks (4). */
export function ToolsCalculatorSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div
      className={cn('tt-athlete-home-v2', className)}
      {...ROUTE_PENDING}
      aria-label="Loading tools"
    >
      <div className="tt-athlete-home-v2-shell space-y-4">
        <ShimmerBlock
          className={cn(BLOCK, 'tt-shimmer--on-dark mx-auto h-28 w-full max-w-3xl sm:h-32')}
        />
        <div className="tt-tools-calc-panel mx-auto flex w-full max-w-3xl flex-col gap-3 pb-8">
          <ShimmerBlock className={cn(BLOCK, 'h-36 w-full')} />
          <ShimmerBlock className={cn(BLOCK, 'h-28 w-full')} />
          <ShimmerBlock className={cn(BLOCK, 'h-40 w-full')} />
        </div>
      </div>
    </div>
  )
}

/** Training — title + list rows (5 blocks). */
export function TrainingPageSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div className={cn('space-y-3 pt-2 lg:pt-4', className)} {...ROUTE_PENDING} aria-label="Loading training">
      <ShimmerBlock className={cn(BLOCK, 'h-12 w-48 sm:h-14 sm:w-56')} />
      <ShimmerBlock className={cn(BLOCK, 'h-20 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-20 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-20 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-20 w-full')} />
    </div>
  )
}

/** Stats / progress — chart + side + table (5 blocks). */
export function StatsPageSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div
      className={cn('w-full min-w-0 max-w-[90rem] space-y-4 pt-2 lg:pt-4', className)}
      {...ROUTE_PENDING}
      aria-label="Loading stats"
    >
      <ShimmerBlock className={cn(BLOCK, 'h-12 w-40 sm:h-14 sm:w-48')} />
      <div className="grid gap-3 lg:grid-cols-3">
        <ShimmerBlock className={cn(BLOCK, 'h-64 w-full lg:col-span-2')} />
        <ShimmerBlock className={cn(BLOCK, 'h-64 w-full')} />
      </div>
      <ShimmerBlock className={cn(BLOCK, 'h-48 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-36 w-full')} />
    </div>
  )
}

/** Season / races — title + rows (5 blocks). */
export function SeasonPageSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div className={cn('space-y-3 pt-2 lg:pt-4', className)} {...ROUTE_PENDING} aria-label="Loading season">
      <ShimmerBlock className={cn(BLOCK, 'h-12 w-44 sm:h-14 sm:w-52')} />
      <ShimmerBlock className={cn(BLOCK, 'h-24 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-24 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-24 w-full')} />
      <ShimmerBlock className={cn(BLOCK, 'h-24 w-full')} />
    </div>
  )
}

/** Inbox — list + pane (4 blocks). */
export function InboxPageSkeleton({ className }: RouteSkeletonProps) {
  return (
    <div
      className={cn(
        'grid min-h-[28rem] gap-3 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]',
        className,
      )}
      {...ROUTE_PENDING}
      aria-label="Loading inbox"
    >
      <div className="flex flex-col gap-3">
        <ShimmerBlock className={cn(BLOCK, 'h-16 w-full')} />
        <ShimmerBlock className={cn(BLOCK, 'h-16 w-full')} />
        <ShimmerBlock className={cn(BLOCK, 'min-h-[12rem] flex-1 w-full')} />
      </div>
      <ShimmerBlock className={cn(BLOCK, 'min-h-[28rem] w-full')} />
    </div>
  )
}
