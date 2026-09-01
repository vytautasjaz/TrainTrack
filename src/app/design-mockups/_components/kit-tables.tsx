'use client'

import { useMemo, useState } from 'react'
import {
  DATA_CELL_META,
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
  TABLE_FRAME,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
} from '@/lib/table-styles'
import {
  DataSortHeader,
  compareDataSort,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import { cn } from '@/lib/utils'

const LIGHT_ROWS = [
  {
    race: 'Vilnius Marathon',
    date: '12 Oct 2025',
    dateKey: '2025-10-12',
    sport: 'Run',
    distance: '42.2 km',
    result: '3:28:14',
  },
  {
    race: 'Druskininkai Half',
    date: '3 May 2025',
    dateKey: '2025-05-03',
    sport: 'Run',
    distance: '21.1 km',
    result: '1:36:02',
  },
  {
    race: 'Trakai Sprint Tri',
    date: '22 Jun 2025',
    dateKey: '2025-06-22',
    sport: 'Tri',
    distance: 'Sprint',
    result: '1:12:40',
  },
] as const

type LightSortKey = 'race' | 'date' | 'sport' | 'distance' | 'result'

const DARK_DAYS = [
  { label: 'Monday', short: 'Mon', weekend: false },
  { label: 'Tuesday', short: 'Tue', weekend: false },
  { label: 'Wednesday', short: 'Wed', weekend: false },
  { label: 'Thursday', short: 'Thu', weekend: false },
  { label: 'Friday', short: 'Fri', weekend: false },
  { label: 'Saturday', short: 'Sat', weekend: true },
  { label: 'Sunday', short: 'Sun', weekend: true },
] as const

const DARK_CELLS = [
  ['Easy Run', 'Swim technique', '—', 'Bike endurance', 'Strength', 'Recovery', 'Local 10K'],
  ['8 km · Z2', '2.0 km', '', '90 min · Z2', '45 min', 'Mobility', 'Race'],
] as const

/** Light framed list table — races / results / PBs (`tt-data-table`) with sort. */
export function KitLightHeaderTable() {
  const [sort, setSort] = useState<DataSortState<LightSortKey> | null>({
    key: 'date',
    dir: 'desc',
  })

  const rows = useMemo(() => {
    const next = [...LIGHT_ROWS]
    if (!sort) return next
    next.sort((a, b) => compareDataSort(a[sort.key], b[sort.key], sort.dir))
    return next
  }, [sort])

  return (
    <div className={cn('overflow-x-auto', DATA_TABLE_SHELL)}>
      <table className={cn(DATA_TABLE, 'min-w-[36rem]')} data-density="comfortable">
        <thead>
          <tr>
            {(
              [
                ['race', 'Race'],
                ['date', 'Date'],
                ['sport', 'Sport'],
                ['distance', 'Distance'],
                ['result', 'Result'],
              ] as const
            ).map(([key, label]) => (
              <th key={key}>
                <DataSortHeader
                  label={label}
                  active={sort?.key === key}
                  dir={sort?.key === key ? sort.dir : null}
                  onClick={() => setSort((s) => nextDataSort(s, key))}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.race}>
              <td>
                <p className={DATA_CELL_PRIMARY}>{row.race}</p>
                <p className={DATA_CELL_SECONDARY}>Past result</p>
              </td>
              <td className={DATA_CELL_META}>{row.date}</td>
              <td className={DATA_CELL_META}>{row.sport}</td>
              <td className={cn(DATA_CELL_META, DATA_NUM)}>{row.distance}</td>
              <td className={cn(DATA_CELL_PRIMARY, DATA_NUM)}>{row.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Dark navy header (`#2a3144`) — week / month / season plan chrome (`tt-table-*`). */
export function KitDarkHeaderTable() {
  return (
    <div className="overflow-hidden rounded-[0.5rem]">
      <div className="overflow-x-auto">
        <table className={cn(TABLE_FRAME, 'w-full min-w-[42rem]')}>
          <thead className={TABLE_HEADER}>
            <tr>
              <th
                className={cn(
                  'px-3 py-2 text-left text-[11px] font-semibold',
                  TABLE_HEADER_VLINE,
                  TABLE_HEADER_CELL_MUTED,
                )}
              >
                Sport
              </th>
              {DARK_DAYS.map((day, i) => (
                <th
                  key={day.label}
                  className={cn(
                    'px-2 py-2 text-center text-[11px] font-semibold',
                    i < 6 && TABLE_HEADER_VLINE,
                    day.weekend && TABLE_HEADER_CELL_WEEKEND,
                    day.weekend ? TABLE_HEADER_CELL : TABLE_HEADER_CELL_STRONG,
                  )}
                >
                  <span className="hidden sm:inline">{day.label}</span>
                  <span className="sm:hidden">{day.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <th className="bg-muted/20 px-3 py-2 text-left align-top text-[10px] font-medium text-muted-foreground">
                Run
              </th>
              {DARK_CELLS[0].map((cell, i) => (
                <td key={`r0-${i}`} className="p-1.5 align-top">
                  {cell !== '—' ? (
                    <div className="rounded-[6px] border border-[var(--tt-line-strong)] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgb(0_0_0_/0.045)]">
                      <p className="text-[12px] font-medium leading-snug text-foreground">{cell}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{DARK_CELLS[1][i]}</p>
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
            <tr>
              <th className="bg-muted/20 px-3 py-2 text-left align-top text-[10px] font-medium text-muted-foreground">
                Bike
              </th>
              {['—', 'Endurance 75', '—', '—', 'Sweet spot', '—', '—'].map((cell, i) => (
                <td key={`r1-${i}`} className="p-1.5 align-top">
                  {cell !== '—' ? (
                    <div className="rounded-[6px] border border-[var(--tt-line-strong)] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgb(0_0_0_/0.045)]">
                      <p className="text-[12px] font-medium leading-snug text-foreground">{cell}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {cell.includes('Sweet') ? '3×12 · Z3.5' : '75 min · Z2'}
                      </p>
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
