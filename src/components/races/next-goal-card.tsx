'use client'

import Link from 'next/link'
import { Flag } from 'lucide-react'
import type { SeasonRace } from '@/lib/season-races'
import { raceDistanceLabel, weeksUntil } from '@/lib/season-races'
import { PriorityBadge } from '@/components/races/priority-badge'
import { daysUntil, cn } from '@/lib/utils'

type NextGoalCardProps = {
  race: SeasonRace | null
  className?: string
}

export function NextGoalCard({ race, className }: NextGoalCardProps) {
  if (!race) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[12rem] flex-col justify-between rounded-[6px] border border-dashed border-border bg-muted/30 p-5',
          className,
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Next goal
          </p>
          <p className="mt-3 text-sm text-muted-foreground">No upcoming races yet.</p>
        </div>
        <Link
          href="/races"
          className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Add a race to start your season
        </Link>
      </div>
    )
  }

  const days = daysUntil(race.date)
  const weeks = weeksUntil(race.date)

  return (
    <div
      className={cn(
        'flex h-full min-h-[12rem] flex-col rounded-[6px] border border-border bg-card p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Next goal
        </p>
        <PriorityBadge priority={race.priority} compact />
      </div>

      <div className="mt-3 flex items-start gap-2">
        <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{race.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {race.date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
            {' · '}
            {raceDistanceLabel(race.type)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {days}
          <span className="ml-1.5 text-sm font-medium text-muted-foreground">days</span>
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {weeks} {weeks === 1 ? 'week' : 'weeks'}
        </p>
      </div>

      {race.goal ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Goal: <span className="font-medium text-foreground">{race.goal}</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No goal set</p>
      )}

      <Link
        href={`/races/${race.id}/edit`}
        className="mt-auto inline-flex w-fit items-center rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/60"
      >
        View race
      </Link>
    </div>
  )
}
