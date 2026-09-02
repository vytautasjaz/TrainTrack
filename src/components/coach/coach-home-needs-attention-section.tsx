'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, ChevronDown } from 'lucide-react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  CoachHomePanelEmpty,
  CoachHomePanelTable,
  CoachHomeMarkHandledButton,
  CoachHomeStatusBadge,
  CoachHomeTablePagination,
  CoachHomeMobileAccordionBody,
  type CoachHomeBadgeVariant,
} from '@/components/coach/coach-home-panel'
import {
  DataSortHeader,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import {
  sortCoachHomeAttentionItems,
  type CoachHomeAttentionItem,
  type CoachHomeAttentionSortKey,
} from '@/lib/coach-home'
import { formatDateKeyCompact } from '@/lib/dates'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 'all'] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

type CoachHomeNeedsAttentionSectionProps = {
  className?: string
  items: CoachHomeAttentionItem[]
  selectedItemId: string | null
  handledIds: Set<string>
  exitingIds: Set<string>
  onSelectItem: (item: CoachHomeAttentionItem) => void
  onDismissItem: (item: CoachHomeAttentionItem) => void
  onDismissItems: (items: CoachHomeAttentionItem[]) => void
}

export function CoachHomeNeedsAttentionSection({
  className,
  items,
  selectedItemId,
  handledIds,
  exitingIds,
  onSelectItem,
  onDismissItem,
  onDismissItems,
}: CoachHomeNeedsAttentionSectionProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState<PageSizeOption>(5)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<DataSortState<CoachHomeAttentionSortKey> | null>(null)
  const [mobileOpen, setMobileOpen] = useState(true)

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      counts.set(item.categoryLabel, (counts.get(item.categoryLabel) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items
    return items.filter((item) => item.categoryLabel === typeFilter)
  }, [items, typeFilter])

  const sortedItems = useMemo(() => {
    if (!sort) return filteredItems
    return sortCoachHomeAttentionItems(filteredItems, sort.key, sort.dir)
  }, [filteredItems, sort])

  const effectivePageSize =
    pageSize === 'all' ? Math.max(sortedItems.length, 1) : pageSize
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / effectivePageSize))

  const tableItems = useMemo(() => {
    if (pageSize === 'all') return sortedItems
    const start = page * effectivePageSize
    return sortedItems.slice(start, start + effectivePageSize)
  }, [sortedItems, page, pageSize, effectivePageSize])

  const actionableVisible = useMemo(
    () =>
      tableItems.filter(
        (item) => !handledIds.has(item.id) && !exitingIds.has(item.id),
      ),
    [tableItems, handledIds, exitingIds],
  )

  const actionableAll = useMemo(
    () =>
      sortedItems.filter(
        (item) => !handledIds.has(item.id) && !exitingIds.has(item.id),
      ),
    [sortedItems, handledIds, exitingIds],
  )

  useEffect(() => {
    setPage(0)
  }, [items, sort, typeFilter, pageSize])

  useEffect(() => {
    if (typeFilter !== 'all' && !typeOptions.some((opt) => opt.label === typeFilter)) {
      setTypeFilter('all')
    }
  }, [typeFilter, typeOptions])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  function toggleSort(key: CoachHomeAttentionSortKey) {
    setSort((current) => nextDataSort(current, key))
  }

  return (
    <section className={cn('tt-coach-home-mobile-card min-w-0', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-4 md:px-0">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left md:pointer-events-none"
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)] md:font-sans md:text-[0.6875rem] md:font-semibold md:tracking-[0.08em]">
              Needs attention
            </h2>
            {items.length > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tt-red)] px-1.5 text-[11px] font-semibold tabular-nums text-white md:bg-[color-mix(in_srgb,var(--tt-red)_12%,white)] md:text-[var(--tt-red)]">
                {typeFilter === 'all' ? items.length : `${filteredItems.length}/${items.length}`}
              </span>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
              mobileOpen && 'rotate-180',
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>

        {items.length > 0 ? (
          <div className="hidden items-center gap-1.5 md:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint)]">
              Show
            </span>
            <div className="flex gap-0.5 rounded-full border border-[var(--tt-line)] p-0.5">
              {PAGE_SIZE_OPTIONS.map((option) => {
                const active = pageSize === option
                const label = option === 'all' ? 'All' : String(option)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPageSize(option)}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition',
                      active
                        ? 'bg-[var(--tt-ink)] text-white'
                        : 'text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <CoachHomeMobileAccordionBody expanded={mobileOpen}>
      {items.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <FilterChip
              label="All"
              count={items.length}
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            />
            {typeOptions.map((option) => (
              <FilterChip
                key={option.label}
                label={option.label}
                count={option.count}
                active={typeFilter === option.label}
                onClick={() => setTypeFilter(option.label)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={actionableVisible.length === 0}
              onClick={() => onDismissItems(actionableVisible)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--tt-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)] transition hover:border-[var(--tt-good)] hover:bg-[color-mix(in_srgb,var(--tt-good)_10%,white)] hover:text-[var(--tt-good)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3 w-3" strokeWidth={2.25} aria-hidden />
              Mark visible
            </button>
            <button
              type="button"
              disabled={actionableAll.length === 0}
              onClick={() => onDismissItems(actionableAll)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--tt-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)] transition hover:border-[var(--tt-good)] hover:bg-[color-mix(in_srgb,var(--tt-good)_10%,white)] hover:text-[var(--tt-good)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3 w-3" strokeWidth={2.25} aria-hidden />
              Mark all
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <CoachHomePanelEmpty message="Nothing needs your attention right now." />
      ) : filteredItems.length === 0 ? (
        <CoachHomePanelEmpty message="No items match this type filter." />
      ) : (
        <>
          <CoachHomePanelTable tableClassName="table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[6.5rem]" />
              <col className="w-[14%]" />
              <col />
              <col className="w-[2.75rem]" />
              <col className="w-[2.75rem]" />
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
                    label="Type"
                    active={sort?.key === 'type'}
                    dir={sort?.key === 'type' ? sort.dir : null}
                    onClick={() => toggleSort('type')}
                  />
                </th>
                <th>Workout</th>
                <th>Details</th>
                <th className="text-right">
                  <DataSortHeader
                    label="When"
                    active={sort?.key === 'when'}
                    dir={sort?.key === 'when' ? sort.dir : null}
                    onClick={() => toggleSort('when')}
                    className="w-full justify-end"
                  />
                </th>
                <th className="pr-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableItems.map((item) => (
                <AttentionTableRow
                  key={item.id}
                  item={item}
                  selected={selectedItemId === item.id}
                  handled={handledIds.has(item.id)}
                  exiting={exitingIds.has(item.id)}
                  onSelect={() => onSelectItem(item)}
                  onDismiss={() => onDismissItem(item)}
                />
              ))}
            </tbody>
          </CoachHomePanelTable>

          {pageSize !== 'all' ? (
            <CoachHomeTablePagination
              page={page}
              pageCount={pageCount}
              total={sortedItems.length}
              pageSize={effectivePageSize}
              onPrevious={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            />
          ) : sortedItems.length > 0 ? (
            <p className="mt-2 text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
              Showing all {sortedItems.length}
            </p>
          ) : null}
        </>
      )}
      </CoachHomeMobileAccordionBody>
    </section>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'border-[var(--tt-ink)] bg-[var(--tt-ink)] text-white'
          : 'border-[var(--tt-line)] text-[var(--tt-ink-soft)] hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
      )}
    >
      {label}
      {count != null ? (
        <span
          className={cn(
            'tabular-nums',
            active ? 'text-white/80' : 'text-[var(--tt-ink-faint)]',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

function AttentionTableRow({
  item,
  selected,
  handled,
  exiting,
  onSelect,
  onDismiss,
}: {
  item: CoachHomeAttentionItem
  selected: boolean
  handled: boolean
  exiting: boolean
  onSelect: () => void
  onDismiss: () => void
}) {
  const variant = attentionBadgeVariant(item)
  const inactive = handled || exiting

  return (
    <tr
      onClick={inactive ? undefined : onSelect}
      onKeyDown={
        inactive
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect()
              }
            }
      }
      tabIndex={inactive ? -1 : 0}
      data-selected={selected ? 'true' : undefined}
      data-exiting={exiting ? 'true' : undefined}
      aria-hidden={exiting ? true : undefined}
      className={cn(
        'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tt-ink-faint)]',
        inactive ? 'pointer-events-none' : 'cursor-pointer',
        handled && 'tt-attention-row-handled',
        exiting && 'tt-attention-row-exit',
      )}
    >
      <td className="min-w-0 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <AthleteAvatar
            name={item.athleteName}
            avatarUrl={item.avatarUrl}
            size="sm"
            className="shrink-0"
          />
          <span
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--tt-ink)]"
            title={item.athleteName}
          >
            {item.athleteName}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap align-top">
        <CoachHomeStatusBadge
          label={item.categoryLabel}
          variant={variant}
          compact
          noTruncate
        />
      </td>
      <td className="max-w-0">
        <AttentionWorkoutCell item={item} />
      </td>
      <td className="max-w-0">
        <p className="line-clamp-3 text-[13px] leading-snug text-[var(--tt-ink-soft)]">
          {item.description}
        </p>
        {item.contextLine ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--tt-ink-faint)]">
            {item.contextLine}
          </p>
        ) : null}
      </td>
      <td className="text-right align-top">
        <span
          className="tt-data-cell-meta inline-block whitespace-nowrap tabular-nums text-[10px]"
          title={formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
        >
          {compactRelativeTime(item.occurredAt)}
        </span>
      </td>
      <td
        className="px-1 pr-3 text-right align-top"
        data-handled-action="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inline-flex items-center justify-end">
          <CoachHomeMarkHandledButton
            compact
            state={handled ? 'handled' : 'idle'}
            onMarkHandled={onDismiss}
          />
        </div>
      </td>
    </tr>
  )
}

function AttentionWorkoutCell({ item }: { item: CoachHomeAttentionItem }) {
  if (!item.workoutTitle) {
    return <span className="tt-data-cell-meta">—</span>
  }

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      {item.workoutType ? (
        <WorkoutSportIcon type={item.workoutType} size="xs" className="mt-0.5 shrink-0" />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[var(--tt-ink)]">{item.workoutTitle}</p>
        {item.workoutDateKey ? (
          <p className="text-[11px] text-[var(--tt-ink-faint)]">
            {formatDateKeyCompact(item.workoutDateKey)}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function compactRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

function attentionBadgeVariant(item: CoachHomeAttentionItem): CoachHomeBadgeVariant {
  switch (item.kind) {
    case 'message':
      if (item.categoryLabel === 'Feedback') return 'attention_feedback'
      if (item.categoryLabel === 'Race report') return 'attention_race'
      return 'attention_message'
    case 'join_request':
      return 'attention_join'
    case 'missed_session':
      return 'missed_session'
    case 'under_planned':
      return 'attention_planning'
    case 'low_compliance':
      return 'at_risk'
    default:
      return 'neutral'
  }
}
