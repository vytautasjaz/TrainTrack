'use client'

import Link from 'next/link'
import type { SeasonRace } from '@/lib/season-races'
import { raceDistanceLabel, raceTypeLabel, weeksUntil } from '@/lib/season-races'
import { PriorityBadge } from '@/components/races/priority-badge'
import { ItemActions } from '@/components/ui/item-actions'
import { StatusPill } from '@/components/ui/status-pill'
import { TablePosterHeading } from '@/components/ui/table-poster-heading'
import { deleteRace } from '@/app/actions/workouts'
import { daysUntil, cn } from '@/lib/utils'
import {
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_CELL_META,
  DATA_EMPTY,
  DATA_MOBILE_CARD,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

type UpcomingRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function UpcomingRaceTable({ races, className }: UpcomingRaceTableProps) {
  return (
    <section className={cn('space-y-5', className)}>
      <TablePosterHeading
        lines={['Upcoming races']}
        meta={races.length === 1 ? '1 EVENT' : `${races.length} EVENTS`}
        description="Scheduled events for the rest of the season"
      />

      <div className={DATA_TABLE_SHELL}>
        {races.length === 0 ? (
          <div className={DATA_EMPTY}>
            <p className="text-sm">No upcoming races. Add one to plan your season.</p>
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
                    <th>Priority</th>
                    <th>Goal</th>
                    <th className="text-right">Weeks</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {races.map((race) => {
                    const days = daysUntil(race.date)
                    const weeks = weeksUntil(race.date)
                    return (
                      <tr key={race.id} className="group">
                        <td className={cn('whitespace-nowrap', DATA_CELL_SECONDARY)}>
                          {race.date.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td>
                          <Link href={`/season/${race.id}/edit`} className="min-w-0 block">
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
                          <StatusPill tone="planned">Planned</StatusPill>
                        </td>
                        <td className={cn('whitespace-nowrap', DATA_NUM, DATA_CELL_SECONDARY)}>
                          {raceDistanceLabel(race.type, {
                            triathlonDistance: race.triathlonDistance,
                            customDistanceKm: race.customDistanceKm,
                            legs: race.legs,
                          })}
                        </td>
                        <td>
                          <PriorityBadge priority={race.priority} />
                        </td>
                        <td className={cn('max-w-[10rem] truncate', DATA_CELL_SECONDARY)}>
                          {race.goal || '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex flex-col items-end leading-tight">
                            <span className={cn(DATA_NUM, 'text-sm text-foreground')}>
                              {days}
                              <span className="ml-1 text-[10px] font-medium text-text-tertiary">
                                d
                              </span>
                            </span>
                            <span className={cn(DATA_NUM, 'mt-0.5 text-[11px] text-text-tertiary')}>
                              {weeks}w
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
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
                      <StatusPill tone="planned">Planned</StatusPill>
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
                      {race.location || '—'}
                      {' · '}
                      <span className={DATA_NUM}>{weeks}w</span>
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
