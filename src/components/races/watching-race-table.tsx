'use client'

import Link from 'next/link'
import { Circle, ExternalLink } from 'lucide-react'
import { RaceIntent } from '@prisma/client'
import type { SeasonRace } from '@/lib/season-races'
import { raceDistanceLabel, raceTypeLabel, weeksUntil } from '@/lib/season-races'
import { ItemActions } from '@/components/ui/item-actions'
import { Button } from '@/components/ui/button'
import { deleteRace, setRaceIntent } from '@/app/actions/workouts'
import { daysUntil, cn } from '@/lib/utils'
import { TABLE_HEADER_MUTED, TABLE_SHELL } from '@/lib/table-styles'

type WatchingRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function WatchingRaceTable({ races, className }: WatchingRaceTableProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">Of interest</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Races you might join last-minute — not on your training plan
        </p>
      </div>

      <div className={cn(TABLE_SHELL, 'bg-muted/15')}>
        {races.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No watching races yet. Add one if something catches your eye.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className={TABLE_HEADER_MUTED}>
                  <th className="px-4 py-3 font-semibold">Race</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Distance</th>
                  <th className="px-3 py-3 text-right font-semibold">Days</th>
                  <th className="px-3 py-3 font-semibold">Link</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {races.map((race) => {
                  const days = daysUntil(race.date)
                  const weeks = weeksUntil(race.date)
                  const isPast = days < 0
                  return (
                    <tr
                      key={race.id}
                      className={cn(
                        'group border-b border-border/30 last:border-0 transition hover:bg-muted/40',
                        isPast && 'opacity-70',
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/season/${race.id}/edit`}
                          className="flex min-w-0 items-start gap-3"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/45 bg-card text-muted-foreground">
                            <Circle className="h-2.5 w-2.5" strokeWidth={2} />
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
                        {raceDistanceLabel(race.type, {
                          triathlonDistance: race.triathlonDistance,
                          customDistanceKm: race.customDistanceKm,
                          legs: race.legs,
                        })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isPast ? (
                          <span className="text-xs text-muted-foreground">Past</span>
                        ) : (
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
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {race.url ? (
                          <a
                            href={race.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[12rem] items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                            title={race.url}
                          >
                            <span className="truncate">{race.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isPast && (
                            <form action={setRaceIntent}>
                              <input type="hidden" name="raceId" value={race.id} />
                              <input type="hidden" name="intent" value={RaceIntent.PLANNED} />
                              <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Promote
                              </Button>
                            </form>
                          )}
                          <ItemActions
                            editHref={`/season/${race.id}/edit`}
                            deleteAction={deleteRace}
                            deleteId={race.id}
                            deleteIdField="raceId"
                            deleteConfirmTitle="Remove from watchlist?"
                            deleteConfirmMessage={`“${race.name}” will be removed.`}
                          />
                        </div>
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
