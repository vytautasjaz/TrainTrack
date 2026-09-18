'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ActivityStreamChartProps = {
  values: number[]
  time: number[]
  /** Distance in meters at each sample (elevation charts). */
  distanceMeters?: number[] | null
  label: string
  unit: string
  color: string
  /** Shorter chart when there’s no map (e.g. strength / indoor). */
  compact?: boolean
  /**
   * Match the map slot: CSS pixel height of the media frame.
   * Chart keeps this outer size; Y values stay on a logical scale inside.
   */
  frameHeightPx?: number | null
  strokeWidth?: number
  className?: string
}

function formatAxisValue(value: number, unit: string): string {
  if (unit === 'm') {
    return Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(0)
  }
  if (unit === 'bpm' || unit === 'W') {
    return String(Math.round(value))
  }
  return String(Math.round(value))
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatDistanceMeters(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return km >= 10
      ? `${Math.round(km)} km`
      : `${(Math.round(km * 10) / 10).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

function niceGuideValues(min: number, max: number): number[] {
  const span = max - min || 1
  const mid = min + span / 2
  const step =
    span >= 200 ? 50 : span >= 100 ? 25 : span >= 40 ? 10 : span >= 15 ? 5 : 1
  const lo = Math.ceil(min / step) * step
  const hi = Math.floor(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step * 0.001; v += step) {
    ticks.push(Math.round(v * 1000) / 1000)
  }
  // Prefer 2–3 readable ticks; fall back to ends + mid.
  if (ticks.length >= 2 && ticks.length <= 4) return ticks
  if (ticks.length > 4) {
    return [ticks[0]!, ticks[Math.floor(ticks.length / 2)]!, ticks[ticks.length - 1]!]
  }
  return [min, mid, max].map((v) =>
    span >= 20 ? Math.round(v) : Math.round(v * 10) / 10,
  )
}

/**
 * Keep a meaningful Y span so tiny HR/power wiggles don’t explode to full height.
 */
function logicalYDomain(
  min: number,
  max: number,
  unit: string,
): { yMin: number; yMax: number } {
  const dataSpan = Math.max(max - min, 1e-6)
  const pad = dataSpan * 0.12
  let yMin = min - pad
  let yMax = max + pad

  let minSpan: number
  if (unit === 'bpm') minSpan = 50
  else if (unit === 'W') minSpan = Math.max(120, max * 0.35)
  else if (unit === 'm') minSpan = 60
  else minSpan = dataSpan

  if (yMax - yMin < minSpan) {
    const mid = (min + max) / 2
    yMin = mid - minSpan / 2
    yMax = mid + minSpan / 2
  }

  if (unit === 'bpm' || unit === 'W') {
    yMin = Math.max(0, yMin)
  }

  return { yMin, yMax }
}

/** Drop guide labels that would collide vertically (~font size + gap). */
function spacedGuides(
  candidates: number[],
  yFor: (v: number) => number,
  minGapPx: number,
  yTopLimit: number,
  yBottomLimit: number,
): number[] {
  const sorted = [...candidates]
    .filter((v) => {
      const y = yFor(v)
      return y >= yTopLimit && y <= yBottomLimit
    })
    .sort((a, b) => b - a)

  const kept: number[] = []
  for (const v of sorted) {
    const y = yFor(v)
    if (kept.every((k) => Math.abs(yFor(k) - y) >= minGapPx)) {
      kept.push(v)
    }
  }
  return kept.sort((a, b) => a - b)
}

type ScrubPoint = {
  index: number
  x: number
  y: number
  value: number
  elapsed: number
  distanceMeters: number | null
}

/** Compact line chart for Strava streams in the activity feed. */
export function ActivityStreamChart({
  values,
  time,
  distanceMeters = null,
  label,
  unit,
  color,
  compact = false,
  frameHeightPx = null,
  strokeWidth = 1.25,
  className,
}: ActivityStreamChartProps) {
  const matchMap = frameHeightPx != null && frameHeightPx > 0
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ w: 320, h: matchMap ? frameHeightPx : compact ? 96 : 168 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setBox({ w: rect.width, h: rect.height })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameHeightPx, compact])

  const width = Math.max(160, box.w)
  const drawHeight = Math.max(80, box.h)

  const padLeft = 36
  const padRight = 8
  const padTop = compact && !matchMap ? 16 : 22
  const padBottom = compact && !matchMap ? 14 : 18
  const innerW = width - padLeft - padRight
  const innerH = drawHeight - padTop - padBottom
  // Logical band: values sit in a quieter mid band — not full frame stretch.
  const bandH = Math.max(28, innerH * (matchMap ? 0.52 : 0.68))
  const bandTop = padTop + (innerH - bandH) / 2

  const min = Math.min(...values)
  const max = Math.max(...values)
  const { yMin, yMax } = logicalYDomain(min, max, unit)
  const ySpan = yMax - yMin || 1

  const t0 = time[0] ?? 0
  const t1 = time[time.length - 1] ?? 1
  const tSpan = t1 - t0 || 1

  const yFor = (v: number) => bandTop + (1 - (v - yMin) / ySpan) * bandH

  const points = values.map((v, i) => {
    const x = padLeft + (((time[i] ?? i) - t0) / tSpan) * innerW
    return { x, y: yFor(v) }
  })

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // ~9px font + breathing room so labels never stack.
  const labelGap = 15
  const guideCandidates = niceGuideValues(yMin, yMax)
  const guides = spacedGuides(
    guideCandidates,
    yFor,
    labelGap,
    padTop + 6,
    drawHeight - padBottom - 4,
  )

  const svgRef = useRef<SVGSVGElement | null>(null)
  const [scrub, setScrub] = useState<ScrubPoint | null>(null)

  const resolveScrub = useCallback(
    (clientX: number) => {
      const svg = svgRef.current
      if (!svg || points.length === 0) return
      const rect = svg.getBoundingClientRect()
      if (rect.width <= 0) return
      const xSvg = ((clientX - rect.left) / rect.width) * width
      const clamped = Math.min(width - padRight, Math.max(padLeft, xSvg))
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < points.length; i++) {
        const d = Math.abs(points[i]!.x - clamped)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      const p = points[best]!
      setScrub({
        index: best,
        x: p.x,
        y: p.y,
        value: values[best]!,
        elapsed: time[best] ?? best,
        distanceMeters:
          distanceMeters && distanceMeters.length === values.length
            ? distanceMeters[best]!
            : null,
      })
    },
    [distanceMeters, points, time, values, width, padLeft, padRight],
  )

  const clearScrub = useCallback(() => setScrub(null), [])

  const tooltipLeftPct = scrub
    ? Math.min(88, Math.max(12, (scrub.x / width) * 100))
    : 50

  return (
    <div
      ref={containerRef}
      className={cn('relative min-w-0 overflow-hidden', className)}
      style={
        matchMap
          ? { height: frameHeightPx }
          : compact
            ? { minHeight: 88 }
            : { aspectRatio: '2 / 1', minHeight: 144 }
      }
    >
      {scrub ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-[4px] border border-[var(--tt-line,#ebebeb)] bg-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--tt-ink,#111)] shadow-sm"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <span style={{ color }}>
            {formatAxisValue(scrub.value, unit)}
            {unit}
          </span>
          <span className="text-[var(--tt-ink-soft,#6b6b6b)]">
            {' '}
            · {formatElapsed(scrub.elapsed)}
          </span>
          {scrub.distanceMeters != null ? (
            <span className="text-[var(--tt-ink-soft,#6b6b6b)]">
              {' '}
              · {formatDistanceMeters(scrub.distanceMeters)}
            </span>
          ) : null}
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${drawHeight}`}
        preserveAspectRatio="none"
        className="block h-full w-full touch-none"
        role="img"
        aria-label={`${label} chart`}
        onPointerMove={(e) => resolveScrub(e.clientX)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          resolveScrub(e.clientX)
        }}
        onPointerLeave={clearScrub}
        onPointerUp={clearScrub}
        onPointerCancel={clearScrub}
      >
        <text
          x={padLeft}
          y={14}
          className="fill-[var(--tt-ink-soft,#6b6b6b)]"
          style={{ fontSize: 10, fontWeight: 500 }}
        >
          {label}
        </text>

        {guides.map((value) => {
          const y = yFor(value)
          return (
            <g key={`g-${value}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="var(--tt-line,#ebebeb)"
                strokeWidth={1}
              />
              <text
                x={padLeft - 5}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--tt-ink-soft,#6b6b6b)]"
                style={{ fontSize: 10 }}
              >
                {formatAxisValue(value, unit)}
              </text>
            </g>
          )
        })}

        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {scrub ? (
          <g>
            <line
              x1={scrub.x}
              y1={bandTop}
              x2={scrub.x}
              y2={bandTop + bandH}
              stroke="var(--tt-ink-faint,#9a9a9a)"
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={scrub.x}
              cy={scrub.y}
              r={3}
              fill="white"
              stroke={color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : null}

        <rect
          x={padLeft}
          y={padTop}
          width={innerW}
          height={innerH}
          fill="transparent"
        />

        <text
          x={padLeft}
          y={drawHeight - 5}
          className="fill-[var(--tt-ink-faint,#9a9a9a)]"
          style={{ fontSize: 9 }}
        >
          {formatElapsed(t0)}
        </text>
        <text
          x={width - padRight}
          y={drawHeight - 5}
          textAnchor="end"
          className="fill-[var(--tt-ink-faint,#9a9a9a)]"
          style={{ fontSize: 9 }}
        >
          {formatElapsed(t1)}
        </text>
      </svg>
    </div>
  )
}
