'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from 'lucide-react'
import {
  AthleteExpandPanel,
  COACH_ATHLETE_SORT_OPTIONS,
  compareCoachAthletes,
  type CoachAthleteRow,
  type CoachAthleteSortDir,
  type CoachAthleteSortKey,
} from './coach-athletes-table'
import { MockExpandable } from './mock-expandable'

type StatusFilter = 'All' | 'Active' | 'Inactive' | 'Archived'

function StatusPill({ status }: { status: CoachAthleteRow['status'] }) {
  const styles =
    status === 'Active'
      ? 'bg-[var(--tt-good-soft)] text-[var(--tt-good)]'
      : status === 'Inactive'
        ? 'bg-[var(--tt-sidebar)] text-[var(--tt-ink-soft)]'
        : 'bg-[var(--tt-line)] text-[var(--tt-ink-faint)]'
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] ${styles}`}
    >
      {status}
    </span>
  )
}

function defaultDir(key: CoachAthleteSortKey): CoachAthleteSortDir {
  return key === 'name' || key === 'nextRace' || key === 'status' ? 'asc' : 'desc'
}

export function CoachAthletesMobileList({ athletes }: { athletes: CoachAthleteRow[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active')
  const [sortKey, setSortKey] = useState<CoachAthleteSortKey>('attention')
  const [sortDir, setSortDir] = useState<CoachAthleteSortDir>('desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = athletes.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        (a.attentionLabel?.toLowerCase().includes(q) ?? false) ||
        (a.warning?.toLowerCase().includes(q) ?? false) ||
        (a.nextRace?.toLowerCase().includes(q) ?? false)
      )
    })
    return [...filtered].sort((a, b) => compareCoachAthletes(a, b, sortKey, sortDir))
  }, [athletes, query, statusFilter, sortKey, sortDir])

  const sortLabel =
    COACH_ATHLETE_SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Attention'

  const filtersActive = statusFilter !== 'Active' || sortKey !== 'attention' || sortDir !== 'desc'

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  function selectSort(key: CoachAthleteSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(defaultDir(key))
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint)]"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search athletes"
            className="w-full rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-red)]/35"
          />
        </label>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
          className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-[var(--tt-radius-sm)] border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
            filtersActive || filtersOpen
              ? 'border-[var(--tt-red)]/30 bg-[var(--tt-red)]/10 text-[var(--tt-red)]'
              : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)]'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" strokeWidth={2} />
          Filter
          {filtersActive ? (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--tt-red)]" />
          ) : null}
        </button>
      </div>

      <p className="mb-2 text-[11px] text-[var(--tt-ink-faint)]">
        {rows.length} shown · {statusFilter} · {sortLabel} {sortDir === 'asc' ? '↑' : '↓'}
      </p>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-[var(--tt-ink)]/40"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-mobile-filters-title"
            className="relative z-10 w-full max-w-[390px] rounded-t-[1.25rem] border border-[var(--tt-line)] bg-white p-4 pb-6 shadow-[0_-8px_28px_rgb(0_0_0_/0.12)] sm:rounded-[var(--tt-radius)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p
                  id="coach-mobile-filters-title"
                  className="text-base font-bold text-[var(--tt-ink)]"
                >
                  Filters
                </p>
                <p className="text-[11px] text-[var(--tt-ink-soft)]">Status and sort order</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full p-1.5 text-[var(--tt-ink-faint)] hover:bg-[var(--tt-bg)] hover:text-[var(--tt-ink)]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
              Status
            </p>
            <div className="mb-4 space-y-1">
              {(['All', 'Active', 'Inactive', 'Archived'] as const).map((f) => {
                const active = statusFilter === f
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`flex w-full items-center justify-between rounded-[var(--tt-radius-sm)] px-3 py-2.5 text-left text-sm font-medium ${
                      active
                        ? 'bg-[var(--tt-red)]/10 text-[var(--tt-red)]'
                        : 'text-[var(--tt-ink)] hover:bg-[var(--tt-bg)]'
                    }`}
                  >
                    {f}
                    {active ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
                  </button>
                )
              })}
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
              Sort by
            </p>
            <div className="mb-4 space-y-1">
              {COACH_ATHLETE_SORT_OPTIONS.map((opt) => {
                const active = sortKey === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => selectSort(opt.key)}
                    className={`flex w-full items-center justify-between rounded-[var(--tt-radius-sm)] px-3 py-2.5 text-left text-sm font-medium ${
                      active
                        ? 'bg-[var(--tt-red)]/10 text-[var(--tt-red)]'
                        : 'text-[var(--tt-ink)] hover:bg-[var(--tt-bg)]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em]">
                        {sortDir === 'asc' ? 'Asc' : 'Desc'}
                        {sortDir === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="tt-mock-btn tt-mock-btn-primary w-full !normal-case !tracking-normal"
              onClick={() => setFiltersOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-2">
        {rows.map((row) => {
          const open = expandedId === row.id
          const unread = row.activity.filter((a) => a.unread).length

          return (
            <li key={row.id}>
              <MockExpandable
                open={open}
                expandKey={row.id}
                onToggle={() => setExpandedId(open ? null : row.id)}
                className="overflow-hidden rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)]"
                trigger={({ open: isOpen }) => (
                  <div className="flex items-start gap-3 p-3.5 pl-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide ${
                        isOpen
                          ? 'bg-[var(--tt-red)] text-white'
                          : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink)]'
                      }`}
                    >
                      {row.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[15px] font-semibold text-[var(--tt-ink)]">{row.name}</p>
                        <StatusPill status={row.status} />
                      </div>
                      {row.attentionLabel ? (
                        <p className="mt-1 text-[11px] font-semibold text-[var(--tt-red)]">
                          {row.attentionLabel}
                          {unread > 0 ? (
                            <span className="font-semibold tabular-nums"> · {unread} unread</span>
                          ) : null}
                          {row.warning ? (
                            <span className="font-medium text-[var(--tt-ink-soft)]">
                              {' '}
                              · {row.warning}
                            </span>
                          ) : null}
                        </p>
                      ) : unread > 0 ? (
                        <p className="mt-1 text-[11px] font-semibold tabular-nums text-[var(--tt-red)]">
                          {unread} unread
                          {row.warning ? (
                            <span className="font-medium text-[var(--tt-ink-soft)]">
                              {' '}
                              · {row.warning}
                            </span>
                          ) : null}
                        </p>
                      ) : row.warning ? (
                        <p className="mt-1 text-[11px] font-medium text-[var(--tt-ink-soft)]">
                          {row.warning}
                        </p>
                      ) : null}
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-[var(--tt-ink-soft)]">
                        <p>
                          <span
                            className={`font-semibold tabular-nums ${
                              row.planned > 0 && row.completed < row.planned
                                ? 'text-[var(--tt-red)]'
                                : 'text-[var(--tt-ink)]'
                            }`}
                          >
                            {row.planned > 0
                              ? `${row.completed}/${row.planned} · ${row.compliance}%`
                              : '—'}
                          </span>
                          <span className="text-[var(--tt-ink-faint)]"> to today</span>
                          <span className="text-[var(--tt-ink-faint)]"> · </span>
                          <span className="tabular-nums">
                            {row.lastWeekPlanned > 0
                              ? `${row.lastWeekCompleted}/${row.lastWeekPlanned} · ${row.lastWeekCompliance}%`
                              : '—'}
                          </span>
                          <span className="text-[var(--tt-ink-faint)]"> last wk</span>
                        </p>
                        <p className="truncate">{row.nextRace ?? 'No race'}</p>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-red)]" />
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" />
                    )}
                  </div>
                )}
              >
                <AthleteExpandPanel row={row} stacked />
              </MockExpandable>
            </li>
          )
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[var(--tt-ink-faint)]">No athletes match.</p>
      ) : null}
    </div>
  )
}
