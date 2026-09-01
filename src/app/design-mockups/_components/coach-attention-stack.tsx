'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import {
  COACH_MOCK_ATTENTION_BLOCKS,
  COACH_MOCK_JOIN_REQUESTS,
  COACH_MOCK_NEEDS_REPLY,
  COACH_MOCK_UNDERPLANNED,
  type CoachAttentionBlockId,
  type CoachJoinRequestItem,
} from './coach-athletes-mock-data'
import { MockExpandable } from './mock-expandable'

function countFor(id: CoachAttentionBlockId, joinPending: number) {
  if (id === 'requests') return joinPending
  if (id === 'underplanned') return COACH_MOCK_UNDERPLANNED.length
  return COACH_MOCK_NEEDS_REPLY.length
}

function BlockIcon({ kind }: { kind: (typeof COACH_MOCK_ATTENTION_BLOCKS)[number]['kind'] }) {
  if (kind === 'request') {
    return <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
  }
  if (kind === 'plan') {
    return <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
  }
  return <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
}

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white font-bold tracking-wide text-[var(--tt-ink)] ring-1 ring-[var(--tt-line)] ${
        size === 'sm' ? 'h-7 w-7 text-[9px]' : 'h-8 w-8 text-[10px]'
      }`}
    >
      {initials}
    </span>
  )
}

export function CoachAttentionStack({ compact = false }: { compact?: boolean }) {
  const [expandedId, setExpandedId] = useState<CoachAttentionBlockId | null>(null)
  const [joinRequests, setJoinRequests] = useState(COACH_MOCK_JOIN_REQUESTS)

  const joinPending = useMemo(
    () => joinRequests.filter((r) => r.status === 'pending').length,
    [joinRequests],
  )

  function resolveJoin(id: string, status: 'approved' | 'declined') {
    setJoinRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    )
  }

  return (
    <div className="tt-mock-card overflow-hidden">
      <div
        className={`flex items-center gap-2 border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)] ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5'
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--tt-red)]" strokeWidth={2} />
        <p className="tt-mock-overline text-[var(--tt-red)]">Needs attention</p>
      </div>

      <ul>
        {COACH_MOCK_ATTENTION_BLOCKS.map((block) => {
          const open = expandedId === block.id
          const count = countFor(block.id, joinPending)
          return (
            <li key={block.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <MockExpandable
                open={open}
                expandKey={block.id}
                onToggle={() => setExpandedId(open ? null : block.id)}
                trigger={({ open: isOpen }) => (
                  <div
                    className={`flex w-full items-center ${
                      compact ? 'gap-2.5 px-3 py-2.5' : 'gap-3 px-4 py-3.5'
                    }`}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full ${
                        compact ? 'h-7 w-7' : 'h-8 w-8'
                      } ${
                        isOpen
                          ? 'bg-[var(--tt-red)] text-white'
                          : block.kind === 'request'
                            ? 'bg-[var(--tt-red)]/10 text-[var(--tt-red)]'
                            : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink-soft)]'
                      }`}
                    >
                      <BlockIcon kind={block.kind} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={`font-semibold text-[var(--tt-ink)] ${
                            compact ? 'text-[13px]' : 'text-sm'
                          }`}
                        >
                          {block.title}
                        </p>
                      </div>
                      <p
                        className={
                          compact
                            ? 'truncate text-[11px] text-[var(--tt-ink-soft)]'
                            : 'tt-mock-caption'
                        }
                      >
                        {block.summary}
                      </p>
                    </div>
                    {count > 0 ? (
                      <span
                        className={`shrink-0 tabular-nums font-semibold text-[var(--tt-red)] ${
                          compact ? 'text-[13px]' : 'text-sm'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--tt-red)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" />
                    )}
                  </div>
                )}
              >
                {block.id === 'requests' ? (
                  <JoinRequestsList
                    items={joinRequests}
                    compact={compact}
                    onResolve={resolveJoin}
                  />
                ) : null}
                {block.id === 'underplanned' ? (
                  <UnderplannedList compact={compact} />
                ) : null}
                {block.id === 'replies' ? <NeedsReplyList compact={compact} /> : null}
              </MockExpandable>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function JoinRequestsList({
  items,
  compact,
  onResolve,
}: {
  items: CoachJoinRequestItem[]
  compact: boolean
  onResolve: (id: string, status: 'approved' | 'declined') => void
}) {
  const pending = items.filter((r) => r.status === 'pending')
  const resolved = items.filter((r) => r.status !== 'pending')
  const rows = [...pending, ...resolved]

  if (rows.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-[12px] text-[var(--tt-ink-faint)]">
        No join requests
      </p>
    )
  }

  if (compact) {
    return (
      <ul className="divide-y divide-[var(--tt-line)]">
        {rows.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
            <Avatar initials={item.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[13px] font-semibold text-[var(--tt-ink)]">{item.name}</p>
                <p className="text-[10px] text-[var(--tt-ink-faint)]">{item.when}</p>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--tt-ink-soft)]">{item.meta}</p>
              {item.status === 'pending' ? (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    className="rounded-[6px] bg-[var(--tt-ink)] px-2.5 py-1 text-[11px] font-semibold text-white"
                    onClick={() => onResolve(item.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-[6px] border border-[var(--tt-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)]"
                    onClick={() => onResolve(item.id, 'declined')}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] font-semibold text-[var(--tt-ink-faint)]">
                  {item.status === 'approved' ? 'Approved' : 'Declined'}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={item.initials} />
                  <p className="font-semibold text-[var(--tt-ink)]">{item.name}</p>
                </div>
              </td>
              <td className="px-3 py-3 align-middle text-[var(--tt-ink-soft)]">{item.meta}</td>
              <td className="px-3 py-3 align-middle text-[var(--tt-ink-faint)]">{item.when}</td>
              <td className="px-4 py-3 align-middle">
                {item.status === 'pending' ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="rounded-[6px] bg-[var(--tt-ink)] px-2.5 py-1 text-[11px] font-semibold text-white"
                      onClick={() => onResolve(item.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-[6px] border border-[var(--tt-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)]"
                      onClick={() => onResolve(item.id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                    {item.status === 'approved' ? 'Approved' : 'Declined'}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UnderplannedList({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <ul className="divide-y divide-[var(--tt-line)]">
        {COACH_MOCK_UNDERPLANNED.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
            <Avatar initials={item.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[13px] font-semibold text-[var(--tt-ink)]">{item.name}</p>
                <p className="text-[10px] text-[var(--tt-ink-faint)]">{item.week}</p>
              </div>
              <p className="mt-1 text-[11px] text-[var(--tt-ink)]">
                <span className="text-[var(--tt-ink-faint)]">Last upcoming · </span>
                {item.lastUpcoming}
              </p>
              <Link
                href="/design-mockups/training-week"
                className="mt-2 inline-flex text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink)] hover:text-[var(--tt-red)]"
                onClick={(e) => e.stopPropagation()}
              >
                Open plan →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <tbody>
          {COACH_MOCK_UNDERPLANNED.map((item) => (
            <tr key={item.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={item.initials} />
                  <p className="font-semibold text-[var(--tt-ink)]">{item.name}</p>
                </div>
              </td>
              <td className="px-3 py-3 align-middle">
                <p className="text-[var(--tt-ink)]">{item.lastUpcoming}</p>
                <p className="mt-0.5 text-[10px] text-[var(--tt-ink-faint)]">Last upcoming planned</p>
              </td>
              <td className="px-4 py-3 align-middle">
                <Link
                  href="/design-mockups/training-week"
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink)] hover:text-[var(--tt-red)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open plan →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NeedsReplyList({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <ul className="divide-y divide-[var(--tt-line)]">
        {COACH_MOCK_NEEDS_REPLY.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
            <Avatar initials={item.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                  {item.name}
                  {item.count > 1 ? (
                    <span className="ml-1.5 text-[11px] font-semibold tabular-nums text-[var(--tt-red)]">
                      · {item.count} unread
                    </span>
                  ) : null}
                </p>
                <p className="text-[10px] text-[var(--tt-ink-faint)]">{item.when}</p>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--tt-ink-soft)]">
                {item.preview}
              </p>
              <Link
                href="/design-mockups/inbox"
                className="mt-2 inline-flex text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink)] hover:text-[var(--tt-red)]"
                onClick={(e) => e.stopPropagation()}
              >
                Open chat →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <tbody>
          {COACH_MOCK_NEEDS_REPLY.map((item) => (
            <tr key={item.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={item.initials} />
                  <p className="font-semibold text-[var(--tt-ink)]">{item.name}</p>
                </div>
              </td>
              <td className="max-w-[20rem] px-3 py-3 align-middle text-[var(--tt-ink-soft)]">
                {item.preview}
              </td>
              <td className="px-3 py-3 align-middle tabular-nums text-[13px] font-semibold text-[var(--tt-red)]">
                {item.count} unread
              </td>
              <td className="px-3 py-3 align-middle text-[var(--tt-ink-faint)]">{item.when}</td>
              <td className="px-4 py-3 align-middle">
                <Link
                  href="/design-mockups/inbox"
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink)] hover:text-[var(--tt-red)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open chat →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
