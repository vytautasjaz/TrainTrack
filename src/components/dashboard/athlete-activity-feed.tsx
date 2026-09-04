'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
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

/** Same-width mobile bubble used by feed items. */
const FEED_BUBBLE =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] shadow-[var(--tt-shadow)]'

type AthleteActivityFeedProps = {
  workouts: PlanWorkoutDetail[]
}

export function AthleteActivityFeed({ workouts }: AthleteActivityFeedProps) {
  const [mobileOpen, setMobileOpen] = useState(true)

  const rows = useMemo(() => buildAthleteHomeActivityRows(workouts), [workouts])
  const groups = useMemo(() => groupActivityRowsByDay(rows), [rows])

  return (
    <section className="min-w-0 space-y-3 md:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 md:px-0">
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

        <Link
          href="/training"
          className="hidden text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)] md:inline"
        >
          View plan →
        </Link>
      </div>

      <MobileAccordionBody expanded={mobileOpen} className="space-y-3 md:space-y-4">
        {rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-[13px] text-[var(--tt-ink-faint)] md:border md:border-[var(--tt-line)] md:px-4 md:py-10">
            Log a workout to start your activity feed.
          </p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {rows
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
