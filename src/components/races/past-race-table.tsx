'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import type { SeasonRace } from '@/lib/season-races'
import { raceOutcomeSummary, raceTypeLabel } from '@/lib/season-races'
import { PriorityBadge } from '@/components/races/priority-badge'
import { ItemActions } from '@/components/ui/item-actions'
import { deleteRace } from '@/app/actions/workouts'
import { cn } from '@/lib/utils'
import { TABLE_HEADER_MUTED, TABLE_SHELL } from '@/lib/table-styles'

type PastRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function PastRaceTable({ races, className }: PastRaceTableProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-muted-foreground">
          Past races
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Completed season events
        </p>
      </div>

      <div className={cn(TABLE_SHELL, 'bg-muted/20')}>
        {races.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No past races yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className={TABLE_HEADER_MUTED}>
                  <th className="px-4 py-3 font-semibold">Race</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Result</th>
                  <th className="px-3 py-3 font-semibold">Notes</th>
                  <th className="px-3 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {races.map((race) => (
                  <tr
                    key={race.id}
                    className="group border-b border-border/30 last:border-0 transition hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/season/${race.id}/edit`}
                        className="flex min-w-0 items-start gap-3 opacity-80 transition group-hover:opacity-100"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {race.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {raceTypeLabel(race.type)}
                            {race.location ? ` · ${race.location}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {race.date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {raceOutcomeSummary(race)}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-3 text-muted-foreground">
                      {race.outcome && race.outcome !== 'DISMISSED'
                        ? race.resultNotes || '—'
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={race.priority} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ItemActions
                        editHref={`/season/${race.id}/edit`}
                        deleteAction={deleteRace}
                        deleteId={race.id}
                        deleteIdField="raceId"
                        deleteConfirmTitle="Remove race?"
                        deleteConfirmMessage={`“${race.name}” will be removed.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
