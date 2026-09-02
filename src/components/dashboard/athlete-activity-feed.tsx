'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { buildAthleteHomeActivityRows } from '@/lib/athlete-home-activity'
import { groupActivityRowsByDay, type CoachHomeWorkoutActivityRow } from '@/lib/coach-home'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  ActivityDayHeading,
  ActivityFeedWorkoutCard,
} from '@/components/activity/activity-feed-workout-card'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'completed' | 'skipped'

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' },
]

type AthleteActivityFeedProps = {
  workouts: PlanWorkoutDetail[]
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'border-[var(--tt-line-strong,#ddd)] bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink)]'
          : 'border-transparent text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
      )}
    >
      {label}
    </button>
  )
}

export function AthleteActivityFeed({ workouts }: AthleteActivityFeedProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const rows = useMemo(() => buildAthleteHomeActivityRows(workouts), [workouts])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === 'completed' && row.status !== 'completed') return false
      if (statusFilter === 'skipped' && row.status !== 'skipped') return false
      return true
    })
  }, [rows, statusFilter])

  const groups = useMemo(() => groupActivityRowsByDay(filtered), [filtered])

  useEffect(() => {
    setStatusFilter('all')
  }, [workouts])

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <header className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Activity feed
          </h2>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-faint)]">
            Recent workouts and session feedback
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((item) => (
              <FilterChip
                key={item.id}
                label={item.label}
                active={statusFilter === item.id}
                onClick={() => setStatusFilter(item.id)}
              />
            ))}
          </div>
          <Link
            href="/training"
            className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)]"
          >
            View plan →
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="border border-[var(--tt-line)] px-4 py-10 text-center text-[13px] text-[var(--tt-ink-faint)]">
          {rows.length === 0
            ? 'Log a workout to start your activity feed.'
            : 'No activity matches this filter.'}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <ActivityDayHeading dateKey={group.dateKey} />
              <ul className="divide-y divide-[var(--tt-line)] overflow-hidden border border-[var(--tt-line)] bg-white">
                {group.rows
                  .filter((row): row is CoachHomeWorkoutActivityRow => row.entryKind === 'workout')
                  .map((row) => (
                    <li key={row.id}>
                      <ActivityFeedWorkoutCard row={row} isCoach={false} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
