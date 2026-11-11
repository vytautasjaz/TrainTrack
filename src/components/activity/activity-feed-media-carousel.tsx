'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ActivityRouteMap } from '@/components/plan/activity-route-map'
import {
  getWorkoutStravaStreams,
  type WorkoutStravaStreamsResult,
} from '@/app/actions/strava'
import { cn } from '@/lib/utils'

const ActivityStreamChart = dynamic(
  () =>
    import('@/components/activity/activity-stream-chart').then(
      (m) => m.ActivityStreamChart,
    ),
  { ssr: false },
)

export type FeedMediaPane = 'map' | 'power' | 'hr' | 'elevation'

type ActivityFeedMediaCarouselProps = {
  workoutId: string
  stravaActivityId?: string | null
  summaryPolyline?: string | null
  routeColor: string
  /** Hints from stored scalars — panes may hide after fetch if stream missing. */
  hasPowerHint?: boolean
  hasHrHint?: boolean
  hasElevationHint?: boolean
  className?: string
}

const PANE_LABEL: Record<FeedMediaPane, string> = {
  map: 'Map',
  power: 'Power',
  hr: 'Heart rate',
  elevation: 'Elevation',
}

function paneLayerClass(isActive: boolean, stacked: boolean) {
  return cn(
    'transition-none',
    stacked
      ? cn(
          'absolute inset-0 overflow-hidden',
          !isActive && 'invisible pointer-events-none',
        )
      : isActive
        ? 'relative w-full'
        : 'hidden',
  )
}

function buildInitialPanes(opts: {
  summaryPolyline?: string | null
  canFetch: boolean
  hasPowerHint: boolean
  hasHrHint: boolean
  hasElevationHint: boolean
}): FeedMediaPane[] {
  const panes: FeedMediaPane[] = []
  if (opts.summaryPolyline?.trim()) panes.push('map')
  if (opts.canFetch && opts.hasPowerHint) panes.push('power')
  if (opts.canFetch && opts.hasHrHint) panes.push('hr')
  if (opts.canFetch && opts.hasElevationHint) panes.push('elevation')
  // No map and no scalar hints: still try charts after fetch (below).
  return panes
}

function filterPanesWithStreams(
  summaryPolyline: string | null | undefined,
  result: WorkoutStravaStreamsResult | null,
): FeedMediaPane[] {
  const next: FeedMediaPane[] = []
  if (summaryPolyline?.trim()) next.push('map')
  if (result?.watts) next.push('power')
  if (result?.heartrate) next.push('hr')
  if (result?.altitude) next.push('elevation')
  return next
}

