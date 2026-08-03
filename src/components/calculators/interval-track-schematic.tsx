'use client'

import { useMemo, useState } from 'react'
import {
  formatRaceTime,
  formatRaceTimeTenths,
  intervalTimeMinutes,
} from '@/lib/calculators/race-time'
import { cn } from '@/lib/utils'

type IntervalTrackSchematicProps = {
  paceMinPerKm: number | null
  className?: string
}

/**
 * Stadium geometry: bend centers at (±STRAIGHT_HALF, CY), running line radius RADIUS.
 *
 * Lap (clockwise, start before first bend):
 *   Start/400 — bottom-right junction (end of home straight)
 *   100 m     — top-right junction (after first bend)
 *   200 m     — top-left junction (end of back straight)
 *   300 m     — bottom-left junction (after second bend)
 */
const CX = 200
const CY = 118
const STRAIGHT_HALF = 92
const RADIUS = 50
const LANE_HALF = 11

type Point = { x: number; y: number }

/** Exact straight↔bend junctions on the running line. */
const JUNCTIONS = {
  start: { x: CX + STRAIGHT_HALF, y: CY + RADIUS },
  m100: { x: CX + STRAIGHT_HALF, y: CY - RADIUS },
  m200: { x: CX - STRAIGHT_HALF, y: CY - RADIUS },
  m300: { x: CX - STRAIGHT_HALF, y: CY + RADIUS },
} as const

const LAP_MARKS = [
  {
    id: 'm100',
    point: JUNCTIONS.m100,
    /** Label sits above the marker. */
    labelSide: 'above' as const,
  },
  {
    id: 'm200',
    point: JUNCTIONS.m200,
    labelSide: 'above' as const,
  },
  {
    id: 'm300',
    point: JUNCTIONS.m300,
    labelSide: 'below' as const,
  },
  {
    id: 'm400',
    point: JUNCTIONS.start,
    labelSide: 'below' as const,
  },
] as const

const MARK_ORDER = ['m400', 'm100', 'm200', 'm300'] as const
type MarkId = (typeof MARK_ORDER)[number]

function formatMarkTime(
  meters: number,
  paceMinPerKm: number | null,
): string {
  if (meters <= 0) return '0:00'
  if (paceMinPerKm == null) return '—'
  const minutes = intervalTimeMinutes(meters, paceMinPerKm)
  return formatRaceTimeTenths(minutes)
}

/** Closed stadium at given radius — same bend centers as the running line. */
function stadiumOutline(r: number) {
  return [
    `M ${CX - STRAIGHT_HALF} ${CY + r}`,
    `L ${CX + STRAIGHT_HALF} ${CY + r}`,
    `A ${r} ${r} 0 0 0 ${CX + STRAIGHT_HALF} ${CY - r}`,
    `L ${CX - STRAIGHT_HALF} ${CY - r}`,
    `A ${r} ${r} 0 0 0 ${CX - STRAIGHT_HALF} ${CY + r}`,
    'Z',
  ].join(' ')
}

/** Open centerline used for the orange stroke band. */
function stadiumCenterline(r: number) {
  return [
    `M ${CX - STRAIGHT_HALF} ${CY + r}`,
    `L ${CX + STRAIGHT_HALF} ${CY + r}`,
    `A ${r} ${r} 0 0 0 ${CX + STRAIGHT_HALF} ${CY - r}`,
    `L ${CX - STRAIGHT_HALF} ${CY - r}`,
    `A ${r} ${r} 0 0 0 ${CX - STRAIGHT_HALF} ${CY + r}`,
  ].join(' ')
}

