'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { InboxNotificationsToggle } from '@/components/inbox/inbox-notifications-toggle'
import type { InboxFilter } from '@/lib/coaching-inbox-shared'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { id: InboxFilter; label: string; coachOnly?: boolean }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'requests', label: 'Requests', coachOnly: true },
]

type InboxMobileHeaderActionsProps = {
  role: 'athlete' | 'coach'
  filter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
  pendingRequestCount: number
  pushConfigured: boolean
  /** Optional trailing control (e.g. compose +). */
  trailing?: React.ReactNode
  className?: string
}

/** Bell + status filter — sits on the INBOX title row on mobile. */
export function InboxMobileHeaderActions({
  role,
  filter,
  onFilterChange,
  pendingRequestCount,
  pushConfigured,
  trailing,
  className,
}: InboxMobileHeaderActionsProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const statusChoices = STATUS_OPTIONS.filter(
    (o) => !o.coachOnly || (role === 'coach' && pendingRequestCount > 0),
  )

  return (
    <div className={cn('tt-inbox-mobile-header-actions', className)}>
      <InboxNotificationsToggle pushConfigured={pushConfigured} compact />

      <div className="relative shrink-0">
        <button
          type="button"
          className="tt-inbox-mobile-icon-btn"
          aria-label="Open status filters"
          aria-expanded={statusMenuOpen}
          aria-haspopup="listbox"
          onClick={() => setStatusMenuOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
        {statusMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close filter menu"
              onClick={() => setStatusMenuOpen(false)}
            />
            <ul
              role="listbox"
              className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] overflow-hidden rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] py-1 shadow-[var(--tt-shadow)]"
            >
              {statusChoices.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={filter === opt.id}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-left text-[13px] font-medium',
                      filter === opt.id
                        ? 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)]'
                        : 'text-[var(--tt-ink-soft,#6b6b6b)]',
                    )}
                    onClick={() => {
                      onFilterChange(opt.id)
                      setStatusMenuOpen(false)
                    }}
                  >
                    {opt.label}
                    {opt.id === 'requests' && pendingRequestCount > 0
                      ? ` (${pendingRequestCount})`
                      : null}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {trailing}
    </div>
  )
}
