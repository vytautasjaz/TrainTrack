'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { RaceIntent } from '@prisma/client'
import type { SeasonRace } from '@/lib/season-races'
import { raceDistanceLabel, raceTypeLabel, weeksUntil } from '@/lib/season-races'
import { ItemActions } from '@/components/ui/item-actions'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { TablePosterHeading } from '@/components/ui/table-poster-heading'
import { deleteRace, setRaceIntent } from '@/app/actions/workouts'
import { daysUntil, cn } from '@/lib/utils'
import {
  DATA_CELL_META,
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_EMPTY,
  DATA_MOBILE_CARD,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

type WatchingRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function WatchingRaceTable({ races, className }: WatchingRaceTableProps) {
  return (
    <section className={cn('space-y-5', className)}>
      <TablePosterHeading
        lines={['Of interest']}
        meta={races.length === 1 ? '1 RACE' : `${races.length} RACES`}
        description="Races you might join last-minute — not on your training plan"
      />

      <div className={DATA_TABLE_SHELL}>
        {races.length === 0 ? (
          <div className={DATA_EMPTY}>
            <p className="text-sm">No watching races yet. Add one if something catches your eye.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className={cn(DATA_TABLE, 'min-w-[40rem]')} data-density="comfortable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Race</th>
                    <th>Status</th>
                    <th>Distance</th>
                    <th className="text-right">Weeks</th>
                    <th>Link</th>
                    <th>
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
                      <tr key={race.id} className={cn('group', isPast && 'opacity-70')}>
                        <td className={cn('whitespace-nowrap', DATA_CELL_SECONDARY)}>
                          {race.date.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td>
                          <Link href={`/season/${race.id}/edit`} className="block min-w-0">
                            <span className={cn('block truncate', DATA_CELL_PRIMARY)}>
                              {race.name}
                            </span>
                            <span className={cn('mt-0.5 block truncate', DATA_CELL_SECONDARY)}>
                              {raceTypeLabel(race.type)}
                              {race.location ? ` · ${race.location}` : ''}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <StatusPill tone="watching">Watching</StatusPill>
                        </td>
                        <td className={cn('whitespace-nowrap', DATA_NUM, DATA_CELL_SECONDARY)}>
                          {raceDistanceLabel(race.type, {
                            triathlonDistance: race.triathlonDistance,
                            customDistanceKm: race.customDistanceKm,
                            legs: race.legs,
                          })}
                        </td>
                        <td className="text-right">
                          {isPast ? (
                            <span className={DATA_CELL_META}>Past</span>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span className={cn(DATA_NUM, 'text-sm text-foreground')}>
                                {days}
                                <span className="ml-1 text-[10px] font-medium text-text-tertiary">
                                  d
                                </span>
                              </span>
                              <span
                                className={cn(DATA_NUM, 'mt-0.5 text-[11px] text-text-tertiary')}
                              >
                                {weeks}w
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {race.url ? (
                            <a
                              href={race.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[12rem] items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                              title={race.url}
                            >
                              <span className="truncate">Link</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className={DATA_CELL_META}>—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isPast && (
                              <form action={setRaceIntent}>
                                <input type="hidden" name="raceId" value={race.id} />
                                <input type="hidden" name="intent" value={RaceIntent.PLANNED} />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                >
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

            <div className="md:hidden">
              {races.map((race) => {
                const weeks = weeksUntil(race.date)
                return (
                  <Link
                    key={race.id}
                    href={`/season/${race.id}/edit`}
                    className={cn(DATA_MOBILE_CARD, 'block')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={DATA_CELL_PRIMARY}>{race.name}</p>
                      <StatusPill tone="watching">Watching</StatusPill>
                    </div>
                    <p className={cn('mt-1', DATA_CELL_SECONDARY)}>
                      {race.date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                      {' · '}
                      {raceTypeLabel(race.type)}
                    </p>
                    <p className={cn('mt-1', DATA_CELL_META)}>
                      {race.location || '—'} · <span className={DATA_NUM}>{weeks}w</span>
                    </p>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
