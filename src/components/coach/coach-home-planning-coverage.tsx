'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertTriangle, ChevronRight, CircleAlert } from 'lucide-react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteStatusPill } from '@/components/coach/athlete-status-pill'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import {
  CoachHomePanelEmpty,
  CoachHomePanelFooter,
  CoachHomePanelFooterNote,
  CoachHomePanelHeader,
  CoachHomePanelTable,
} from '@/components/coach/coach-home-panel'
import {
  DataSortHeader,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import {
  coachHomePlanAheadTone,
  formatCoachHomePlanAhead,
  sortCoachHomePlanningCoverageRows,
  type CoachHomePlanningCoverageRow,
  type CoachHomePlanningSortKey,
  type CoachHomePlanAheadTone,
} from '@/lib/coach-home'
import { cn } from '@/lib/utils'

const DISPLAY_LIMIT = 8
const WARNING_PLAN_DAYS = 3

type CoachHomePlanningCoverageProps = {
  rows: CoachHomePlanningCoverageRow[]
  totalAthletes: number
  planningLeadDays: number
  needsPlanCount: number
}

export function CoachHomePlanningCoverage({
  rows,
  totalAthletes,
  planningLeadDays,
  needsPlanCount,
}: CoachHomePlanningCoverageProps) {
  const [sort, setSort] = useState<DataSortState<CoachHomePlanningSortKey> | null>(null)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    return sortCoachHomePlanningCoverageRows(rows, sort.key, sort.dir)
  }, [rows, sort])

  const visibleRows = sortedRows.slice(0, DISPLAY_LIMIT)
  const hiddenCount = Math.max(0, totalAthletes - visibleRows.length)

  function toggleSort(key: CoachHomePlanningSortKey) {
    setSort((current) => nextDataSort(current, key))
  }

  return (
    <section className="min-w-0">
      <CoachHomePanelHeader
        title="Plan coverage"
        count={needsPlanCount > 0 ? needsPlanCount : undefined}
      />

      {rows.length === 0 ? (
        <CoachHomePanelEmpty message="No athletes yet." />
      ) : (
        <CoachHomePanelTable tableClassName="table-fixed">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[5.5rem]" />
            <col className="w-[24%]" />
            <col className="w-[5.5rem]" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <DataSortHeader
                  label="Athlete"
                  active={sort?.key === 'athlete'}
                  dir={sort?.key === 'athlete' ? sort.dir : null}
                  onClick={() => toggleSort('athlete')}
                />
              </th>
              <th>
                <DataSortHeader
                  label="Status"
                  active={sort?.key === 'status'}
                  dir={sort?.key === 'status' ? sort.dir : null}
                  onClick={() => toggleSort('status')}
                />
              </th>
              <th className="text-center">
                <DataSortHeader
                  label="Plan ahead"
                  active={sort?.key === 'planAhead'}
                  dir={sort?.key === 'planAhead' ? sort.dir : null}
                  onClick={() => toggleSort('planAhead')}
                  className="mx-auto"
                />
              </th>
              <th className="pr-3 text-right">Open plan</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <PlanningCoverageRow key={row.athleteId} row={row} />
            ))}
          </tbody>
        </CoachHomePanelTable>
      )}

      {visibleRows.length > 0 ? (
        <CoachHomePanelFooter>
          <CoachHomePanelFooterNote>
            {!sort ? (
              <>
                Sorted by earliest plan end · target {planningLeadDays} day
                {planningLeadDays === 1 ? '' : 's'} ahead ·{' '}
              </>
            ) : null}
            <CircleAlert
              className="mb-px inline h-3 w-3 text-[var(--tt-red)]"
              strokeWidth={1.75}
              aria-hidden
            />{' '}
            nothing planned ·{' '}
            <AlertTriangle
              className="mb-px inline h-3 w-3 text-[#a16207]"
              strokeWidth={1.75}
              aria-hidden
            />{' '}
            1–{WARNING_PLAN_DAYS} days left
            {hiddenCount > 0
              ? ` · +${hiddenCount} more athlete${hiddenCount === 1 ? '' : 's'}`
              : ''}
          </CoachHomePanelFooterNote>
        </CoachHomePanelFooter>
      ) : null}
    </section>
  )
}

function PlanningCoverageRow({ row }: { row: CoachHomePlanningCoverageRow }) {
  const [isPending, startTransition] = useTransition()
  const label = formatCoachHomePlanAhead(row.daysAhead)
  const tone = coachHomePlanAheadTone(row.daysAhead)

  function openPlan() {
    if (isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('athleteId', row.athleteId)
      await selectAthleteForTraining(formData)
    })
  }

  return (
    <tr
      onClick={openPlan}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPlan()
        }
      }}
      tabIndex={0}
      aria-label={`Open plan for ${row.athleteName}`}
      className={cn(
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tt-ink-faint)]',
        isPending && 'pointer-events-none opacity-60',
      )}
    >
      <td className="min-w-0 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <AthleteAvatar
            name={row.athleteName}
            avatarUrl={row.avatarUrl}
            size="sm"
            className="shrink-0"
          />
          <span
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--tt-ink)]"
            title={row.athleteName}
          >
            {row.athleteName}
          </span>
        </div>
      </td>
      <td className="align-top" onClick={(event) => event.stopPropagation()}>
        <AthleteStatusPill athleteId={row.athleteId} status={row.status} size="sm" />
      </td>
      <td className="text-center align-middle">
        <span
          className={cn(
            'inline-flex items-center justify-center gap-1 text-[13px] font-semibold tabular-nums',
            planAheadToneClass(tone),
          )}
        >
          {tone === 'critical' ? (
            <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : null}
          {tone === 'warning' ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : null}
          {label}
        </span>
      </td>
      <td className="px-2 pr-3 text-right align-top">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            openPlan()
          }}
          disabled={isPending}
          aria-label={`Open plan for ${row.athleteName}`}
          className="inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)] disabled:opacity-60"
        >
          {isPending ? 'Opening…' : 'Open plan'}
          <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
        </button>
      </td>
    </tr>
  )
}

function planAheadToneClass(tone: CoachHomePlanAheadTone): string {
  switch (tone) {
    case 'critical':
      return 'text-[var(--tt-red)]'
    case 'warning':
      return 'text-[#a16207]'
    case 'ok':
      return 'text-[var(--tt-ink)]'
  }
}
