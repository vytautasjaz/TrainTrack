'use client'

import { useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { PhysiologyMetricCardVm } from '@/lib/coach-engine/physiology/dashboard'
import { describeProfileShape } from '@/lib/coach-engine/physiology/interpret'
import { cn } from '@/lib/utils'

/** Axes for the profile spider — all 0–100 (overreach shown inverted as Freshness). */
const RADAR_AXES: {
  id: string
  label: string
  /** Invert so higher on the chart is always “better”. */
  invert?: boolean
}[] = [
  { id: 'aerobicStrength', label: 'Aerobic' },
  { id: 'aerobicEfficiency', label: 'Efficiency' },
  { id: 'thresholdStrength', label: 'Threshold' },
  { id: 'thresholdDurability', label: 'Repeat' },
  { id: 'vo2Response', label: 'VO₂' },
  { id: 'fatigueResistance', label: 'Durability' },
  { id: 'overreachRisk', label: 'Freshness', invert: true },
  { id: 'recoverySpeed', label: 'Recovery' },
  { id: 'marathonReadiness', label: 'Marathon' },
]

type RadarPoint = {
  id: string
  axis: string
  score: number
  display: number
}

function buildRadarData(cards: PhysiologyMetricCardVm[]): RadarPoint[] {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const points: RadarPoint[] = []
  for (const axis of RADAR_AXES) {
    const card = byId.get(axis.id)
    if (!card) continue
    const raw = Math.min(100, Math.max(0, Math.round(card.value)))
    const score = axis.invert ? 100 - raw : raw
    points.push({
      id: axis.id,
      axis: axis.label,
      score,
      display: raw,
    })
  }
  return points
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: RadarPoint }>
}) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  const invert = RADAR_AXES.find((a) => a.id === point.id)?.invert
  return (
    <div className="rounded-[8px] border border-[var(--tt-line)] bg-white px-2.5 py-1.5 shadow-sm">
      <p className="text-[11px] font-semibold text-[var(--tt-ink)]">
        {point.axis}
      </p>
      <p className="mt-0.5 text-[12px] tabular-nums text-[var(--tt-ink-soft)]">
        {invert
          ? `Risk ${point.display} · Freshness ${point.score} / 100`
          : `${point.score} / 100`}
      </p>
    </div>
  )
}

type FitnessProfileRadarProps = {
  cards: PhysiologyMetricCardVm[]
  fingerprint?: {
    volumeResponder: number
    thresholdResponder: number
    vo2Responder: number
    longRunResponder: number
    frequencyResponder: number
  } | null
  onSelectMetric?: (metricId: string) => void
  className?: string
  /**
   * `panel` — bottom strip cell beside Insights / How to read.
   * `card` — standalone section (default).
   */
  variant?: 'card' | 'panel'
}

/**
 * Spider / radar overview of 0–100 fitness profile scores.
 * Outer ring = 100 (model ceiling for that area — not elite ranking).
 */
export function FitnessProfileRadar({
  cards,
  fingerprint,
  onSelectMetric,
  className,
  variant = 'card',
}: FitnessProfileRadarProps) {
  const data = useMemo(() => buildRadarData(cards), [cards])
  const shape = useMemo(
    () => describeProfileShape(cards, fingerprint),
    [cards, fingerprint],
  )
  const embedded = variant === 'panel'

  if (data.length < 3) return null

  const chart = (
    <div
      className={cn(
        'mx-auto w-full',
        embedded
          ? 'h-[min(18rem,62vw)] min-h-[15rem] flex-1 sm:h-[20rem]'
          : 'mt-2 h-[min(22rem,70vw)] max-w-lg sm:h-[24rem]',
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={data}
          cx="50%"
          cy="52%"
          outerRadius={embedded ? '82%' : '78%'}
          margin={
            embedded
              ? { top: 6, right: 10, bottom: 6, left: 10 }
              : { top: 12, right: 16, bottom: 12, left: 16 }
          }
        >
          <PolarGrid stroke="var(--tt-line, #E3E6E9)" gridType="polygon" />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={(props) => (
              <AngleTick
                x={Number(props.x)}
                y={Number(props.y)}
                payload={props.payload as { value?: string } | undefined}
                points={data}
                onSelectMetric={onSelectMetric}
                compact={embedded}
              />
            )}
          />
          <Tooltip content={<RadarTooltip />} />
          <Radar
            name="Fitness"
            dataKey="score"
            stroke="var(--tt-v2-accent, #F0440A)"
            fill="var(--tt-v2-accent, #F0440A)"
            fillOpacity={0.22}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )

  const header = (
    <div className={cn('shrink-0', embedded ? 'px-2' : undefined)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
          Profile shape
        </p>
        <p className="text-[10px] text-[var(--tt-ink-faint)]">Outer = 100</p>
      </div>
      {shape ? (
        <>
          <p className="mt-1 text-[14px] font-bold leading-snug text-[var(--tt-ink)]">
            {shape.typeLabel}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--tt-ink-soft)]">
            {shape.summary}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[11px] leading-snug text-[var(--tt-ink-faint)]">
          Outer ring = 100 on this coaching model. Tap a label for detail.
        </p>
      )}
    </div>
  )

  if (embedded) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-col rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white px-2 pb-2 pt-3.5 sm:px-3',
          className,
        )}
      >
        {header}
        {chart}
      </div>
    )
  }

  return (
    <section
      className={cn(
        'rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5',
        className,
      )}
    >
      {header}
      {chart}
    </section>
  )
}

function AngleTick({
  x,
  y,
  payload,
  points,
  onSelectMetric,
  compact,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
  points: RadarPoint[]
  onSelectMetric?: (metricId: string) => void
  compact?: boolean
}) {
  if (
    x == null ||
    y == null ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !payload?.value
  ) {
    return null
  }
  const point = points.find((p) => p.axis === payload.value)
  const label = payload.value
  const textClass = cn(
    'font-semibold',
    compact ? 'text-[9px]' : 'text-[10px]',
    onSelectMetric && point
      ? 'fill-[var(--tt-ink,#111)] hover:fill-[var(--tt-v2-accent,#F0440A)]'
      : 'fill-[var(--tt-ink-soft,#6b7280)]',
  )

  if (!onSelectMetric || !point) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className={textClass}
      >
        {label}
      </text>
    )
  }

  return (
    <g
      transform={`translate(${x},${y})`}
      className="cursor-pointer"
      onClick={() => onSelectMetric(point.id)}
    >
      <title>{`${label}: ${point.score} / 100 — open detail`}</title>
      <text textAnchor="middle" dominantBaseline="central" className={textClass}>
        {label}
      </text>
    </g>
  )
}