export function ActivityFeedMediaCarousel({
  workoutId,
  stravaActivityId,
  summaryPolyline,
  routeColor,
  hasPowerHint = false,
  hasHrHint = false,
  hasElevationHint = false,
  className,
}: ActivityFeedMediaCarouselProps) {
  const canFetch = Boolean(stravaActivityId)
  const hasMap = Boolean(summaryPolyline?.trim())

  const initialPanes = useMemo(
    () =>
      buildInitialPanes({
        summaryPolyline,
        canFetch,
        hasPowerHint,
        hasHrHint,
        hasElevationHint,
      }),
    [summaryPolyline, canFetch, hasPowerHint, hasHrHint, hasElevationHint],
  )

  // Fetch when we might have chart panes, or when there is Strava but no map yet.
  const shouldResolveStreams =
    canFetch &&
    (hasPowerHint ||
      hasHrHint ||
      hasElevationHint ||
      !hasMap ||
      initialPanes.some((p) => p !== 'map'))

  const [panes, setPanes] = useState<FeedMediaPane[]>(initialPanes)
  const [index, setIndex] = useState(0)
  const [streams, setStreams] = useState<WorkoutStravaStreamsResult | null>(null)
  const [streamsResolved, setStreamsResolved] = useState(!shouldResolveStreams)
  const [loadError, setLoadError] = useState(false)
  const [pending, startTransition] = useTransition()
  const fetchedForWorkoutRef = useRef<string | null>(null)
  const mapSlotRef = useRef<HTMLDivElement | null>(null)
  const [mapFrameHeightPx, setMapFrameHeightPx] = useState<number | null>(null)

  const active = panes[index] ?? panes[0] ?? null
  const stacked = mapFrameHeightPx != null && mapFrameHeightPx > 0

  useEffect(() => {
    setPanes(initialPanes)
    setIndex(0)
    setStreams(null)
    setLoadError(false)
    setStreamsResolved(!shouldResolveStreams)
    fetchedForWorkoutRef.current = null
  }, [initialPanes, shouldResolveStreams, workoutId])

  // Keep chart panes the same outer size as the map slot.
  useEffect(() => {
    const el = mapSlotRef.current
    if (!el || !summaryPolyline?.trim()) {
      setMapFrameHeightPx(null)
      return
    }
    const measure = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) setMapFrameHeightPx(Math.round(h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [summaryPolyline])

  useEffect(() => {
    if (!shouldResolveStreams) return
    if (fetchedForWorkoutRef.current === workoutId) return
    fetchedForWorkoutRef.current = workoutId

    startTransition(async () => {
      try {
        const result = await getWorkoutStravaStreams(workoutId)
        setStreams(result)
        const confirmed = filterPanesWithStreams(summaryPolyline, result)
        // Keep map even when cache is empty; drop optimistic chart panes
        // that have no stream so arrows don't appear for map-only cards.
        if (confirmed.length > 0) {
          setPanes(confirmed)
        } else if (summaryPolyline?.trim()) {
          setPanes(['map'])
        } else {
          setPanes([])
        }
      } catch {
        setLoadError(true)
        setPanes(
          summaryPolyline?.trim()
            ? ['map']
            : initialPanes.filter((p) => p === 'map'),
        )
      } finally {
        setStreamsResolved(true)
      }
    })
  }, [shouldResolveStreams, workoutId, summaryPolyline, initialPanes])

  useEffect(() => {
    if (index >= panes.length) setIndex(Math.max(0, panes.length - 1))
  }, [panes, index])

  if (!active || panes.length === 0) {
    if (shouldResolveStreams && !streamsResolved) {
      return (
        <div
          className={cn(
            'flex min-h-[5.5rem] items-center justify-center px-4 text-center text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]',
            className,
          )}
        >
          Loading activity media…
        </div>
      )
    }
    return null
  }

  // Arrows only after we know there is more than one real pane.
  const showControls = streamsResolved && panes.length > 1
  const compactCharts = !summaryPolyline?.trim()
  const showPower = panes.includes('power')
  const showHr = panes.includes('hr')
  const showElevation = panes.includes('elevation')

  function go(delta: number) {
    setIndex((i) => {
      const n = panes.length
      if (n === 0) return 0
      return (i + delta + n) % n
    })
  }

  return (
    <div
      className={cn('relative min-w-0 transition-none', className)}
      style={stacked ? { height: mapFrameHeightPx } : undefined}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Keep map mounted so tiles don’t reload when switching back. */}
      {summaryPolyline?.trim() ? (
        <div
          ref={mapSlotRef}
          className={paneLayerClass(active === 'map', stacked)}
          aria-hidden={active !== 'map'}
        >
          <ActivityRouteMap
            summaryPolyline={summaryPolyline}
            routeColor={routeColor}
          />
        </div>
      ) : null}

      {showPower ? (
        <div
          className={paneLayerClass(active === 'power', stacked)}
          aria-hidden={active !== 'power'}
        >
          {streams?.watts ? (
            <ActivityStreamChart
              values={streams.watts.values}
              time={streams.watts.time}
              label="Power"
              unit="W"
              color="var(--color-sport-bike, #fc4c02)"
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
              strokeWidth={0.9}
            />
          ) : active === 'power' ? (
            <StreamPlaceholder
              label="Power"
              pending={pending && !streamsResolved}
              empty={streamsResolved || loadError}
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
            />
          ) : null}
        </div>
      ) : null}

      {showHr ? (
        <div
          className={paneLayerClass(active === 'hr', stacked)}
          aria-hidden={active !== 'hr'}
        >
          {streams?.heartrate ? (
            <ActivityStreamChart
              values={streams.heartrate.values}
              time={streams.heartrate.time}
              label="Heart rate"
              unit="bpm"
              color="var(--tt-red, #da2f36)"
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
              strokeWidth={0.9}
            />
          ) : active === 'hr' ? (
            <StreamPlaceholder
              label="Heart rate"
              pending={pending && !streamsResolved}
              empty={streamsResolved || loadError}
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
            />
          ) : null}
        </div>
      ) : null}

      {showElevation ? (
        <div
          className={paneLayerClass(active === 'elevation', stacked)}
          aria-hidden={active !== 'elevation'}
        >
          {streams?.altitude ? (
            <ActivityStreamChart
              values={streams.altitude.values}
              time={streams.altitude.time}
              distanceMeters={streams.altitude.distance}
              label="Elevation"
              unit="m"
              color="var(--color-sport-run, #1a9f5c)"
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
              strokeWidth={0.9}
            />
          ) : active === 'elevation' ? (
            <StreamPlaceholder
              label="Elevation"
              pending={pending && !streamsResolved}
              empty={streamsResolved || loadError}
              compact={compactCharts}
              frameHeightPx={mapFrameHeightPx}
            />
          ) : null}
        </div>
      ) : null}

      {showControls ? (
        <>
          <button
            type="button"
            aria-label="Previous view"
            className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--tt-line,#ebebeb)] bg-white/90 text-[var(--tt-ink,#111)] shadow-sm hover:bg-white"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(-1)
            }}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next view"
            className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--tt-line,#ebebeb)] bg-white/90 text-[var(--tt-ink,#111)] shadow-sm hover:bg-white"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(1)
            }}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-2 py-1">
            {panes.map((pane, i) => (
              <span
                key={pane}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i === index ? 'bg-white' : 'bg-white/40',
                )}
                title={PANE_LABEL[pane]}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function StreamPlaceholder({
  label,
  pending,
  empty,
  compact = false,
  frameHeightPx = null,
}: {
  label: string
  pending: boolean
  empty: boolean
  compact?: boolean
  frameHeightPx?: number | null
}) {
  return (
    <div
      className={cn(
        'flex h-full items-center justify-center px-4 text-center text-[12px] text-[var(--tt-ink-soft,#6b6b6b)] transition-none',
        frameHeightPx
          ? null
          : compact
            ? 'min-h-[5.5rem]'
            : 'aspect-[2/1] min-h-[9rem]',
      )}
      style={frameHeightPx ? { height: frameHeightPx } : undefined}
    >
      {pending
        ? `Loading ${label.toLowerCase()}…`
        : empty
          ? `No ${label.toLowerCase()} stream for this activity`
          : `Loading ${label.toLowerCase()}…`}
    </div>
  )
}
