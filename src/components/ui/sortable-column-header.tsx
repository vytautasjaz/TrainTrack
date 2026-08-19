'use client'

import { useCallback, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export type SortableColumnHeaderProps = {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
  className?: string
}

/**
 * Site-default sortable table header control.
 * Matches Season plan race-table header chrome (label + small chevron).
 */
export function SortableColumnHeader({
  label,
  active,
  direction,
  onClick,
  className,
}: SortableColumnHeaderProps) {
  const Chevron = active && direction === 'asc' ? ChevronUp : ChevronDown

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] transition',
        'outline-none focus-visible:ring-1 focus-visible:ring-foreground/30',
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      aria-label={
        active
          ? `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`
          : `${label}, not sorted`
      }
    >
      {label}
      <Chevron className="h-3 w-3 opacity-70" aria-hidden />
    </button>
  )
}

type UseColumnSortOptions<T extends string> = {
  initialColumn: T
  initialDirection?: SortDirection
  /** Direction used the first time a column becomes active. */
  defaultDirectionForColumn?: (column: T) => SortDirection
}

export function useColumnSort<T extends string>({
  initialColumn,
  initialDirection = 'desc',
  defaultDirectionForColumn,
}: UseColumnSortOptions<T>) {
  const [sortColumn, setSortColumn] = useState<T>(initialColumn)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection)

  const toggleSort = useCallback(
    (column: T) => {
      if (sortColumn === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortColumn(column)
      setSortDirection(defaultDirectionForColumn?.(column) ?? 'asc')
    },
    [defaultDirectionForColumn, sortColumn],
  )

  const resetSort = useCallback(() => {
    setSortColumn(initialColumn)
    setSortDirection(initialDirection)
  }, [initialColumn, initialDirection])

  return { sortColumn, sortDirection, toggleSort, resetSort }
}
