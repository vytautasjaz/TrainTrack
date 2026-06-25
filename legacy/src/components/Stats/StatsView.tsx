import { WORKOUT_TYPES } from '../../types/workout'
import { WorkoutTypeIcon } from '../Icons/WorkoutTypeIcon'
import { formatDistance, formatDuration } from '../../utils/date'
import type { ActivityStats } from '../../utils/weekStats'
import type { WorkoutType } from '../../types/workout'
import { WORKOUT_COLOR_THEME } from '../../utils/workoutDisplay'

type StatsViewProps = {
  stats: ActivityStats
  typeCounts: Record<WorkoutType, number>
  monthLabel: string
  loading: boolean
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}

export function StatsView({ stats, typeCounts, monthLabel, loading }: StatsViewProps) {
  const maxTypeCount = Math.max(...WORKOUT_TYPES.map((t) => typeCounts[t.value]), 1)

  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-500">This month</p>
        <h2 className="text-lg font-semibold capitalize text-gray-900">{monthLabel}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading stats…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-gray-100 pb-5">
            <StatCard label="Workouts" value={String(stats.workoutCount)} />
            <StatCard label="Distance" value={formatDistance(stats.totalDistanceKm)} />
            <StatCard label="Total time" value={formatDuration(stats.totalDurationMin)} />
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium text-gray-500">Workouts by type</h3>
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {WORKOUT_TYPES.map((type) => {
                const count = typeCounts[type.value]
                const width = count > 0 ? Math.max((count / maxTypeCount) * 100, 8) : 0
                const color = WORKOUT_COLOR_THEME[type.value].dot

                return (
                  <div key={type.value}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-gray-700">
                        <span className="text-brand">
                          <WorkoutTypeIcon type={type.value} className="h-4 w-4" />
                        </span>
                        {type.label}
                      </span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      {width > 0 && (
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${width}%`, backgroundColor: color }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}

              {stats.workoutCount === 0 && (
                <p className="text-sm text-muted">No workouts logged this month yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
