'use client'

import Link from 'next/link'
import { Circle, Star } from 'lucide-react'
import type { SeasonRace } from '@/lib/season-races'
import { raceDistanceLabel, raceTypeLabel, weeksUntil } from '@/lib/season-races'
import { PriorityBadge, priorityMarkerSurfaceClass } from '@/components/races/priority-badge'
import { ItemActions } from '@/components/ui/item-actions'
import { deleteRace } from '@/app/actions/workouts'
import { daysUntil, cn } from '@/lib/utils'
import { TABLE_HEADER_MUTED, TABLE_SHELL } from '@/lib/table-styles'

type UpcomingRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function UpcomingRaceTable({ races, className }: UpcomingRaceTableProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Upcoming races</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scheduled events for the rest of the season
          </p>
        </div>
      </div>

      <div className={TABLE_SHELL}>
        {races.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No upcoming races. Add one to plan your season.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className={TABLE_HEADER_MUTED}>
                  <th className="px-4 py-3 font-semibold">Race</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Distance</th>
                  <th className="px-3 py-3 font-semibold">Priority</th>
                  <th className="px-3 py-3 font-semibold">Goal</th>
                  <th className="px-3 py-3 text-right font-semibold">Days</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {races.map((race) => {
                  const days = daysUntil(race.date)
                  const weeks = weeksUntil(race.date)
                  return (
                    <tr
                      key={race.id}
                      className="group border-b border-border/40 last:border-0 transition hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/season/${race.id}/edit`}
                          className="flex min-w-0 items-start gap-3"
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                              priorityMarkerSurfaceClass(race.priority),
                            )}
                          >
                            {race.priority === 'A' ? (
                              <Star className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <Circle className="h-2.5 w-2.5 fill-current" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">
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
                        {raceDistanceLabel(race.type, {
                          triathlonDistance: race.triathlonDistance,
                          customDistanceKm: race.customDistanceKm,
                          legs: race.legs,
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={race.priority} />
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 text-muted-foreground">
                        {race.goal || '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end leading-tight">
                          <span>
                            <span className="text-base font-bold tabular-nums text-foreground">
                              {days}
                            </span>
                            <span className="ml-1 text-[10px] text-muted-foreground">days</span>
                          </span>
                          <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                            {weeks} {weeks === 1 ? 'week' : 'weeks'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ItemActions
                          editHref={`/season/${race.id}/edit`}
                          deleteAction={deleteRace}
                          deleteId={race.id}
                          deleteIdField="raceId"
                          deleteConfirmTitle="Remove race?"
                          deleteConfirmMessage={`“${race.name}” will be removed from the calendar.`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
