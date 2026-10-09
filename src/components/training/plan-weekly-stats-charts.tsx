'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { TrainingPlanEditorDetail } from '@/lib/training-plan'
import { buildPlanWeeklyChartSeries } from '@/lib/training-plan-weekly-charts'
import { useSessionLoadThresholds } from '@/components/plan/session-load-thresholds-context'
import { cn } from '@/lib/utils'

type PlanWeeklyStatsChartsProps = {
  plan: Pick<TrainingPlanEditorDetail, 'weekCount' | 'sessions' | 'sportFocus'>
  estimationPreferences?: AthletePreferences | null
  className?: string
}

type ChartCardProps = {
  title: string
  subtitle: string
  dataKey: 'mileageKm' | 'tss' | 'longestRunKm'
  unit: string
  color: string
  data: ReturnType<typeof buildPlanWeeklyChartSeries>
  formatValue: (n: number) => string
}

function ChartCard({
  title,
  subtitle,
  dataKey,
  unit,
  color,
  data,
  formatValue,
}: ChartCardProps) {
  const peak = Math.max(...data.map((d) => d[dataKey]), 0)
  if (peak <= 0) {
    return (
      <div className="rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-3 shadow-[var(--tt-shadow)]">
        <p className="text-[11px] font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          No data yet
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] p-3 shadow-[var(--tt-shadow)]">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          peak{' '}
          <span className="font-semibold text-foreground">
            {formatValue(peak)}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="color-mix(in oklab, var(--foreground) 10%, transparent)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) =>
                Number.isInteger(v) ? String(v) : v.toFixed(0)
              }
            />
            <Tooltip
              cursor={{ fill: 'color-mix(in oklab, var(--foreground) 4%, transparent)' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--tt-line, #ebebeb)',
                fontSize: 11,
                boxShadow: 'var(--tt-shadow)',
              }}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value)
                return [
                  `${formatValue(Number.isFinite(n) ? n : 0)}${unit ? ` ${unit}` : ''}`,
                  title,
                ]
              }}
              labelFormatter={(label) => `Week ${String(label).replace(/^W/, '')}`}
            />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PlanWeeklyStatsCharts({
  plan,
  estimationPreferences = null,
  className,
}: PlanWeeklyStatsChartsProps) {
  const thresholds = useSessionLoadThresholds()
  const series = useMemo(
    () =>
      buildPlanWeeklyChartSeries({
        plan,
        preferences: estimationPreferences,
        thresholds,
      }),
    [plan, estimationPreferences, thresholds],
  )

  const hasAny =
    series.some((w) => w.mileageKm > 0) ||
    series.some((w) => w.tss > 0) ||
    series.some((w) => w.longestRunKm > 0)

  if (!hasAny || plan.weekCount <= 0) return null

  return (
    <section className={cn('mt-6 space-y-3', className)}>
      <div>
        <h2 className="text-[13px] font-semibold text-foreground">
          Plan statistics
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Weekly mileage, training stress, and longest run across the plan.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ChartCard
          title="Weekly mileage"
          subtitle="Run · bike · hyrox distance"
          dataKey="mileageKm"
          unit="km"
          color="var(--color-sport-run, #1d6b4f)"
          data={series}
          formatValue={(n) => (n >= 10 ? String(Math.round(n)) : n.toFixed(1))}
        />
        <ChartCard
          title="Weekly TSS"
          subtitle="Planned training stress"
          dataKey="tss"
          unit=""
          color="var(--tt-ink-soft, #6b6b6b)"
          data={series}
          formatValue={(n) => String(Math.round(n))}
        />
        <ChartCard
          title="Longest run"
          subtitle="Longest run session each week"
          dataKey="longestRunKm"
          unit="km"
          color="var(--color-sport-run, #1d6b4f)"
          data={series}
          formatValue={(n) => (n >= 10 ? String(Math.round(n)) : n.toFixed(1))}
        />
      </div>
    </section>
  )
}
