'use client'

import { useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { SportIcon } from './mock-ui'
import { LIBRARY_TEMPLATES, type TrainingSport } from './training-mock-data'

const FILTERS: Array<'All' | TrainingSport> = [
  'All',
  'run',
  'bike',
  'swim',
  'strength',
  'recovery',
]

function label(s: (typeof FILTERS)[number]) {
  if (s === 'All') return 'All'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function TrainingLibraryPanel({
  onClose,
  compact = false,
}: {
  onClose?: () => void
  compact?: boolean
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const items =
    filter === 'All' ? LIBRARY_TEMPLATES : LIBRARY_TEMPLATES.filter((t) => t.sport === filter)

  return (
    <aside
      className={`flex h-full flex-col border-[var(--tt-line)] bg-white ${
        compact ? 'border-t' : 'border-l'
      }`}
    >
      <div
        className={`flex items-center justify-between border-b border-[var(--tt-line)] ${
          compact ? 'px-4 py-3' : 'px-4 py-3'
        }`}
      >
        <div>
          <p className="tt-mock-overline">Library</p>
          <p className="text-[13px] font-semibold text-[var(--tt-ink)]">Drop onto a day</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius-sm)] text-[var(--tt-ink-faint)] hover:bg-[var(--tt-bg)] hover:text-[var(--tt-ink)]"
            aria-label="Close library"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--tt-line)] px-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] ${
              filter === f
                ? 'bg-[var(--tt-ink)] text-white'
                : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]'
            }`}
          >
            {label(f)}
          </button>
        ))}
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {items.map((t) => (
          <li
            key={t.id}
            draggable
            className="flex cursor-grab items-center gap-2 rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-[var(--tt-bg)] px-2.5 py-2 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
            <SportIcon sport={t.sport} className="h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">{t.title}</p>
              <p className="truncate text-[11px] text-[var(--tt-ink-soft)]">{t.meta}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-t border-[var(--tt-line)] px-3 py-2 text-[10px] text-[var(--tt-ink-faint)]">
        Mock · drag affordance only — drop targets light on hover in week cells
      </p>
    </aside>
  )
}
