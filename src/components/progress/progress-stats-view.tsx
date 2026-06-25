'use client'

import { useMemo, useState } from 'react'
import { WorkoutType } from '@prisma/client'
import { Route, Timer, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricChip } from '@/components/ui/metric-chip'
import { ProgressRing } from '@/components/ui/progress-ring'
import { StatCard } from '@/components/ui/stat-card'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { ProgressSportBucket, ProgressStats } from '@/lib/progress-stats'
import { cn, formatDistance, formatDuration, percent } from '@/lib/utils'

type ProgressStatsViewProps = {
  stats: ProgressStats
  className?: string
}

type MetricMode = 'distance' | 'duration' | 'workouts'

const CHART_PLANNED = 'hsl(215 16% 65%)'
const CHART_COMPLETED = '#e84855'
const CHART_COMPLETION = '#22c55e'

const tooltipStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--color-foreground)',
}

function pickBucket(stats: ProgressStats, sport: WorkoutType | 'ALL'): ProgressSportBucket {
  if (sport === 'ALL') return stats.all
  return stats.bySport[sport] ?? stats.all
}

function metricValues(
  bucket: ProgressSportBucket['weekly'][number],
  mode: MetricMode,
): { planned: number; completed: number } {
  if (mode === 'workouts') {
    return { planned: bucket.planned, completed: bucket.completed }
  }
  if (mode === 'duration') {
    return { planned: bucket.plannedDuration, completed: bucket.completedDuration }
  }
  return { planned: bucket.plannedDistance, completed: bucket.completedDistance }
}

function formatMetric(value: number, mode: MetricMode) {
  if (mode === 'workouts') return String(value)
  if (mode === 'duration') return formatDuration(value)
  return formatDistance(value)
}

function yAxisFormatter(value: number, mode: MetricMode) {
  if (mode === 'workouts') return String(value)
  if (mode === 'duration') return `${value}m`
  return `${value}`
}

export function ProgressStatsView({ stats, className }: ProgressStatsViewProps) {
  const [sport, setSport] = useState<WorkoutType | 'ALL'>('ALL')
  const [metric, setMetric] = useState<MetricMode>('distance')

  const bucket = useMemo(() => pickBucket(stats, sport), [stats, sport])
  const month = bucket.month
  const monthPct = percent(month.completed, month.planned)

  const volumeChartData = useMemo(
    () =>
      bucket.weekly.map((week) => {
        const { planned, completed } = metricValues(week, metric)
        return {
          label: week.label,
          planned,
          completed,
          completion: week.completion,
        }
      }),
    [bucket.weekly, metric],
  )

  const sportOptions: { id: WorkoutType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All sports' },
    ...stats.sports.map((s) => ({ id: s, label: WORKOUT_TYPE_LABELS[s] })),
  ]

  const metricLabel =
    metric === 'distance' ? 'Distance (km)' : metric === 'duration' ? 'Duration (min)' : 'Workouts'

  return (
    <div className={cn('space-y-6', className)}>
      <div className="card-elevated flex flex-col items-center p-6">
        <p className="text-sm font-medium text-muted-foreground">This month</p>
        <div className="mt-4">
          <ProgressRing
            value={month.completedDistance}
            max={Math.max(month.plannedDistance, 1)}
            size={168}
            stroke={11}
            tone="light"
            label={
              <span className="text-3xl font-bold tabular-nums text-brand">
                {formatDistance(month.completedDistance)}
              </span>
            }
            sublabel={
              <span className="mt-1 text-[11px] font-medium text-muted-foreground">
                Goal {formatDistance(month.plannedDistance)}
              </span>
            }
          />
        </div>
        <div className="mt-5 flex w-full justify-around border-t border-border/50 pt-5">
          <MetricChip
            icon={Route}
            value={`${monthPct}%`}
            label="Completion"
          />
          <MetricChip
            icon={Timer}
            value={formatDuration(month.completedDuration)}
            label="Duration"
          />
          <MetricChip icon={TrendingUp} value={String(month.completed)} label="Workouts" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sportOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSport(option.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              sport === option.id
                ? option.id === 'ALL'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : WORKOUT_TYPE_COLORS[option.id as WorkoutType]
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Planned distance"
          value={formatDistance(month.plannedDistance)}
          hint="This month"
          icon={Route}
          layout="row"
          variant="flat"
        />
        <StatCard
          label="Completed distance"
          value={formatDistance(month.completedDistance)}
          hint="Logged this month"
          icon={Route}
          layout="row"
          variant="flat"
        />
        <StatCard
          label="Duration"
          value={formatDuration(month.completedDuration)}
          hint={`${formatDuration(month.plannedDuration)} planned`}
          icon={Timer}
          layout="row"
          variant="flat"
        />
        <StatCard
          label="Completion"
          value={`${monthPct}%`}
          hint={`${month.completed} done · ${month.skipped} skipped · ${month.planned} planned`}
          icon={TrendingUp}
          layout="row"
          variant="flat"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Planned vs completed</CardTitle>
                <p className="text-xs text-muted-foreground">Last 8 weeks · {metricLabel}</p>
              </div>
              <div className="flex rounded-xl bg-muted/50 p-1">
                {(
                  [
                    ['distance', 'Distance'],
                    ['duration', 'Duration'],
                    ['workouts', 'Workouts'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMetric(id)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                      metric === id
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => yAxisFormatter(Number(v), metric)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      formatMetric(Number(value), metric),
                      name === 'planned' ? 'Planned' : 'Completed',
                    ]}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                    formatter={(value) => (value === 'planned' ? 'Planned' : 'Completed')}
                  />
                  <Bar
                    dataKey="planned"
                    fill={CHART_PLANNED}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="completed"
                    fill={CHART_COMPLETED}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion rate</CardTitle>
            <p className="text-xs text-muted-foreground">Weekly % of planned workouts completed</p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, 'Completion']}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="completion"
                    stroke={CHART_COMPLETION}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COMPLETION, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
