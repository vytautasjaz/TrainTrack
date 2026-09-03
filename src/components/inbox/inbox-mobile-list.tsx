'use client'

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Flag,
  Inbox,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  SlidersHorizontal,
} from 'lucide-react'
import { CoachingThreadKind } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { InboxNotificationsToggle } from '@/components/inbox/inbox-notifications-toggle'
import { MobileAccordionBody } from '@/components/ui/mobile-accordion-body'
import { Select } from '@/components/ui/select'
import { parseDateOnly } from '@/lib/dates'
import {
  inboxCoachRequestListId,
  type InboxCoachRequest,
} from '@/lib/inbox-coach-requests'
import type { InboxFilter, InboxKindFilter } from '@/lib/coaching-inbox-shared'
import { cn } from '@/lib/utils'

type InboxParticipant = {
  name: string
  avatarUrl: string | null
}

type InboxAthleteOption = InboxParticipant & { id: string }

/** Subset of inbox thread fields needed for the mobile list. */
export type InboxMobileThread = {
  id: string
  kind: CoachingThreadKind
  lastMessageAt: string
  unread: boolean
  preview: string
  athlete: { id: string; name: string; avatarUrl: string | null } | null
  workout: { title: string; dateKey: string } | null
  race: { name: string; dateKey: string } | null
}

export type InboxMobileListEntry =
  | { type: 'thread'; thread: InboxMobileThread; sortAt: string }
  | { type: 'request'; request: InboxCoachRequest; sortAt: string }

type TimeBucketId = 'today' | 'this_week' | 'last_week' | 'older'

const KIND_TABS: {
  id: InboxKindFilter
  label: string
  icon: typeof Inbox
}[] = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'GENERAL', label: 'Chat', icon: MessageCircle },
  { id: 'ASK', label: 'Asks', icon: Paperclip },
  { id: 'FEEDBACK', label: 'Feedback', icon: MessageSquareText },
  { id: 'RACE_REPORT', label: 'Races', icon: Flag },
]

const STATUS_OPTIONS: { id: InboxFilter; label: string; coachOnly?: boolean }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'requests', label: 'Requests', coachOnly: true },
]

function kindTone(kind: CoachingThreadKind | 'REQUEST'): string {
  if (kind === 'REQUEST' || kind === CoachingThreadKind.ASK) return 'var(--tt-red, #da2f36)'
  if (kind === CoachingThreadKind.GENERAL) return 'var(--tt-sport-swim, #1e9bde)'
  if (kind === CoachingThreadKind.FEEDBACK) return 'var(--tt-sport-bike, #16b8a6)'
  return 'var(--tt-ink-soft, #6b6b6b)'
}

function kindShortLabel(kind: CoachingThreadKind) {
  if (kind === CoachingThreadKind.GENERAL) return 'Chat'
  if (kind === CoachingThreadKind.ASK) return 'Ask'
  if (kind === CoachingThreadKind.FEEDBACK) return 'Feedback'
  return 'Race'
}

function threadSubject(t: InboxMobileThread) {
  return t.workout?.title ?? t.race?.name ?? 'General chat'
}

