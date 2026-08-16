'use client'

import Link from 'next/link'
import type { SeasonRace } from '@/lib/season-races'
import { raceOutcomeSummary, raceTypeLabel } from '@/lib/season-races'
import { PriorityBadge } from '@/components/races/priority-badge'
import { ItemActions } from '@/components/ui/item-actions'
import { StatusPill } from '@/components/ui/status-pill'
import { TablePosterHeading } from '@/components/ui/table-poster-heading'
import { deleteRace } from '@/app/actions/workouts'
import { cn } from '@/lib/utils'
import {
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_EMPTY,
  DATA_MOBILE_CARD,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

type PastRaceTableProps = {
  races: SeasonRace[]
  className?: string
}

export function PastRaceTable({ races, className }: PastRaceTableProps) {
  return (
    <section className={cn('space-y-5', className)}>
      <TablePosterHeading
        lines={['Past races']}
        meta={races.length === 1 ? '1 EVENT' : `${races.length} EVENTS`}
        description="Completed season events"
      />

      <div className={DATA_TABLE_SHELL}>
        {races.length === 0 ? (
          <div className={DATA_EMPTY}>
            <p className="text-sm">No past races yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className={cn(DATA_TABLE, 'min-w-[36rem]')} data-density="comfortable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Race</th>
                    <th>Status</th>
                    <th>Result</th>
                    <th>Notes</th>
                    <th>Priority</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {races.map((race) => (
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
                        <Link
                          href={`/season/${race.id}/edit`}
                          className="block min-w-0 opacity-90 transition group-hover:opacity-100"
                        >
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
                        <StatusPill tone="completed">Completed</StatusPill>
                      </td>
                      <td className={cn('whitespace-nowrap', DATA_CELL_SECONDARY)}>
                        {raceOutcomeSummary(race)}
                      </td>
                      <td className={cn('max-w-[12rem] truncate', DATA_CELL_SECONDARY)}>
                        {race.outcome && race.outcome !== 'DISMISSED'
                          ? race.resultNotes || '—'
                          : '—'}
                      </td>
                      <td>
                        <PriorityBadge priority={race.priority} />
                      </td>
                      <td className="text-right">
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

            <div className="md:hidden">
              {races.map((race) => (
                <Link
                  key={race.id}
                  href={`/season/${race.id}/edit`}
                  className={cn(DATA_MOBILE_CARD, 'block')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={DATA_CELL_PRIMARY}>{race.name}</p>
                    <StatusPill tone="completed">Completed</StatusPill>
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
                  <p className={cn('mt-1', DATA_CELL_SECONDARY)}>{raceOutcomeSummary(race)}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
