'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DataSortDir = 'asc' | 'desc'

export type DataSortState<K extends string = string> = {
  key: K
  dir: DataSortDir
}

/** Cycle sort: new column → asc; same column → flip; optional third click clears. */
export function nextDataSort<K extends string>(
  current: DataSortState<K> | null,
  key: K,
  { clearable = false }: { clearable?: boolean } = {},
): DataSortState<K> | null {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return clearable ? null : { key, dir: 'asc' }
}

export function compareDataSort(
  a: string | number,
  b: string | number,
  dir: DataSortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mul
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * mul
}

/** Clickable column header for `.tt-data-table` — muted until active. */
export function DataSortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string
  active: boolean
  dir: DataSortDir | null
  onClick: () => void
  className?: string
}) {
  const Icon = !active ? ArrowUpDown : dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      className={cn('tt-data-sort', className)}
      data-active={active ? 'true' : undefined}
      onClick={onClick}
      aria-label={`Sort by ${label}${active ? `, ${dir === 'desc' ? 'descending' : 'ascending'}` : ''}`}
    >
      <span>{label}</span>
      <Icon className="tt-data-sort-icon" strokeWidth={2.25} aria-hidden />
    </button>
  )
}
