import { ShimmerBlock } from '@/components/ui/shimmer'

function TopicRailSkeleton() {
  return (
    <nav className="min-h-0 overflow-y-auto" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="border-b border-[var(--tt-line)] px-3 py-2.5 sm:px-4">
          <ShimmerBlock className="h-3.5 w-[70%] rounded-[4px]" />
        </div>
      ))}
    </nav>
  )
}

function ProfileContentSkeleton() {
  return (
    <div
      className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-[var(--tt-line)]"
      aria-hidden
    >
      <div className="min-w-0 space-y-4 pr-3 sm:pr-4">
        <div className="flex gap-3">
          <ShimmerBlock className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <ShimmerBlock className="h-4 w-[58%] rounded-[4px]" />
            <ShimmerBlock className="h-3.5 w-[42%] rounded-[4px]" />
            <div className="flex gap-2 pt-0.5">
              <ShimmerBlock className="h-6 w-16 rounded-full" />
              <ShimmerBlock className="h-6 w-14 rounded-[4px]" />
            </div>
          </div>
        </div>
        <ShimmerBlock className="h-3.5 w-[72%] rounded-[4px]" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-8 w-16 rounded-[6px]" />
          <ShimmerBlock className="h-8 w-24 rounded-[6px]" />
        </div>
      </div>

      <div className="min-w-0 space-y-2 pl-3 sm:pl-4">
        <ShimmerBlock className="h-3 w-24 rounded-[4px]" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-[var(--tt-line)] py-2.5 last:border-b-0">
            <ShimmerBlock className="h-4 w-4 shrink-0 rounded-[4px]" />
            <ShimmerBlock className="h-3.5 min-w-0 flex-1 rounded-[4px]" />
            <ShimmerBlock className="h-3.5 w-10 shrink-0 rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CoachRosterProfileSkeleton() {
  return (
    <div
      className="grid min-h-[14rem] min-w-[28rem] grid-cols-[minmax(0,10rem)_minmax(0,1fr)] divide-x divide-[var(--tt-line)] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
      role="status"
      aria-busy="true"
      aria-label="Loading athlete profile"
    >
      <TopicRailSkeleton />
      <div className="min-h-0 min-w-0 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3">
        <ProfileContentSkeleton />
      </div>
    </div>
  )
}
