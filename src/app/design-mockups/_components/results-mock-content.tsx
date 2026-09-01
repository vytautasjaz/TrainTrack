'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import {
  DataSortHeader,
  compareDataSort,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import { StatusPill } from '@/components/ui/status-pill'
import {
  ToolbarDivider,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import {
  DATA_CELL_META,
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'
import { cn } from '@/lib/utils'

const PBS = [
  {
    id: 'pb1',
    sport: 'Run',
    sportColor: 'var(--tt-sport-run)',
    name: '5K',
    distanceM: 5000,
    value: '19:42',
    when: 'Mar 2026',
    event: 'Parkrun',
  },
  {
    id: 'pb2',
    sport: 'Run',
    sportColor: 'var(--tt-sport-run)',
    name: '10K',
    distanceM: 10000,
    value: '42:18',
    when: 'Apr 2026',
    event: 'City 10K',
  },
  {
    id: 'pb3',
    sport: 'Run',
    sportColor: 'var(--tt-sport-run)',
    name: 'Half marathon',
    distanceM: 21097,
    value: '1:36:02',
    when: 'May 2026',
    event: 'Druskininkai Half',
  },
  {
    id: 'pb4',
    sport: 'Run',
    sportColor: 'var(--tt-sport-run)',
    name: 'Marathon',
    distanceM: 42195,
    value: '3:28:14',
    when: 'Oct 2025',
    event: 'Vilnius Marathon',
  },
  {
    id: 'pb5',
    sport: 'Swim',
    sportColor: 'var(--tt-sport-swim)',
    name: '400 m',
    distanceM: 400,
    value: '5:48',
    when: 'May 2025',
    event: 'Pool TT',
  },
  {
    id: 'pb6',
    sport: 'Swim',
    sportColor: 'var(--tt-sport-swim)',
    name: '1500 m',
    distanceM: 1500,
    value: '24:40',
    when: 'Jun 2025',
    event: 'Open water',
  },
  {
    id: 'pb7',
    sport: 'Swim',
    sportColor: 'var(--tt-sport-swim)',
    name: '3 km',
    distanceM: 3000,
    value: '52:10',
    when: 'Jul 2025',
    event: 'Lake swim',
  },
  {
    id: 'pb8',
    sport: 'Bike',
    sportColor: 'var(--tt-sport-bike)',
    name: '20 km',
    distanceM: 20000,
    value: '32:08',
    when: 'Jun 2025',
    event: 'Time trial',
  },
  {
    id: 'pb9',
    sport: 'Bike',
    sportColor: 'var(--tt-sport-bike)',
    name: '40 km',
    distanceM: 40000,
    value: '1:08:22',
    when: 'Aug 2025',
    event: 'Criterium',
  },
  {
    id: 'pb10',
    sport: 'Bike',
    sportColor: 'var(--tt-sport-bike)',
    name: '100 km',
    distanceM: 100000,
    value: '3:02:40',
    when: 'Sep 2025',
    event: 'Gran fondo',
  },
] as const

const RESULTS = [

  {
    id: 'r1',
    race: 'Vilnius Marathon',
    type: 'Marathon',
    date: '12 Oct 2025',
    dateKey: '2025-10-12',
    sport: 'Run',
    distance: '42.2 km',
    result: '3:28:14',
    outcome: 'finished' as const,
    source: 'Season',
    year: '2025',
  },
  {
    id: 'r2',
    race: 'Druskininkai Half',
    type: 'Half marathon',
    date: '3 May 2026',
    dateKey: '2026-05-03',
    sport: 'Run',
    distance: '21.1 km',
    result: '1:36:02',
    outcome: 'finished' as const,
    source: 'Season',
    year: '2026',
  },
  {
    id: 'r3',
    race: 'Kaunas 10K',
    type: 'Road race',
    date: '12 Apr 2026',
    dateKey: '2026-04-12',
    sport: 'Run',
    distance: '10 km',
    result: '42:18',
    outcome: 'finished' as const,
    source: 'Manual',
    year: '2026',
  },
  {
    id: 'r4',
    race: 'Trakai Sprint Tri',
    type: 'Sprint',
    date: '22 Jun 2025',
    dateKey: '2025-06-22',
    sport: 'Tri',
    distance: 'Sprint',
    result: '1:12:40',
    outcome: 'finished' as const,
    source: 'Season',
    year: '2025',
  },
  {
    id: 'r5',
    race: 'Nida Open Water',
    type: 'Swim',
    date: '18 Jul 2025',
    dateKey: '2025-07-18',
    sport: 'Swim',
    distance: '1.5 km',
    result: '—',
    outcome: 'dnf' as const,
    source: 'Manual',
    year: '2025',
  },
  {
    id: 'r6',
    race: 'Palanga Bike Classic',
    type: 'Cycling',
    date: '9 Aug 2025',
    dateKey: '2025-08-09',
    sport: 'Bike',
    distance: '80 km',
    result: '2:14:05',
    outcome: 'finished' as const,
    source: 'Manual',
    year: '2025',
  },
] as const

type ResultSortKey = 'race' | 'date' | 'sport' | 'distance' | 'result' | 'outcome' | 'source'

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-0.5"
      title={hint}
      role="group"
      aria-label={label}
    >
      <span className="px-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/55">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

type PbTab = 'Run' | 'Bike' | 'Swim'

const PB_TABS: { id: PbTab; label: string; color: string }[] = [
  { id: 'Run', label: 'Run', color: 'var(--tt-sport-run)' },
  { id: 'Bike', label: 'Bike', color: 'var(--tt-sport-bike)' },
  { id: 'Swim', label: 'Swim', color: 'var(--tt-sport-swim)' },
]

/**
 * Personal bests — sport tabs + compact light table (sorted by distance).
 */
export function PersonalBestsMockSection({
  layout = 'grid',
}: {
  layout?: 'grid' | 'panel'
}) {
  const [tab, setTab] = useState<PbTab>('Run')
  const isPanel = layout === 'panel'

  const pbRows = useMemo(
    () =>
      PBS.filter((pb) => pb.sport === tab).sort((a, b) => a.distanceM - b.distanceM),
    [tab],
  )

  const colCount = isPanel ? 3 : 4

  return (
    <section id="personal-bests" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="tt-mock-section-title">Personal bests</h2>
          <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
            Best times by distance · switch sport
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--tt-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--tt-ink)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add PB
        </button>
      </div>

      <div className={cn(DATA_TABLE_SHELL, 'overflow-hidden')}>
        <div
          className="grid grid-cols-3 border-b border-[var(--tt-line)]"
          role="tablist"
          aria-label="Personal bests by sport"
        >
          {PB_TABS.map((item, i) => {
            const active = tab === item.id
            const count = PBS.filter((pb) => pb.sport === item.id).length
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition',
                  i < PB_TABS.length - 1 && 'border-r border-[var(--tt-line)]',
                  active
                    ? 'bg-white text-[var(--tt-ink)]'
                    : 'bg-[var(--tt-sidebar,#f4f4f2)] text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]',
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: item.color, opacity: active ? 1 : 0.55 }}
                  aria-hidden
                />
                <span className={active ? 'font-bold' : undefined}>{item.label}</span>
                <span
                  className={cn(
                    'tabular-nums normal-case tracking-normal',
                    active
                      ? 'font-bold text-[var(--tt-ink-soft)]'
                      : 'font-medium text-[var(--tt-ink-faint)]',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className={cn('overflow-x-auto bg-white', isPanel && 'max-h-[26rem] overflow-y-auto')}>
          <table
            className={cn(DATA_TABLE, 'w-full', !isPanel && 'min-w-[22rem]')}
            data-density={isPanel ? 'compact' : 'comfortable'}
          >
            <tbody>
              {pbRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No personal bests for this sport yet.
                  </td>
                </tr>
              ) : (
                pbRows.map((pb) => (
                  <tr key={pb.id} className="cursor-pointer">
                    <td>
                      <p className={DATA_CELL_PRIMARY}>{pb.name}</p>
                      {isPanel ? (
                        <p className={DATA_CELL_SECONDARY}>{pb.event}</p>
                      ) : null}
                    </td>
                    <td className={cn(DATA_CELL_PRIMARY, DATA_NUM, 'font-semibold')}>{pb.value}</td>
                    {!isPanel ? (
                      <td className={cn(DATA_CELL_META, 'hidden sm:table-cell')}>{pb.event}</td>
                    ) : null}
                    <td className={cn(DATA_CELL_META, DATA_NUM)}>{pb.when}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/** Race results table with filters. */
export function RaceResultsMockSection() {
  const [year, setYear] = useState<'all' | '2026' | '2025'>('all')
  const [sport, setSport] = useState<'all' | 'Run' | 'Bike' | 'Swim' | 'Tri'>('all')
  const [outcome, setOutcome] = useState<'all' | 'finished' | 'dnf'>('all')
  const [sort, setSort] = useState<DataSortState<ResultSortKey> | null>({
    key: 'date',
    dir: 'desc',
  })

  const rows = useMemo(() => {
    let next = RESULTS.filter((r) => {
      if (year !== 'all' && r.year !== year) return false
      if (sport !== 'all' && r.sport !== sport) return false
      if (outcome !== 'all' && r.outcome !== outcome) return false
      return true
    })
    if (sort) {
      next = [...next].sort((a, b) => {
        const av = sort.key === 'date' ? a.dateKey : a[sort.key]
        const bv = sort.key === 'date' ? b.dateKey : b[sort.key]
        return compareDataSort(av, bv, sort.dir)
      })
    }
    return next
  }, [year, sport, outcome, sort])

  return (
    <section id="race-results" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="tt-mock-section-title">Race results</h2>
          <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
            Finished season races and manually logged past results
          </p>
        </div>
        <button
          type="button"
          className="tt-mock-btn tt-mock-btn-primary inline-flex items-center gap-1.5 !normal-case !tracking-normal"
        >
          <Plus className="h-3.5 w-3.5" />
          Log past result
        </button>
      </div>

      <div className="flex min-w-0 flex-wrap items-end gap-2 overflow-x-auto pb-0.5">
        <FilterGroup label="Year" hint="Filter results by year">
          {(['all', '2026', '2025'] as const).map((y) => (
            <ToolbarTextToggle
              key={y}
              pressed={year === y}
              onClick={() => setYear(y)}
              title={y === 'all' ? 'All years' : y}
            >
              {y === 'all' ? 'All' : y}
            </ToolbarTextToggle>
          ))}
        </FilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <FilterGroup label="Sport" hint="Filter by sport">
          {(['all', 'Run', 'Bike', 'Swim', 'Tri'] as const).map((s) => (
            <ToolbarTextToggle
              key={s}
              pressed={sport === s}
              onClick={() => setSport(s)}
              title={s === 'all' ? 'All sports' : s}
            >
              {s === 'all' ? 'All' : s}
            </ToolbarTextToggle>
          ))}
        </FilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <FilterGroup label="Outcome" hint="Finished vs DNF">
          {(
            [
              ['all', 'All'],
              ['finished', 'Finished'],
              ['dnf', 'DNF'],
            ] as const
          ).map(([id, label]) => (
            <ToolbarTextToggle
              key={id}
              pressed={outcome === id}
              onClick={() => setOutcome(id)}
              title={label}
            >
              {label}
            </ToolbarTextToggle>
          ))}
        </FilterGroup>

        <div className="relative ml-auto shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint)]" />
          <input
            readOnly
            placeholder="Search…"
            className="h-8 w-44 rounded-[6px] border border-[var(--tt-line)] bg-white pl-8 pr-2 text-xs"
          />
        </div>
      </div>

      <div className={cn('overflow-x-auto', DATA_TABLE_SHELL)}>
        <table className={cn(DATA_TABLE, 'min-w-[48rem]')} data-density="comfortable">
          <thead>
            <tr>
              {(
                [
                  ['race', 'Race'],
                  ['date', 'Date'],
                  ['sport', 'Sport'],
                  ['distance', 'Distance'],
                  ['result', 'Result'],
                  ['outcome', 'Outcome'],
                  ['source', 'Source'],
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className={DATA_CELL_PRIMARY}>{r.race}</p>
                    <p className={DATA_CELL_SECONDARY}>{r.type}</p>
                  </td>
                  <td className={cn(DATA_CELL_META, DATA_NUM)}>{r.date}</td>
                  <td className={DATA_CELL_META}>{r.sport}</td>
                  <td className={cn(DATA_CELL_META, DATA_NUM)}>{r.distance}</td>
                  <td className={cn(DATA_CELL_PRIMARY, DATA_NUM)}>{r.result}</td>
                  <td>
                    <StatusPill tone={r.outcome === 'finished' ? 'completed' : 'skipped'}>
                      {r.outcome === 'finished' ? 'Finished' : 'DNF'}
                    </StatusPill>
                  </td>
                  <td className={DATA_CELL_META}>{r.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * Results sections (PBs + race table) — used standalone or stacked layouts.
 */
export function ResultsMockSections() {
  return (
    <div className="space-y-8">
      <PersonalBestsMockSection />
      <RaceResultsMockSection />
    </div>
  )
}

/** @deprecated Prefer Stats page — kept for deep-link redirect. */
export function ResultsMockContent() {
  return (
    <div className="space-y-8">
      <header className="space-y-2 pt-1">
        <h1 className="tt-mock-h1 !text-5xl">Results.</h1>
        <p className="max-w-md text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
          Race results and personal bests — from season reports, race logs, and your own records.
        </p>
      </header>
      <ResultsMockSections />
    </div>
  )
}
