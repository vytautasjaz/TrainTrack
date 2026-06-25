import { useState } from 'react'
import { ENDURANCE_SPORTS } from '../../types/workout'
import { WorkoutTypeIcon } from '../Icons/WorkoutTypeIcon'
import { useSwipe } from '../../hooks/useSwipe'
import {
  formatDistance,
  formatDuration,
  formatWeekRange,
  getWeekLabel,
} from '../../utils/date'
import type { WeekStats } from '../../utils/weekStats'
import { WORKOUT_COLOR_THEME } from '../../utils/workoutDisplay'

type WeeklySummaryProps = {
  stats: WeekStats
  weekStart: Date
  weekEnd: Date
  weekOffset: number
  loading: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}

function buildSportSummary(stats: WeekStats): string {
  const parts = ENDURANCE_SPORTS.filter(
    (sport) => stats.distanceBySport[sport.value] > 0,
  ).map((sport) => `${sport.label} ${formatDistance(stats.distanceBySport[sport.value])}`)

  return parts.length > 0 ? parts.join(' · ') : 'No distance logged'
}

function SportBreakdown({ stats }: { stats: WeekStats }) {
  const [open, setOpen] = useState(false)
  const activeSports = ENDURANCE_SPORTS.filter((sport) => stats.distanceBySport[sport.value] > 0)
  const maxSportDistance = Math.max(...activeSports.map((s) => stats.distanceBySport[s.value]), 1)
  const sportSummary = buildSportSummary(stats)

  if (activeSports.length === 0) return null

  return (
    <div className="mb-2 border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">Distance by sport</p>
          {!open && <p className="mt-0.5 truncate text-sm text-gray-600">{sportSummary}</p>}
        </div>
        <span className="pt-0.5 text-sm text-muted" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="space-y-2 pb-3">
          {activeSports.map((sport) => {
            const km = stats.distanceBySport[sport.value]
            const width = Math.max((km / maxSportDistance) * 100, 8)
            const color = WORKOUT_COLOR_THEME[sport.value].dot

            return (
              <div key={sport.value}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700">
                    <span className="text-brand">
                      <WorkoutTypeIcon type={sport.value} className="h-3.5 w-3.5" />
                    </span>
                    {sport.label}
                  </span>
                  <span className="font-semibold text-gray-900">{formatDistance(km)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${width}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function WeeklySummary({
  stats,
  weekStart,
  weekEnd,
  weekOffset,
  loading,
  onPrevWeek,
  onNextWeek,
}: WeeklySummaryProps) {
  const swipeHandlers = useSwipe(onNextWeek, onPrevWeek)

  return (
    <section {...swipeHandlers} className="touch-pan-y">
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-brand hover:opacity-70"
            aria-label="Previous week"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-medium text-gray-500">{getWeekLabel(weekOffset)}</p>
            <h2 className="text-lg font-semibold text-gray-900">{formatWeekRange(weekStart, weekEnd)}</h2>
          </div>
          <button
            type="button"
            onClick={onNextWeek}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-brand hover:opacity-70"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <p className="text-center text-xs text-muted">Swipe for other weeks</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading summary…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-gray-100 pb-5">
            <StatCard label="Total distance" value={formatDistance(stats.totalDistanceKm)} />
            <StatCard label="Total time" value={formatDuration(stats.totalDurationMin)} />
          </div>

          <SportBreakdown key={weekOffset} stats={stats} />

          <p className="mt-3 text-center text-xs text-muted">
            {stats.workoutCount} workout{stats.workoutCount === 1 ? '' : 's'} this week
          </p>
        </>
      )}
    </section>
  )
}
