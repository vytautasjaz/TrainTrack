'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { decodePolyline } from '@/lib/polyline'
import { cn } from '@/lib/utils'

type ActivityRouteMapProps = {
  summaryPolyline: string
  routeColor?: string
  className?: string
}

type MapSize = 'inline' | 'expanded'

const TILE_SIZE = 256
const MAX_TILES = 64
const MIN_ZOOM = 10
const MAX_ZOOM = 18
/** Extra coverage so CSS scale-out does not flash empty edges. */
const TILE_PAD = 0.55
/** Wheel → zoom: lower = gentler. */
const WHEEL_ZOOM_SPEED = 0.0035
/** OSM France HOT — softer pastels than standard OSM; no API key. */
const TILE_SUBDOMAINS = ['a', 'b', 'c'] as const

function tileUrl(zoom: number, tx: number, ty: number): string {
  const sub = TILE_SUBDOMAINS[Math.abs(tx + ty) % TILE_SUBDOMAINS.length]!
  return `https://${sub}.tile.openstreetmap.fr/hot/${zoom}/${tx}/${ty}.png`
}

type LatLng = { lat: number; lng: number }
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom
}

function latToWorldY(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180)
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
  return y * TILE_SIZE * 2 ** zoom
}

function worldXToLng(x: number, zoom: number): number {
  return (x / (TILE_SIZE * 2 ** zoom)) * 360 - 180
}

function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * 2 ** zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function chooseFitZoom(bounds: Bounds, widthPx: number, heightPx: number): number {
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z -= 1) {
    const w = Math.abs(lngToWorldX(bounds.maxLng, z) - lngToWorldX(bounds.minLng, z))
    const h = Math.abs(latToWorldY(bounds.minLat, z) - latToWorldY(bounds.maxLat, z))
    if (w <= widthPx * 0.84 && h <= heightPx * 0.84) return z
  }
  return MIN_ZOOM
}

function padBounds(bounds: Bounds, factor = 0.12): Bounds {
  const latPad = Math.max((bounds.maxLat - bounds.minLat) * factor, 0.0006)
  const lngPad = Math.max((bounds.maxLng - bounds.minLng) * factor, 0.0006)
  return {
    minLat: clamp(bounds.minLat - latPad, -85, 85),
    maxLat: clamp(bounds.maxLat + latPad, -85, 85),
    minLng: clamp(bounds.minLng - lngPad, -180, 180),
    maxLng: clamp(bounds.maxLng + lngPad, -180, 180),
  }
}

function centerOf(bounds: Bounds): LatLng {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  }
}

function tileZoomFor(viewZoom: number): number {
  return clamp(Math.round(viewZoom), MIN_ZOOM, MAX_ZOOM)
}

/** Keep the geographic point under `anchor` (view px) fixed when zoom changes. */
function centerForZoomAtAnchor(
  prevZoom: number,
  nextZoom: number,
  center: LatLng,
  anchor: { x: number; y: number },
  width: number,
  height: number,
): LatLng {
  const worldX = lngToWorldX(center.lng, prevZoom) - width / 2 + anchor.x
  const worldY = latToWorldY(center.lat, prevZoom) - height / 2 + anchor.y
  const anchorLng = worldXToLng(worldX, prevZoom)
  const anchorLat = worldYToLat(worldY, prevZoom)
  const newAnchorX = lngToWorldX(anchorLng, nextZoom)
  const newAnchorY = latToWorldY(anchorLat, nextZoom)
  return {
    lng: worldXToLng(newAnchorX - (anchor.x - width / 2), nextZoom),
    lat: worldYToLat(newAnchorY - (anchor.y - height / 2), nextZoom),
  }
}

