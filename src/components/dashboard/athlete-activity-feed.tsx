'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ListFilter } from 'lucide-react'
import { buildAthleteHomeActivityRows } from '@/lib/athlete-home-activity'
import {
  groupActivityRowsByDay,
  type CoachHomeWorkoutActivityRow,
} from '@/lib/coach-home'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  ActivityDayHeading,
  ActivityFeedWorkoutCard,
} from '@/components/activity/activity-feed-workout-card'
import { MobileAccordionBody } from '@/components/ui/mobile-accordion-body'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'completed' | 'skipped'

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' },
]

/** Same-width mobile bubble used by section header and feed items. */
const FEED_BUBBLE =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] shadow-[var(--tt-shadow)]'

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
  const [mobileOpen, setMobileOpen] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const rows = useMemo(() => buildAthleteHomeActivityRows(workouts), [workouts])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === 'completed' && row.status !== 'completed') return false
      if (statusFilter === 'skipped' && row.status !== 'skipped') return false
      return true
    })
  }, [rows, statusFilter])

  const groups = useMemo(() => groupActivityRowsByDay(filtered), [filtered])
  const filtersActive = statusFilter !== 'all'

  useEffect(() => {
    setStatusFilter('all')
  }, [workouts])

  const filterChips = (
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
  )

  return (
    <section className="min-w-0 space-y-3 md:space-y-4">
      {/* Title + accordion only — its own bubble on mobile */}
      <div
        className={cn(
          FEED_BUBBLE,
          'px-4 py-3.5 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <header className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              className="flex w-full items-center justify-between gap-2 text-left md:pointer-events-none"
            >
              <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
                Activity feed
              </h2>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
                  mobileOpen && 'rotate-180',
                )}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
            <p className="mt-1 hidden text-[13px] text-[var(--tt-ink-faint)] md:block">
              Recent workouts and session feedback
            </p>
          </header>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
            aria-label="Activity filters"
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] transition md:hidden',
              'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
              (mobileFiltersOpen || filtersActive) &&
                'border-[var(--tt-ink)]/30 text-[var(--tt-ink)]',
            )}
          >
            <ListFilter className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {filterChips}
            <Link
              href="/training"
              className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)]"
            >
              View plan →
            </Link>
          </div>
        </div>

        {mobileFiltersOpen ? (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-[var(--tt-line)] pt-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                Filters
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="text-[10px] font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                >
                  Reset
                </button>
              ) : null}
            </div>
            {filterChips}
          </div>
        ) : null}
      </div>

      <MobileAccordionBody expanded={mobileOpen} className="space-y-3 md:space-y-4">
        {filtered.length === 0 ? (
          <p className="px-1 py-8 text-center text-[13px] text-[var(--tt-ink-faint)] md:border md:border-[var(--tt-line)] md:px-4 md:py-10">
            {rows.length === 0
              ? 'Log a workout to start your activity feed.'
              : 'No activity matches this filter.'}
          </p>
        ) : (
          <>
            {/* Mobile — feed items as same-width bubbles under the header */}
            <ul className="space-y-3 md:hidden">
              {filtered
                .filter(
                  (row): row is CoachHomeWorkoutActivityRow =>
                    row.entryKind === 'workout',
                )
                .map((row) => (
                  <li key={row.id} className={FEED_BUBBLE}>
                    <ActivityFeedWorkoutCard row={row} isCoach={false} showDate />
                  </li>
                ))}
            </ul>

            {/* Desktop — grouped by day */}
            <div className="hidden space-y-5 md:block">
              {groups.map((group) => (
                <div key={group.dateKey} className="space-y-2">
                  <ActivityDayHeading dateKey={group.dateKey} />
                  <ul className="divide-y divide-[var(--tt-line)] overflow-hidden border border-[var(--tt-line)] bg-white">
                    {group.rows
                      .filter(
                        (row): row is CoachHomeWorkoutActivityRow =>
                          row.entryKind === 'workout',
                      )
                      .map((row) => (
                        <li key={row.id}>
                          <ActivityFeedWorkoutCard row={row} isCoach={false} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </MobileAccordionBody>
    </section>
  )
}