export function IntervalTrackSchematic({
  paceMinPerKm,
  className,
}: IntervalTrackSchematicProps) {
  const [startMark, setStartMark] = useState<MarkId>('m400')
  const lapTime = useMemo(() => formatMarkTime(400, paceMinPerKm), [paceMinPerKm])

  const marks = useMemo(() => {
    const startIndex = MARK_ORDER.indexOf(startMark)

    return LAP_MARKS.map((mark) => {
      const idx = MARK_ORDER.indexOf(mark.id as MarkId)
      const distance = ((idx - startIndex + MARK_ORDER.length) % MARK_ORDER.length) * 100
      const isStart = distance === 0

      return {
        ...mark,
        x: mark.point.x,
        y: mark.point.y,
        isStart,
        distance,
        label: isStart
          ? mark.labelSide === 'above'
            ? 'Start / 400 m'
            : '400 m / Start'
          : `${distance} m`,
        time: isStart
          ? mark.labelSide === 'above'
            ? `0:00 / ${lapTime}`
            : `${lapTime} / 0:00`
          : formatMarkTime(distance, paceMinPerKm),
      }
    })
  }, [lapTime, paceMinPerKm, startMark])

  const startPoint =
    LAP_MARKS.find((mark) => mark.id === startMark)?.point ?? JUNCTIONS.start
  const innerR = RADIUS - LANE_HALF
  const laneWidth = LANE_HALF * 2

  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">400 m track</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Click any marker to set Start and rotate 100/200/300/400 split points
        </p>
      </div>

      <div className="card-elevated overflow-hidden px-1 py-3 sm:px-3 sm:py-4">
        <svg
          viewBox="0 0 400 240"
          className="mx-auto h-auto w-full max-w-xl"
          role="img"
          aria-label="Stadium track with 100, 200, 300 and 400 metre split times"
        >
          {/* Green infield — inner edge of the lane */}
          <path
            d={stadiumOutline(innerR)}
            className="fill-emerald-500/[0.12] dark:fill-emerald-400/10"
          />

          {/* Orange lane as a thick stroke on the same centerline (keeps edges concentric) */}
          <path
            d={stadiumCenterline(RADIUS)}
            className="fill-none stroke-[var(--color-sport-run)]/25"
            strokeWidth={laneWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
          />

          {/* Running line */}
          <path
            d={stadiumCenterline(RADIUS)}
            className="fill-none stroke-[var(--color-sport-run)]/80"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Finish line at selected start */}
          <line
            x1={startPoint.x}
            y1={startPoint.y - LANE_HALF - 1}
            x2={startPoint.x}
            y2={startPoint.y + LANE_HALF + 1}
            className="stroke-foreground/80"
            strokeWidth={2.5}
          />

          <text
            x={CX}
            y={CY + 5}
            textAnchor="middle"
            className="fill-muted-foreground/80 text-[10px]"
          >
            1 lap = 400 m
          </text>

          {/* Direction arrows (clockwise): bottom → right, top → left */}
          <path
            d={`M ${CX - 24} ${CY + RADIUS + 20} L ${CX - 4} ${CY + RADIUS + 20}`}
            className="stroke-muted-foreground/55"
            strokeWidth={1.5}
            markerEnd="url(#track-arrow)"
          />
          <path
            d={`M ${CX + 24} ${CY - RADIUS - 20} L ${CX + 4} ${CY - RADIUS - 20}`}
            className="stroke-muted-foreground/55"
            strokeWidth={1.5}
            markerEnd="url(#track-arrow)"
          />
          <defs>
            <marker
              id="track-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground/55" />
            </marker>
          </defs>

          {marks.map((mark) => {
            const above = mark.labelSide === 'above'
            // Add extra breathing room from the track outline.
            const distY = above ? mark.y - 36 : mark.y + 24
            const timeY = above ? mark.y - 22 : mark.y + 38

            return (
              <g key={mark.id}>
                <circle
                  cx={mark.x}
                  cy={mark.y}
                  r={mark.isStart ? 5.5 : 4.5}
                  className={cn(
                    mark.isStart
                      ? 'fill-[var(--color-sport-run)] stroke-background'
                      : 'fill-background stroke-[var(--color-sport-run)]',
                    'cursor-pointer',
                  )}
                  strokeWidth={2}
                  onClick={() => setStartMark(mark.id as MarkId)}
                />
                <text
                  x={mark.x}
                  y={distY}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-semibold"
                >
                  {mark.label}
                </text>
                <text
                  x={mark.x}
                  y={timeY}
                  textAnchor="middle"
                  className="fill-foreground text-[13px] font-bold tabular-nums"
                >
                  {mark.time}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