function formatSessionMeta(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addLocalDays(d: Date, days: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday-based local week start. */
function startOfLocalWeek(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfLocalDay(addLocalDays(d, diff))
}

function bucketFor(iso: string, now = new Date()): TimeBucketId {
  const at = new Date(iso)
  const today = startOfLocalDay(now)
  const thisWeek = startOfLocalWeek(now)
  const lastWeek = addLocalDays(thisWeek, -7)

  if (at >= today) return 'today'
  if (at >= thisWeek) return 'this_week'
  if (at >= lastWeek) return 'last_week'
  return 'older'
}

function formatRangeDay(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function bucketLabel(id: TimeBucketId): string {
  if (id === 'today') return 'Today'
  if (id === 'this_week') return 'This week'
  if (id === 'last_week') return 'Last week'
  return 'Older'
}

function bucketDateRange(id: TimeBucketId, now = new Date()): string | null {
  if (id === 'today') {
    return now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  if (id === 'this_week') {
    const start = startOfLocalWeek(now)
    const end = addLocalDays(start, 6)
    return `${formatRangeDay(start)} – ${formatRangeDay(end)}`
  }
  if (id === 'last_week') {
    const start = addLocalDays(startOfLocalWeek(now), -7)
    const end = addLocalDays(start, 6)
    return `${formatRangeDay(start)} – ${formatRangeDay(end)}`
  }
  return null
}

function formatActivityWhen(iso: string, now = new Date()) {
  const at = new Date(iso)
  const today = startOfLocalDay(now)
  const yesterday = addLocalDays(today, -1)
  if (at >= today) {
    return at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (at >= yesterday) return 'Yesterday'
  if (at >= startOfLocalWeek(now)) {
    return at.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function entryId(entry: InboxMobileListEntry) {
  return entry.type === 'thread'
    ? entry.thread.id
    : inboxCoachRequestListId(entry.request.id)
}

type InboxMobileListProps = {
  role: 'athlete' | 'coach'
  entries: InboxMobileListEntry[]
  kind: InboxKindFilter
  onKindChange: (kind: InboxKindFilter) => void
  /** Which kind tabs have at least one unread thread. */
  kindUnread?: Record<InboxKindFilter, boolean>
  filter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
  athleteFilter: string
  onAthleteFilterChange: (id: string) => void
  athleteOptions: InboxAthleteOption[]
  pendingRequestCount: number
  pushConfigured: boolean
  coachParticipant: InboxParticipant
  athleteParticipant?: InboxParticipant
  onSelectEntry: (id: string) => void
  /** When set (Chat + one athlete), show this panel instead of the thread list. */
  directChat?: ReactNode
}

export function InboxMobileList({
  role,
  entries,
  kind,
  onKindChange,
  kindUnread,
  filter,
  onFilterChange,
  athleteFilter,
  onAthleteFilterChange,
  athleteOptions,
  pendingRequestCount,
  pushConfigured,
  coachParticipant,
  athleteParticipant,
  onSelectEntry,
  directChat,
}: InboxMobileListProps) {
  const [openBuckets, setOpenBuckets] = useState<Record<TimeBucketId, boolean>>({
    today: true,
    this_week: true,
    last_week: true,
    older: true,
  })
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const kindTabsRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const root = kindTabsRef.current
    if (!root) return

    function measure() {
      const el = kindTabsRef.current
      if (!el) return
      const active = el.querySelector<HTMLElement>('[data-active="true"]')
      if (!active) return
      const rootRect = el.getBoundingClientRect()
      const tabRect = active.getBoundingClientRect()
      setIndicator({
        left: tabRect.left - rootRect.left,
        width: tabRect.width,
        ready: true,
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [kind])

  const groups = useMemo(() => {
    const order: TimeBucketId[] = ['today', 'this_week', 'last_week', 'older']
    const map = new Map<TimeBucketId, InboxMobileListEntry[]>()
    for (const id of order) map.set(id, [])
    for (const entry of entries) {
      const id = bucketFor(entry.sortAt)
      map.get(id)!.push(entry)
    }
    return order
      .map((id) => ({
        id,
        label: bucketLabel(id),
        dateRange: bucketDateRange(id),
        items: map.get(id)!,
      }))
      .filter((g) => g.items.length > 0)
  }, [entries])

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.id === filter)?.label ??
    (filter === 'requests' ? 'Requests' : 'All')

  const statusChoices = STATUS_OPTIONS.filter(
    (o) => !o.coachOnly || (role === 'coach' && pendingRequestCount > 0),
  )

  return (
    <div
      className="tt-inbox-mobile lg:hidden"
      data-direct-chat={directChat ? 'true' : undefined}
    >
      <div className="tt-inbox-mobile-toolbar">
        <div className="relative shrink-0">
          <button
            type="button"
            className="tt-inbox-mobile-status-pill"
            aria-expanded={statusMenuOpen}
            aria-haspopup="listbox"
            onClick={() => setStatusMenuOpen((v) => !v)}
          >
            {statusLabel}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" strokeWidth={2.25} />
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
                className="absolute left-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] overflow-hidden rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] py-1 shadow-[var(--tt-shadow)]"
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

        {role === 'coach' && athleteOptions.length > 0 ? (
          <label className="min-w-0 flex-1">
            <span className="sr-only">Filter by athlete</span>
            <Select
              value={athleteFilter}
              onChange={(e) => onAthleteFilterChange(e.target.value)}
              className="tt-inbox-mobile-athlete-select"
            >
              <option value="all">All athletes</option>
              {athleteOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-1">
          <InboxNotificationsToggle pushConfigured={pushConfigured} compact />
          <button
            type="button"
            className="tt-inbox-mobile-icon-btn"
            aria-label="Open status filters"
            onClick={() => setStatusMenuOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={kindTabsRef}
        className="tt-inbox-mobile-kind-tabs"
        role="tablist"
        aria-label="Thread type"
      >
        {KIND_TABS.map((tab) => {
          const Icon = tab.icon
          const active = kind === tab.id
          const hasUnread = Boolean(kindUnread?.[tab.id])
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={
                hasUnread ? `${tab.label}, unread messages` : tab.label
              }
              className="tt-inbox-mobile-kind-tab"
              data-active={active ? 'true' : 'false'}
              data-unread={hasUnread ? 'true' : 'false'}
              onClick={() => onKindChange(tab.id)}
            >
              <span className="tt-inbox-mobile-kind-icon">
                <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
                {hasUnread ? (
                  <span className="tt-inbox-mobile-kind-unread-bubble" aria-hidden />
                ) : null}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
        <span
          className="tt-inbox-mobile-kind-indicator"
          aria-hidden
          data-ready={indicator.ready ? 'true' : 'false'}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
      </div>

      {directChat ? (
        <div className="tt-inbox-mobile-direct-chat">{directChat}</div>
      ) : entries.length === 0 ? (
        <p className="px-1 py-12 text-center text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          {filter === 'requests' ? 'No pending requests.' : 'No conversations here.'}
        </p>
      ) : (
        <div className="tt-inbox-mobile-groups">
          {groups.map((group) => {
            const expanded = openBuckets[group.id]
            return (
              <section key={group.id} className="tt-inbox-mobile-group">
                <button
                  type="button"
                  className="tt-inbox-mobile-group-header"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpenBuckets((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                >
                  <span className="tt-inbox-mobile-group-title">{group.label}</span>
                  <span className="tt-inbox-mobile-group-aside">
                    {group.dateRange ? (
                      <span className="tt-inbox-mobile-group-date">{group.dateRange}</span>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        'tt-inbox-mobile-group-chevron h-3.5 w-3.5',
                        expanded ? 'rotate-180' : 'rotate-0',
                      )}
                      strokeWidth={2}
                    />
                  </span>
                </button>
                <MobileAccordionBody expanded={expanded}>
                  <div className="tt-inbox-mobile-rows">
                    {group.items.map((entry) => (
                      <MobileInboxRow
                        key={entryId(entry)}
                        entry={entry}
                        role={role}
                        coachParticipant={coachParticipant}
                        athleteParticipant={athleteParticipant}
                        onSelect={() => onSelectEntry(entryId(entry))}
                      />
                    ))}
                  </div>
                </MobileAccordionBody>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MobileInboxRow({
  entry,
  role,
  coachParticipant,
  athleteParticipant,
  onSelect,
}: {
  entry: InboxMobileListEntry
  role: 'athlete' | 'coach'
  coachParticipant: InboxParticipant
  athleteParticipant?: InboxParticipant
  onSelect: () => void
}) {
  if (entry.type === 'request') {
    const request = entry.request
    const tone = kindTone('REQUEST')
    return (
      <button type="button" onClick={onSelect} className="tt-inbox-mobile-row" data-unread="true">
        <AthleteAvatar
          name={request.athlete.name}
          avatarUrl={request.athlete.avatarUrl}
          size="sm"
          className="tt-inbox-mobile-avatar !h-9 !w-9 shrink-0 !text-[11px]"
        />
        <div className="tt-inbox-mobile-row-main min-w-0 flex-1">
          <div className="tt-inbox-mobile-row-body min-w-0 flex-1">
            <div className="tt-inbox-mobile-row-top">
              <p className="tt-inbox-mobile-title">
                <span className="tt-inbox-mobile-kind" style={{ color: tone }}>
                  Request
                </span>
                <span className="tt-inbox-mobile-subject">{request.athlete.name}</span>
              </p>
              <span className="tt-inbox-mobile-when">{formatActivityWhen(request.createdAt)}</span>
            </div>
            <p className="tt-inbox-mobile-meta">
              <span className="tt-inbox-mobile-meta-name">Wants to connect as your athlete</span>
            </p>
            <p className="tt-inbox-mobile-preview">Approve or decline this coaching request</p>
          </div>
          <span className="tt-inbox-mobile-status" aria-hidden>
            <span className="tt-inbox-mobile-unread-dot" />
            <ChevronRight className="tt-inbox-mobile-row-chevron h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
      </button>
    )
  }

  const t = entry.thread
  const tone = kindTone(t.kind)
  const subject = threadSubject(t)
  const subjectDate = t.workout?.dateKey ?? t.race?.dateKey ?? null
  const threadAthlete: InboxParticipant = t.athlete
    ? { name: t.athlete.name, avatarUrl: t.athlete.avatarUrl }
    : athleteParticipant ?? { name: 'Athlete', avatarUrl: null }
  const partner = role === 'coach' ? threadAthlete : coachParticipant
  const athleteLine =
    role === 'coach' ? (t.athlete?.name ?? partner.name) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className="tt-inbox-mobile-row"
      data-unread={t.unread ? 'true' : 'false'}
    >
      <AthleteAvatar
        name={partner.name}
        avatarUrl={partner.avatarUrl}
        size="sm"
        className="tt-inbox-mobile-avatar !h-9 !w-9 shrink-0 !text-[11px]"
      />
      <div className="tt-inbox-mobile-row-main min-w-0 flex-1">
        <div className="tt-inbox-mobile-row-body min-w-0 flex-1">
          <div className="tt-inbox-mobile-row-top">
            <p className="tt-inbox-mobile-title">
              <span className="tt-inbox-mobile-kind" style={{ color: tone }}>
                {kindShortLabel(t.kind)}
              </span>
              <span className="tt-inbox-mobile-subject">{subject}</span>
            </p>
            <span className="tt-inbox-mobile-when">{formatActivityWhen(t.lastMessageAt)}</span>
          </div>
          {athleteLine || subjectDate ? (
            <p className="tt-inbox-mobile-meta">
              {athleteLine ? (
                <span className="tt-inbox-mobile-meta-name">{athleteLine}</span>
              ) : null}
              {athleteLine && subjectDate ? (
                <span className="tt-inbox-mobile-meta-sep" aria-hidden>
                  {' · '}
                </span>
              ) : null}
              {subjectDate ? (
                <span className="tt-inbox-mobile-meta-date">{formatSessionMeta(subjectDate)}</span>
              ) : null}
            </p>
          ) : null}
          <p className="tt-inbox-mobile-preview">{t.preview || 'No messages yet'}</p>
        </div>
        <span className="tt-inbox-mobile-status" aria-hidden>
          {t.unread ? <span className="tt-inbox-mobile-unread-dot" /> : null}
          <ChevronRight className="tt-inbox-mobile-row-chevron h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
    </button>
  )
}