export function ActivityRouteMap({
  summaryPolyline,
  routeColor = 'var(--color-sport-run, #e85d4c)',
  className,
}: ActivityRouteMapProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <ActivityRouteMapCanvas
        summaryPolyline={summaryPolyline}
        routeColor={routeColor}
        className={className}
        size="inline"
        onExpand={() => setExpanded(true)}
      />
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          hideCloseButton
          className="w-[calc(100%-1.5rem)] max-w-[min(96vw,72rem)] gap-0 overflow-hidden border-[var(--tt-line)] bg-white p-2 sm:p-3"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DialogTitle className="sr-only">Expanded activity map</DialogTitle>
          <ActivityRouteMapCanvas
            summaryPolyline={summaryPolyline}
            routeColor={routeColor}
            size="expanded"
            onCollapse={() => setExpanded(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function ActivityRouteMapCanvas({
  summaryPolyline,
  routeColor = 'var(--color-sport-run, #e85d4c)',
  className,
  size,
  onExpand,
  onCollapse,
}: ActivityRouteMapProps & {
  size: MapSize
  onExpand?: () => void
  onCollapse?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: LatLng
  } | null>(null)
  const viewRef = useRef({ zoom: MIN_ZOOM, center: { lat: 0, lng: 0 } as LatLng })
  const animRef = useRef<number | null>(null)
  const wheelRafRef = useRef<number | null>(null)
  const pendingWheelRef = useRef<{
    dy: number
    anchor: { x: number; y: number }
  } | null>(null)

  const base = useMemo(() => {
    const points = decodePolyline(summaryPolyline)
    if (points.length < 2) return null

    let minLat = points[0]![0]
    let maxLat = points[0]![0]
    let minLng = points[0]![1]
    let maxLng = points[0]![1]
    for (const [lat, lng] of points) {
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    }

    const routeBounds = padBounds({ minLat, maxLat, minLng, maxLng })
    const midLat = (routeBounds.minLat + routeBounds.maxLat) / 2
    const latSpan = Math.max(routeBounds.maxLat - routeBounds.minLat, 0.0004)
    const lngSpan = Math.max(routeBounds.maxLng - routeBounds.minLng, 0.0004)
    const lngScale = Math.cos((midLat * Math.PI) / 180)
    const geoAspect = (lngSpan * lngScale) / latSpan
    const width = size === 'expanded' ? 1280 : 640
    const height = clamp(
      Math.round(width / geoAspect),
      size === 'expanded' ? 360 : 180,
      size === 'expanded' ? 720 : 320,
    )
    const fitZoom = chooseFitZoom(routeBounds, width, height)
    const fitCenter = centerOf(routeBounds)

    return {
      points,
      routeBounds,
      width,
      height,
      fitZoom,
      fitCenter,
      aspectRatio: `${width} / ${height}`,
    }
  }, [size, summaryPolyline])

  const [viewZoom, setViewZoom] = useState(MIN_ZOOM)
  const [center, setCenter] = useState<LatLng>({ lat: 0, lng: 0 })
  const [ready, setReady] = useState(false)

  const syncView = useCallback((zoom: number, nextCenter: LatLng) => {
    viewRef.current = { zoom, center: nextCenter }
    setViewZoom(zoom)
    setCenter(nextCenter)
  }, [])

  useEffect(() => {
    if (!base) return
    syncView(base.fitZoom, base.fitCenter)
    setReady(true)
  }, [base, syncView])

  useEffect(() => {
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current)
      if (wheelRafRef.current != null) cancelAnimationFrame(wheelRafRef.current)
    }
  }, [])

  const tileZoom = tileZoomFor(viewZoom)
  const scale = 2 ** (viewZoom - tileZoom)

  const geometry = useMemo(() => {
    if (!base || !ready) return null

    const { width, height, points } = base
    const cx = lngToWorldX(center.lng, tileZoom)
    const cy = latToWorldY(center.lat, tileZoom)
    const worldLeft = cx - width / 2
    const worldTop = cy - height / 2

    const project = (lat: number, lng: number): [number, number] => {
      const x = lngToWorldX(lng, tileZoom) - worldLeft
      const y = latToWorldY(lat, tileZoom) - worldTop
      return [x, y]
    }

    const projected = points.map(([lat, lng]) => project(lat, lng))
    const path = projected
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ')
    const start = projected[0]!
    const end = projected[projected.length - 1]!

    const padX = width * TILE_PAD
    const padY = height * TILE_PAD
    const tileMinX = Math.floor((worldLeft - padX) / TILE_SIZE)
    const tileMaxX = Math.floor((worldLeft + width + padX - 0.001) / TILE_SIZE)
    const tileMinY = Math.floor((worldTop - padY) / TILE_SIZE)
    const tileMaxY = Math.floor((worldTop + height + padY - 0.001) / TILE_SIZE)
    const tiles: Array<{ key: string; url: string; x: number; y: number; w: number; h: number }> =
      []

    let count = 0
    outer: for (let ty = tileMinY; ty <= tileMaxY; ty += 1) {
      for (let tx = tileMinX; tx <= tileMaxX; tx += 1) {
        if (count >= MAX_TILES) break outer
        const tileWorldX = tx * TILE_SIZE
        const tileWorldY = ty * TILE_SIZE
        tiles.push({
          key: `${tileZoom}/${tx}/${ty}`,
          url: tileUrl(tileZoom, tx, ty),
          x: tileWorldX - worldLeft,
          y: tileWorldY - worldTop,
          w: TILE_SIZE,
          h: TILE_SIZE,
        })
        count += 1
      }
    }

    return {
      width,
      height,
      path,
      start,
      end,
      tiles,
    }
  }, [base, center, ready, tileZoom])

  const applyZoomDelta = useCallback(
    (delta: number, anchor?: { x: number; y: number }) => {
      if (!base) return
      const prev = viewRef.current
      const nextZoom = clamp(prev.zoom + delta, MIN_ZOOM, MAX_ZOOM)
      if (nextZoom === prev.zoom) return

      const nextCenter = anchor
        ? centerForZoomAtAnchor(
            prev.zoom,
            nextZoom,
            prev.center,
            anchor,
            base.width,
            base.height,
          )
        : prev.center

      syncView(nextZoom, nextCenter)
    },
    [base, syncView],
  )

  const animateZoomBy = useCallback(
    (delta: number, anchor?: { x: number; y: number }) => {
      if (!base) return
      if (animRef.current != null) cancelAnimationFrame(animRef.current)

      const startZoom = viewRef.current.zoom
      const endZoom = clamp(Math.round(startZoom) + delta, MIN_ZOOM, MAX_ZOOM)
      if (Math.abs(endZoom - startZoom) < 1e-6) return

      const startCenter = viewRef.current.center
      const durationMs = 220
      const t0 = performance.now()

      const tick = (now: number) => {
        const t = clamp((now - t0) / durationMs, 0, 1)
        // ease-out cubic
        const eased = 1 - (1 - t) ** 3
        const z = startZoom + (endZoom - startZoom) * eased
        const nextCenter = anchor
          ? centerForZoomAtAnchor(startZoom, z, startCenter, anchor, base.width, base.height)
          : startCenter
        syncView(z, nextCenter)
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          animRef.current = null
          syncView(endZoom, nextCenter)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [base, syncView],
  )

  useEffect(() => {
    // Wait until the map node is mounted (early renders return null before ready).
    if (!ready || !base) return
    const node = rootRef.current
    if (!node) return

    const flushWheel = () => {
      wheelRafRef.current = null
      const pending = pendingWheelRef.current
      if (!pending) return
      pendingWheelRef.current = null
      applyZoomDelta(-pending.dy * WHEEL_ZOOM_SPEED, pending.anchor)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      let dy = event.deltaY
      if (event.deltaMode === 1) dy *= 16
      if (event.deltaMode === 2) dy *= 320
      if (dy === 0) return

      const prev = pendingWheelRef.current
      pendingWheelRef.current = {
        dy: (prev?.dy ?? 0) + dy,
        anchor: {
          x: ((event.clientX - rect.left) / rect.width) * base.width,
          y: ((event.clientY - rect.top) / rect.height) * base.height,
        },
      }

      if (wheelRafRef.current == null) {
        wheelRafRef.current = requestAnimationFrame(flushWheel)
      }
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [applyZoomDelta, base, ready])
  const resetView = useCallback(() => {
    if (!base) return
    if (animRef.current != null) cancelAnimationFrame(animRef.current)
    animRef.current = null
    syncView(base.fitZoom, base.fitCenter)
  }, [base, syncView])

  if (!base || !geometry) return null

  const canZoomIn = viewZoom < MAX_ZOOM - 1e-6
  const canZoomOut = viewZoom > MIN_ZOOM + 1e-6
  const isFit =
    Math.abs(viewZoom - base.fitZoom) < 1e-4 &&
    Math.abs(center.lat - base.fitCenter.lat) < 1e-7 &&
    Math.abs(center.lng - base.fitCenter.lng) < 1e-7

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative overflow-hidden rounded-[6px] border border-[var(--tt-line)] bg-[#dfe6ec]',
        'touch-none select-none',
        size === 'expanded' && 'w-full',
        className,
      )}
      style={{
        aspectRatio: base.aspectRatio,
        ...(size === 'expanded' ? { maxHeight: 'min(80vh, 720px)' } : null),
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.button !== 0) return
        if (animRef.current != null) {
          cancelAnimationFrame(animRef.current)
          animRef.current = null
        }
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: viewRef.current.center,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId || !base) return
        const rect = rootRef.current?.getBoundingClientRect()
        if (!rect || rect.width <= 0 || rect.height <= 0) return
        const z = viewRef.current.zoom
        const dx = ((event.clientX - drag.startX) / rect.width) * base.width
        const dy = ((event.clientY - drag.startY) / rect.height) * base.height
        const originX = lngToWorldX(drag.origin.lng, z)
        const originY = latToWorldY(drag.origin.lat, z)
        const nextCenter = {
          lng: worldXToLng(originX - dx, z),
          lat: worldYToLat(originY - dy, z),
        }
        syncView(z, nextCenter)
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const rect = rootRef.current?.getBoundingClientRect()
        if (!rect || !base) return
        animateZoomBy(1, {
          x: ((event.clientX - rect.left) / rect.width) * base.width,
          y: ((event.clientY - rect.top) / rect.height) * base.height,
        })
      }}
    >
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        {geometry.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              left: `${(tile.x / geometry.width) * 100}%`,
              top: `${(tile.y / geometry.height) * 100}%`,
              width: `${(tile.w / geometry.width) * 100}%`,
              height: `${(tile.h / geometry.height) * 100}%`,
              filter: 'saturate(0.78) contrast(0.96) brightness(1.03)',
              opacity: 0.92,
            }}
          />
        ))}

        <svg
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          role="img"
          aria-label="Activity route map"
        >
          <path
            d={geometry.path}
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <path
            d={geometry.path}
            fill="none"
            stroke={routeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={geometry.start[0]}
            cy={geometry.start[1]}
            r="5.5"
            fill="var(--tt-good, #1a9f5c)"
            stroke="white"
            strokeWidth="2"
          />
          <rect
            x={geometry.end[0] - 5.5}
            y={geometry.end[1] - 5.5}
            width="11"
            height="11"
            fill="white"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1.25"
            rx="1.5"
          />
          <path
            d={`M${geometry.end[0] - 5.5} ${geometry.end[1] - 5.5} h5.5 v5.5 h-5.5 z M${geometry.end[0]} ${geometry.end[1]} h5.5 v5.5 h-5.5 z`}
            fill="rgba(0,0,0,0.8)"
          />
        </svg>
      </div>

      <div
        className="absolute right-1.5 top-1.5 flex flex-col overflow-hidden rounded-[6px] border border-black/10 bg-white/90 shadow-sm backdrop-blur-[2px]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom in"
          disabled={!canZoomIn}
          onClick={(event) => {
            event.stopPropagation()
            animateZoomBy(1)
          }}
          className="inline-flex h-7 w-7 items-center justify-center text-[var(--tt-ink)] transition hover:bg-black/5 disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!canZoomOut}
          onClick={(event) => {
            event.stopPropagation()
            animateZoomBy(-1)
          }}
          className="inline-flex h-7 w-7 items-center justify-center border-t border-black/10 text-[var(--tt-ink)] transition hover:bg-black/5 disabled:opacity-35"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
        {onExpand ? (
          <button
            type="button"
            aria-label="Expand map"
            onClick={(event) => {
              event.stopPropagation()
              onExpand()
            }}
            className="inline-flex h-7 w-7 items-center justify-center border-t border-black/10 text-[var(--tt-ink)] transition hover:bg-black/5"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
        {onCollapse ? (
          <button
            type="button"
            aria-label="Collapse map"
            onClick={(event) => {
              event.stopPropagation()
              onCollapse()
            }}
            className="inline-flex h-7 w-7 items-center justify-center border-t border-black/10 text-[var(--tt-ink)] transition hover:bg-black/5"
          >
            <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
        {!isFit ? (
          <button
            type="button"
            aria-label="Reset map"
            onClick={(event) => {
              event.stopPropagation()
              resetView()
            }}
            className="inline-flex h-7 w-7 items-center justify-center border-t border-black/10 text-[var(--tt-ink)] transition hover:bg-black/5"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      <p className="pointer-events-none absolute bottom-1 left-1 rounded bg-white/75 px-1 py-0.5 text-[8px] leading-none text-black/55">
        Scroll / drag to explore
      </p>
      <p className="pointer-events-none absolute bottom-1 right-1 rounded bg-white/75 px-1 py-0.5 text-[8px] leading-none text-black/55">
        © OSM · HOT
      </p>
    </div>
  )
}
