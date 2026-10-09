'use client'

import { useEffect, useId, useState } from 'react'
import { WorkoutType } from '@prisma/client'
import { getWorkoutStravaLaps } from '@/app/actions/strava'
import {
  formatSplitDistance,
  formatSplitElapsed,
  formatSplitPaceOrSpeed,
  hasInstantPace,
  isLapsCacheRecord,
  lapsChartReady,
  parseLapsCache,
  splitRateLabel,
  type ActivityLapsCache,
  type ActivityOverlayProfile,
  type ActivitySplitRow,
} from '@/lib/strava/laps'
import { cn } from '@/lib/utils'

type ActivityLapsWidgetProps = {
  workoutId: string
  sport: WorkoutType
  initialCache?: unknown
  className?: string
}

type SeriesKey = 'splits' | 'laps'

function pickDefaultSeries(data: ActivityLapsCache): SeriesKey | null {
  if (data.hasLaps && data.laps.length >= 2) return 'laps'
  if (data.splitsMetric.length >= 2) return 'splits'
  if (data.laps.length >= 2) return 'laps'
  return null
}

const PACE_LINE_COLOR = '#4aa3d4'
const HR_LINE_COLOR = '#e53935'
const ELEV_FILL = '#9a8f85'

const SPORT_BAR_VAR: Record<WorkoutType, string> = {
  RUN: 'var(--color-sport-run)',
  BIKE: 'var(--color-sport-bike)',
  SWIM: 'var(--color-sport-swim)',
  STRENGTH: 'var(--color-sport-strength)',
  HYROX: 'var(--color-sport-hyrox)',
  TRIATHLON: 'var(--color-sport-tri)',
  RECOVERY: 'var(--color-sport-recovery)',
  REST: 'var(--color-sport-rest)',
}

function seriesTitle(series: SeriesKey, sport: WorkoutType) {
  if (series === 'laps') return 'Laps'
  if (sport === WorkoutType.SWIM) return 'Splits · 100 m'
  return 'Splits · 1 km'
}

