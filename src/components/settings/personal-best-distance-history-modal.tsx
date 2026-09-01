'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import {
  DataSortHeader,
  compareDataSort,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import {
  buildPersonalBestDistanceHistory,
  type PersonalBestDistanceHistoryEntry,
} from '@/lib/personal-best-distance-history'
import type { PersonalBestRecord } from '@/lib/personal-bests'
import type { RaceResultRow } from '@/lib/race-results'
import { cn } from '@/lib/utils'
import {
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

const PAGE_SIZE = 8

type SortColumn = 'date' | 'time'

type PersonalBestDistanceHistoryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personalBest: PersonalBestRecord | null
  results: RaceResultRow[]
}

function sortValue(
  entry: PersonalBestDistanceHistoryEntry,
  key: SortColumn,
): string | number {
  if (key === 'date') return entry.sortDate
  return entry.sortValue ?? Number.POSITIVE_INFINITY
}

export function PersonalBestDistanceHistoryModal({
  open,
  onOpenChange,
  personalBest,
  results,
}: PersonalBestDistanceHistoryModalProps) {
  const [sort, setSort] = useState<DataSortState<SortColumn> | null>({
    key: 'date',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)

  const entries = useMemo(() => {
    if (!personalBest) return []
    return buildPersonalBestDistanceHistory(results, personalBest)
  }, [personalBest, results])

  const sorted = useMemo(() => {
    if (!sort) return entries
    return [...entries].sort((a, b) => {
      const cmp = compareDataSort(sortValue(a, sort.key), sortValue(b, sort.key), sort.dir)
      if (cmp !== 0) return cmp
      return b.sortDate.localeCompare(a.sortDate)
    })
  }, [entries, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const title = personalBest?.name ?? 'Distance history'

  function onToggleSort(column: SortColumn) {
    setPage(0)
    setSort((s) => nextDataSort(s, column))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPage(0)
          setSort({ key: 'date', dir: 'desc' })
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {entries.length === 0
              ? 'No results for this distance yet.'
              : `${entries.length} ${entries.length === 1 ? 'result' : 'results'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Add a result for this personal best, or log a matching race below.
            </p>
          ) : (
            <div className={DATA_TABLE_SHELL}>
              <table className={cn(DATA_TABLE, 'min-w-full')} data-density="compact">
                <thead>
                  <tr>
                    <th>
                      <DataSortHeader
                        label="Date"
                        active={sort?.key === 'date'}
                        dir={sort?.key === 'date' ? sort.dir : null}
                        onClick={() => onToggleSort('date')}
                      />
                    </th>
                    <th>Event</th>
                    <th className="text-right">
                      <div className="flex justify-end">
                        <DataSortHeader
                          label="Time"
                          active={sort?.key === 'time'}
                          dir={sort?.key === 'time' ? sort.dir : null}
                          onClick={() => onToggleSort('time')}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.dateLabel}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium leading-snug">{row.event}</div>
                        {row.location ? (
                          <div className="text-xs text-muted-foreground">{row.location}</div>
                        ) : row.isPersonalBestRecord ? (
                          <div className="text-xs text-muted-foreground">From personal best</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">
                        {row.resultLabel || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Caption>
                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, sorted.length)} of{' '}
                {sorted.length}
              </Caption>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
