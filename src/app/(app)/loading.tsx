/** Minimal page placeholder while the next route's server data loads. */
export default function Loading() {
  return (
    <div className="space-y-4 pt-2" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-36 animate-pulse rounded-[6px] bg-muted" />
      <div className="h-28 animate-pulse rounded-[6px] bg-muted/70" />
      <div className="h-28 animate-pulse rounded-[6px] bg-muted/50" />
    </div>
  )
}