export function ActivityLapsWidget({
  workoutId,
  sport,
  initialCache,
  className,
}: ActivityLapsWidgetProps) {
  const seeded = parseLapsCache(initialCache)
  const settled = isLapsCacheRecord(initialCache)
  const [data, setData] = useState<ActivityLapsCache | null>(
    lapsChartReady(seeded) ? seeded : null,
  )
  const [series, setSeries] = useState<SeriesKey>(
    () => (seeded && pickDefaultSeries(seeded)) || 'splits',
  )
  const [pending, setPending] = useState(() => !lapsChartReady(seeded) && !settled)
  const [showBars, setShowBars] = useState(true)
  const [showPace, setShowPace] = useState(false)
  const [showElev, setShowElev] = useState(true)
  const [showHr, setShowHr] = useState(false)

  useEffect(() => {
    if (lapsChartReady(seeded) || settled) return
    let cancelled = false
    setPending(true)
    void getWorkoutStravaLaps(workoutId)
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        const next = payload ? pickDefaultSeries(payload) : null
        if (next) setSeries(next)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId])

  const rows =
    series === 'laps' ? data?.laps ?? [] : data?.splitsMetric ?? []
  const hasSplits = (data?.splitsMetric.length ?? 0) >= 2
  const hasLaps = (data?.laps.length ?? 0) >= 2
  const showToggle = hasSplits && hasLaps
  const visible = rows.length >= 2
  const hasElev = (data?.profile?.elevationM?.length ?? 0) >= 2
  const hasHrLine = (data?.profile?.hrBpm?.length ?? 0) >= 2
  const hasPaceLine = hasInstantPace(data?.profile)
  if (pending) {
    return (
      <section
        className={cn('bg-white px-1 py-1', className)}
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-[22px] font-semibold leading-none tracking-tight text-[var(--tt-ink,#111)]">
          Splits
        </p>
        <p className="mt-3 text-[13px] text-[var(--tt-ink-soft)]">
          Loading splits…
        </p>
        <div className="mt-4 flex h-[13.75rem] items-end gap-1">
          {[42, 58, 70, 54, 76, 88, 64, 72, 60].map((h, i) => (
            <div
              key={i}
              className="min-w-0 flex-1 animate-pulse rounded-t-[10px] bg-[var(--tt-line,#ebebeb)]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </section>
    )
  }

  if (!visible) return null

  const sportColor = SPORT_BAR_VAR[sport]

  return (
    <section className={cn('bg-white px-1 py-1', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[22px] font-semibold leading-none tracking-tight text-[var(--tt-ink,#111)]">
          {seriesTitle(series, sport)}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <OverlayToggle
            label="Bars"
            active={showBars}
            color={sportColor}
            onClick={() => setShowBars((v) => !v)}
          />
          {hasPaceLine ? (
            <OverlayToggle
              label={sport === WorkoutType.BIKE ? 'Speed' : 'Pace'}
              active={showPace}
              color={PACE_LINE_COLOR}
              onClick={() => setShowPace((v) => !v)}
            />
          ) : null}
          {hasHrLine ? (
            <OverlayToggle
              label="HR"
              active={showHr}
              color={HR_LINE_COLOR}
              onClick={() => setShowHr((v) => !v)}
            />
          ) : null}
          {hasElev ? (
            <OverlayToggle
              label="Elev"
              active={showElev}
              color={ELEV_FILL}
              onClick={() => setShowElev((v) => !v)}
            />
          ) : null}
          {showToggle ? (
            <div className="ml-1 flex overflow-hidden rounded-full border border-black/[0.08] bg-white text-[12px] font-medium">
              <button
                type="button"
                onClick={() => setSeries('splits')}
                className={cn(
                  'px-2.5 py-1',
                  series === 'splits'
                    ? 'bg-[var(--tt-ink)] text-white'
                    : 'text-[var(--tt-ink-soft)] hover:bg-black/[0.03]',
                )}
              >
                km
              </button>
              <button
                type="button"
                onClick={() => setSeries('laps')}
                className={cn(
                  'px-2.5 py-1',
                  series === 'laps'
                    ? 'bg-[var(--tt-ink)] text-white'
                    : 'text-[var(--tt-ink-soft)] hover:bg-black/[0.03]',
                )}
              >
                Laps
              </button>
            </div>
          ) : null}
        </div>
      </div>

          <SplitBars
            rows={rows}
            sport={sport}
            profile={data?.profile ?? null}
            showBars={showBars}
            showPace={showPace && hasPaceLine}
            showElev={showElev && hasElev}
            showHr={showHr && hasHrLine}
          />
          <SplitTable rows={rows} sport={sport} />
    </section>
  )
}

function OverlayToggle({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
        active
          ? ''
          : 'border-black/[0.08] bg-white text-[var(--tt-ink-soft,#6b6b6b)] hover:bg-black/[0.03]',
      )}
      style={
        active
          ? {
              color,
              background: `color-mix(in srgb, ${color} 12%, white)`,
              borderColor: `color-mix(in srgb, ${color} 28%, white)`,
            }
          : undefined
      }
    >
      {label}
    </button>
  )
}

function overlayPath(
  values: number[],
  close: boolean,
  heightPct = 72,
  yBase = 94,
): string {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const last = values.length - 1
  const pts = values.map((v, i) => {
    const x = last <= 0 ? 0 : (i / last) * 100
    const y = yBase - ((v - min) / span) * heightPct
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  if (!close) return `M ${pts.join(' L ')}`
  return `M 0,100 L ${pts.join(' L ')} L 100,100 Z`
}

function roundedBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, Math.max(h, 0) / 2)
  if (h <= 0 || w <= 0) return ''
  return [
    `M ${x.toFixed(3)},${(y + h).toFixed(3)}`,
    `L ${x.toFixed(3)},${(y + rr).toFixed(3)}`,
    `Q ${x.toFixed(3)},${y.toFixed(3)} ${(x + rr).toFixed(3)},${y.toFixed(3)}`,
    `L ${(x + w - rr).toFixed(3)},${y.toFixed(3)}`,
    `Q ${(x + w).toFixed(3)},${y.toFixed(3)} ${(x + w).toFixed(3)},${(y + rr).toFixed(3)}`,
    `L ${(x + w).toFixed(3)},${(y + h).toFixed(3)}`,
    'Z',
  ].join(' ')
}

function SplitBars({
  rows,
  sport,
  profile,
  showBars,
  showPace,
  showElev,
  showHr,
}: {
  rows: ActivitySplitRow[]
  sport: WorkoutType
  profile: ActivityOverlayProfile | null
  showBars: boolean
  showPace: boolean
  showElev: boolean
  showHr: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const speeds = rows.map((row) => row.avgSpeedMps)
  const min = Math.min(...speeds)
  const max = Math.max(...speeds)
  const floor = Math.max(min * 0.72, 0)
  const span = Math.max(max - floor, 0.01)
  const sportColor = SPORT_BAR_VAR[sport]
  const barTop = `color-mix(in srgb, ${sportColor} 34%, white)`
  const barBot = `color-mix(in srgb, ${sportColor} 52%, white)`
  const elev = showElev ? profile?.elevationM : null
  const hr = showHr ? profile?.hrBpm : null
  const instant = showPace ? profile?.speedMps : null
  const showChart = showBars || Boolean(instant) || Boolean(elev) || Boolean(hr)
  if (!showChart) return null

  const n = rows.length
  const gap = n > 14 ? 0.7 : 1.35
  const barW = (100 - gap * (n - 1)) / n
  const radius = Math.min(1.8, barW * 0.22)
  const bars = rows.map((row, i) => {
    const h = Math.max(22, ((row.avgSpeedMps - floor) / span) * 78)
    const x = i * (barW + gap)
    const y = 100 - h
    return { ...row, h, x, y, path: roundedBarPath(x, y, barW, h, radius) }
  })
  const showValueLabels = showBars && n <= 16
  const elevPath = elev ? overlayPath(elev, true, 36, 100) : null
  const clipId = `laps-bars-${uid}`
  const gradId = `laps-grad-${uid}`

  return (
    <div className="mt-6">
      <div className="relative h-[13.75rem]">
        {showValueLabels
          ? bars.map((bar) => {
              const pace = formatSplitPaceOrSpeed(sport, bar.avgSpeedMps)
              return (
                <span
                  key={`val-${bar.index}-${bar.elapsedSec}`}
                  className="pointer-events-none absolute z-[2] -translate-x-1/2 text-[12px] font-semibold tabular-nums text-[var(--tt-ink,#111)]"
                  style={{
                    left: `${bar.x + barW / 2}%`,
                    bottom: `calc(${bar.h}% + 8px)`,
                  }}
                >
                  {pace.value}
                </span>
              )
            })
          : null}
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={barTop} />
              <stop offset="100%" stopColor={barBot} />
            </linearGradient>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              {bars.map((bar) => (
                <path key={`clip-${bar.index}`} d={bar.path} />
              ))}
            </clipPath>
          </defs>
          {showBars
            ? bars.map((bar) => (
                <path key={`bar-${bar.index}`} d={bar.path} fill={`url(#${gradId})`} />
              ))
            : null}
          {elevPath ? (
            <path
              d={elevPath}
              fill={ELEV_FILL}
              fillOpacity={showBars ? 0.78 : 0.5}
              clipPath={showBars ? `url(#${clipId})` : undefined}
            />
          ) : null}
          {hr && hr.length >= 2 ? (
            <path
              d={overlayPath(hr, false, 46, 92)}
              fill="none"
              stroke={HR_LINE_COLOR}
              strokeWidth="1.85"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {instant && instant.length >= 2 ? (
            <path
              d={overlayPath(instant, false, 48, 90)}
              fill="none"
              stroke={PACE_LINE_COLOR}
              strokeWidth="1.35"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
      <div className="mt-2 flex">
        {rows.map((row) => (
          <span
            key={`label-${row.index}-${row.elapsedSec}`}
            className="min-w-0 flex-1 truncate text-center text-[13px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]"
          >
            {row.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function SplitTable({
  rows,
  sport,
}: {
  rows: ActivitySplitRow[]
  sport: WorkoutType
}) {
  const rate = splitRateLabel(sport)
  const showHr = rows.some((row) => row.avgHr != null)
  const showWatts = sport === WorkoutType.BIKE && rows.some((row) => row.avgWatts != null)

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[18rem] border-collapse text-left text-[12px]">
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            <th className="pb-1.5 pr-2 font-semibold">#</th>
            <th className="pb-1.5 pr-2 font-semibold">Dist</th>
            <th className="pb-1.5 pr-2 font-semibold">Time</th>
            <th className="pb-1.5 pr-2 font-semibold">{rate}</th>
            {showHr ? <th className="pb-1.5 pr-2 font-semibold">HR</th> : null}
            {showWatts ? <th className="pb-1.5 font-semibold">W</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pace = formatSplitPaceOrSpeed(sport, row.avgSpeedMps)
            return (
              <tr
                key={`row-${row.index}-${row.elapsedSec}`}
                className="border-t border-[var(--tt-line)] tabular-nums text-[var(--tt-ink)]"
              >
                <td className="py-1.5 pr-2 text-[var(--tt-ink-soft)]">{row.label}</td>
                <td className="py-1.5 pr-2">{formatSplitDistance(row.distanceM, sport)}</td>
                <td className="py-1.5 pr-2">{formatSplitElapsed(row.elapsedSec)}</td>
                <td className="py-1.5 pr-2">
                  {pace.value}
                  <span className="ml-0.5 text-[10px] text-[var(--tt-ink-faint)]">
                    {pace.unit}
                  </span>
                </td>
                {showHr ? (
                  <td className="py-1.5 pr-2">
                    {row.avgHr != null ? Math.round(row.avgHr) : '—'}
                  </td>
                ) : null}
                {showWatts ? (
                  <td className="py-1.5">
                    {row.avgWatts != null ? Math.round(row.avgWatts) : '—'}
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
