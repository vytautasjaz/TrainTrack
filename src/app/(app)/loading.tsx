/** Page placeholder while the next route's server data loads — keep with top route progress. */
export default function Loading() {
  return (
    <div
      className="space-y-4 pt-2"
      data-tt-route-pending="true"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-7 w-36 animate-pulse rounded-[6px] bg-muted" />
      <div className="h-28 animate-pulse rounded-[6px] bg-muted/70" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-[6px] bg-muted/50" />
        <div className="h-28 animate-pulse rounded-[6px] bg-muted/40" />
      </div>
      <div className="h-40 animate-pulse rounded-[6px] bg-muted/35" />
    </div>
  )
}
