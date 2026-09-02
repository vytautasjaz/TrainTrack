/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from 'react'
import { CoachingAuthorRole, CoachingThreadKind, CoachingThreadStatus, type RacePriority } from '@prisma/client'
import { Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import { WorkoutDetailSidePanel } from '@/components/plan/workout-detail-side-panel'
import { PlanWorkoutDataCard } from '@/components/plan/plan-workout-data-card'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { parseDateOnly } from '@/lib/dates'
import { markCoachingThreadUnread } from '@/app/actions/coaching-inbox'
import { InboxNotificationsToggle } from '@/components/inbox/inbox-notifications-toggle'
import { refreshInboxUnreadBadge } from '@/components/layout/inbox-nav-badge'
import { markInboxThreadReadClient, clearInboxThreadReadClient } from '@/lib/inbox-mark-read-client'
import {
  InboxRaceReportSummary,
  type InboxRaceReportLeg,
} from '@/components/inbox/inbox-race-report-summary'
import { isRaceReportCardDuplicateMessage } from '@/lib/race-feedback-report'
import {
  INBOX_DEFAULT_PAGE_SIZE,
  INBOX_PAGE_SIZES,
  type InboxFilter,
  type InboxKindFilter,
  type InboxPageSize,
} from '@/lib/coaching-inbox-shared'

export type InboxThreadListItem = {
  id: string
  kind: CoachingThreadKind
  status: CoachingThreadStatus
  lastMessageAt: string
  unread: boolean
  needsReply: boolean
  preview: string
  lastAuthorRole: string | null
  athlete: { id: string; name: string; avatarUrl: string | null } | null
  workout: {
    id: string
    title: string
    dateKey: string
    type: keyof typeof WORKOUT_TYPE_LABELS
    plannedDistance: number | null
    plannedDuration: number | null
    status: string
  } | null
  workoutDetail: PlanWorkoutDetail | null
  race: {
    id: string
    name: string
    dateKey: string
    type: keyof typeof RACE_TYPE_LABELS
    priority?: RacePriority | null
    outcome: string | null
    resultTime: string | null
    resultPlace: string | null
    resultNotes: string | null
    legs?: InboxRaceReportLeg[]
  } | null
  messageCount: number
  messages: CoachingThreadView['messages']
}

const KINDS: { id: InboxKindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'GENERAL', label: 'General chat' },
  { id: 'ASK', label: 'Asks' },
  { id: 'FEEDBACK', label: 'Feedback' },
  { id: 'RACE_REPORT', label: 'Races' },
]

function kindLabel(kind: CoachingThreadKind) {
  if (kind === CoachingThreadKind.GENERAL) return 'General'
  if (kind === CoachingThreadKind.ASK) return 'Ask'
  if (kind === CoachingThreadKind.FEEDBACK) return 'Feedback'
  return 'Race'
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatSessionDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function threadRowTitle(t: InboxThreadListItem, role: 'athlete' | 'coach') {
  const subject = t.workout?.title ?? t.race?.name ?? 'General chat'
  const subjectDate = t.workout?.dateKey ?? t.race?.dateKey ?? null
  if (role === 'coach' && t.athlete) {
    return {
      subject,
      subjectDate,
      athleteName: t.athlete.name,
      kind: kindLabel(t.kind),
    }
  }
  return {
    subject,
    subjectDate,
    athleteName: null as string | null,
    kind: kindLabel(t.kind),
  }
}

type InboxParticipant = {
  name: string
  avatarUrl: string | null
}

function threadConversationPartner(
  role: 'athlete' | 'coach',
  coach: InboxParticipant,
  athlete: InboxParticipant,
): InboxParticipant {
  return role === 'coach' ? athlete : coach
}

function InboxFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? 'true' : 'false'}
      className="tt-inbox-filter-btn"
    >
      {children}
    </button>
  )
}

function threadMatchesFilters(
  t: InboxThreadListItem,
  opts: {
    filter: InboxFilter
    kind: InboxKindFilter
    role: 'athlete' | 'coach'
    athleteFilter: string
    unreadSessionIds?: Set<string> | null
  },
) {
  if (opts.kind !== 'all' && t.kind !== opts.kind) return false
  if (opts.role === 'coach' && opts.athleteFilter !== 'all' && t.athlete?.id !== opts.athleteFilter) {
    return false
  }
  if (opts.filter === 'unread') {
    if (opts.unreadSessionIds?.has(t.id)) return true
    return t.unread
  }
  return true
}

const INITIAL_FILTER: InboxFilter = 'all'
const INITIAL_KIND: InboxKindFilter = 'all'
const LG_QUERY = '(min-width: 1024px)'

function subscribeLg(onChange: () => void) {
  const mq = window.matchMedia(LG_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getLgSnapshot() {
  return window.matchMedia(LG_QUERY).matches
}

function useIsLg() {
  return useSyncExternalStore(subscribeLg, getLgSnapshot, () => true)
}

function scrollWithChromeOffset(target: HTMLElement) {
  const chrome = document.querySelector<HTMLElement>('[data-app-sticky-chrome]')
  const offset = (chrome?.getBoundingClientRect().height ?? 56) + 8
  const top = window.scrollY + target.getBoundingClientRect().top - offset
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

function InboxThreadDetail({
  selected,
  role,
  holdUnreadId,
  isPendingRead,
  onMarkUnread,
  onOpenWorkout,
  onMessageSent,
  embedded = false,
  dockComposer = false,
}: {
  selected: InboxThreadListItem
  role: 'athlete' | 'coach'
  holdUnreadId: string | null
  isPendingRead: boolean
  onMarkUnread: (threadId: string) => void
  onOpenWorkout: () => void
  onMessageSent: (body: string) => void
  /** Mobile accordion sits under the list row — skip repeating that header. */
  embedded?: boolean
  dockComposer?: boolean
}) {
  const [workoutPanelCollapsed, setWorkoutPanelCollapsed] = useState(false)
  const rowTitle = threadRowTitle(selected, role)
  const detailTitle = `${rowTitle.kind} · ${rowTitle.subject}`

  const isWorkoutThread = Boolean(
    selected.workoutDetail &&
      !selected.workoutDetail.isRace &&
      (selected.kind === CoachingThreadKind.ASK || selected.kind === CoachingThreadKind.FEEDBACK),
  )
  const showWorkoutSplit = dockComposer && !embedded && isWorkoutThread && selected.workoutDetail

  useEffect(() => {
    setWorkoutPanelCollapsed(false)
  }, [selected.id])

  let threadContext: ReactNode = null
  if (selected.race) {
    threadContext = (
      <InboxRaceReportSummary
        race={selected.race}
        dateLabel={formatSessionDate(selected.race.dateKey)}
      />
    )
  } else if (!showWorkoutSplit && selected.workoutDetail) {
    threadContext = (
      <div className="space-y-2">
        {role !== 'coach' ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
            {kindLabel(selected.kind)} about this workout
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
          <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>{formatSessionDate(selected.workoutDetail.dateKey)}</span>
        </p>
        <button
          type="button"
          className="w-full min-w-0 max-w-full text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpenWorkout}
          aria-label={`Open workout ${selected.workoutDetail.title}`}
        >
          <PlanWorkoutDataCard
            workout={selected.workoutDetail}
            density="list"
            isCoach={role === 'coach'}
            className="pointer-events-none max-w-full shadow-sm"
          />
        </button>
        <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">Tap the card to open the workout</p>
      </div>
    )
  } else if (!embedded && selected.workout) {
    threadContext = (
      <div className="rounded-[6px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={WORKOUT_TYPE_COLORS[selected.workout.type]}>
            {WORKOUT_TYPE_LABELS[selected.workout.type]}
          </Badge>
          <h2 className="text-base font-semibold">{selected.workout.title}</h2>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
          <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>{formatSessionDate(selected.workout.dateKey)}</span>
        </p>
      </div>
    )
  }

  const filteredMessages =
    selected.race
      ? selected.messages.filter(
          (m) =>
            !(
              m.authorRole === CoachingAuthorRole.ATHLETE &&
              isRaceReportCardDuplicateMessage(m.body, selected.race)
            ),
        )
      : selected.messages

  const threadPanel = (
    <CoachingThreadPanel
      className={cn(
        showWorkoutSplit ? 'min-h-0 min-w-0 flex-1 overflow-hidden' : dockComposer ? 'mt-4 min-h-0 flex-1 overflow-hidden' : embedded ? 'mt-3' : 'mt-4',
      )}
      scrollPrefix={dockComposer && !showWorkoutSplit ? threadContext : undefined}
      thread={{
        id: selected.id,
        status: selected.status,
        kind: selected.kind,
        messages: filteredMessages,
      }}
      role={role}
      dockComposer={dockComposer}
      skipAutoRead={holdUnreadId === selected.id}
      composerFooter={
        holdUnreadId !== selected.id ? (
          <button
            type="button"
            disabled={isPendingRead}
            onClick={() => onMarkUnread(selected.id)}
            className="text-[11px] font-medium text-[var(--tt-ink-faint,#9a9a9a)] transition hover:text-[var(--tt-ink-soft,#6b6b6b)] disabled:opacity-60"
          >
            Mark as unread
          </button>
        ) : null
      }
      onMessageSent={(body) => onMessageSent(body)}
    />
  )

  return (
    <div
      className={cn(
        'min-w-0 max-w-full',
        dockComposer && 'flex min-h-0 flex-1 flex-col overflow-hidden',
        showWorkoutSplit && '-ml-5 -mb-5 min-h-0 flex-1',
      )}
    >
      {!embedded && !showWorkoutSplit ? (
        <div className="shrink-0">
          <p className="text-sm font-semibold text-[var(--tt-ink,#111)]">{detailTitle}</p>
          {rowTitle.subjectDate ? (
            <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
              {formatSessionDate(rowTitle.subjectDate)}
              {rowTitle.athleteName ? ` · ${rowTitle.athleteName}` : ''}
            </p>
          ) : rowTitle.athleteName ? (
            <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
              {rowTitle.athleteName}
            </p>
          ) : null}
        </div>
      ) : null}

      {!dockComposer && threadContext ? (
        <div className="mt-4 shrink-0">{threadContext}</div>
      ) : null}

      {showWorkoutSplit ? (
        <div
          className="tt-inbox-workout-split"
          data-workout-collapsed={workoutPanelCollapsed ? 'true' : undefined}
        >
          <div className="tt-inbox-workout-split-chat px-4 pb-4 pt-3">
            <p className="shrink-0 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
              {kindLabel(selected.kind)}
              {rowTitle.athleteName ? (
                <span className="font-medium normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
                  {' · '}
                  {rowTitle.athleteName}
                </span>
              ) : null}
            </p>
            {threadPanel}
          </div>
          <div className="tt-inbox-workout-split-workout">
            <WorkoutDetailSidePanel
              workout={selected.workoutDetail!}
              isCoach={role === 'coach'}
              collapsed={workoutPanelCollapsed}
              flushEdge
              onExpand={() => setWorkoutPanelCollapsed(false)}
              onCollapse={() => setWorkoutPanelCollapsed(true)}
            />
          </div>
        </div>
      ) : (
        threadPanel
      )}
    </div>
  )
}

type InboxAthleteOption = InboxParticipant & { id: string }

type InboxClientProps = {
  role: 'athlete' | 'coach'
  threads: InboxThreadListItem[]
  coachParticipant: InboxParticipant
  athleteParticipant?: InboxParticipant
  coachAthletes?: InboxAthleteOption[]
  pendingRequestsSlot?: React.ReactNode
  pushConfigured?: boolean
}

export function InboxClient({
  role,
  threads,
  coachParticipant,
  athleteParticipant,
  coachAthletes = [],
  pendingRequestsSlot,
  pushConfigured = false,
}: InboxClientProps) {
  const [filter, setFilter] = useState<InboxFilter>(INITIAL_FILTER)
  const [kind, setKind] = useState<InboxKindFilter>(INITIAL_KIND)
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const openedReadIds = useRef(new Set<string>())
  const [items, setItems] = useState(() => {
    const first = threads.find((t) =>
      threadMatchesFilters(t, {
        filter: INITIAL_FILTER,
        kind: INITIAL_KIND,
        role,
        athleteFilter: 'all',
      }),
    )
    if (!first) return threads
    openedReadIds.current.add(first.id)
    return threads.map((t) => (t.id === first.id ? { ...t, unread: false } : t))
  })
  const [selectedId, setSelectedId] = useState<string | null>(
    () => [...openedReadIds.current][0] ?? null,
  )
  const [workoutModal, setWorkoutModal] = useState<PlanWorkoutDetail | null>(null)
  const [holdUnreadId, setHoldUnreadId] = useState<string | null>(null)
  const [isPendingRead, startReadTransition] = useTransition()
  const [pageSize, setPageSize] = useState<InboxPageSize>(INBOX_DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [unreadSessionIds, setUnreadSessionIds] = useState<Set<string> | null>(null)
  const isLg = useIsLg()
  const filtersRef = useRef<HTMLDivElement>(null)
  const listItemRefs = useRef(new Map<string, HTMLDivElement>())

  const athleteOptions = useMemo(() => {
    if (coachAthletes.length > 0) {
      return [...coachAthletes].sort((a, b) => a.name.localeCompare(b.name))
    }
    const map = new Map<string, InboxAthleteOption>()
    for (const t of items) {
      if (t.athlete) map.set(t.athlete.id, t.athlete)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [coachAthletes, items])

  useEffect(() => {
    void refreshInboxUnreadBadge()
  }, [])

  useEffect(() => {
    setItems((prev) => {
      const prevById = new Map(prev.map((t) => [t.id, t]))
      let changed = false
      const merged = threads.map((server) => {
        const local = prevById.get(server.id)
        if (!local) {
          changed = true
          return server
        }

        const localNewer =
          local.messageCount > server.messageCount ||
          new Date(local.lastMessageAt).getTime() > new Date(server.lastMessageAt).getTime()
        if (localNewer) {
          const next = {
            ...local,
            workoutDetail: server.workoutDetail ?? local.workoutDetail,
            athlete: server.athlete ?? local.athlete,
          }
          if (
            next.workoutDetail !== local.workoutDetail ||
            next.athlete !== local.athlete
          ) {
            changed = true
            return next
          }
          return local
        }

        const sameActivity =
          local.messageCount === server.messageCount &&
          local.lastMessageAt === server.lastMessageAt
        if (sameActivity) {
          const unread =
            holdUnreadId === server.id
              ? true
              : openedReadIds.current.has(server.id)
                ? false
                : server.unread
          if (
            unread === local.unread &&
            local.messageCount === server.messageCount &&
            local.lastMessageAt === server.lastMessageAt &&
            local.status === server.status
          ) {
            return local
          }
          changed = true
          return {
            ...server,
            unread,
            messages: local.messages.length ? local.messages : server.messages,
            workoutDetail: server.workoutDetail ?? local.workoutDetail,
            athlete: server.athlete ?? local.athlete,
          }
        }

        openedReadIds.current.delete(server.id)
        changed = true
        return server
      })
      const serverIds = new Set(threads.map((t) => t.id))
      const onlyLocal = prev.filter((t) => !serverIds.has(t.id))
      if (onlyLocal.length) changed = true
      if (!changed && merged.length === prev.length) return prev
      return [...merged, ...onlyLocal].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      )
    })
  }, [threads, holdUnreadId])

  useEffect(() => {
    setWorkoutModal(null)
  }, [selectedId])

  useEffect(() => {
    if (holdUnreadId && holdUnreadId !== selectedId) setHoldUnreadId(null)
  }, [selectedId, holdUnreadId])

  useEffect(() => {
    if (!selectedId || holdUnreadId === selectedId) return
    openedReadIds.current.add(selectedId)
    setItems((prev) => {
      let changed = false
      const next = prev.map((t) => {
        if (t.id !== selectedId || !t.unread) return t
        changed = true
        return { ...t, unread: false }
      })
      return changed ? next : prev
    })
    void markInboxThreadReadClient(selectedId)
  }, [selectedId, holdUnreadId])

  const filtered = useMemo(() => {
    const list = items.filter((t) =>
      threadMatchesFilters(t, { filter, kind, role, athleteFilter, unreadSessionIds }),
    )

    return [...list].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    )
  }, [items, filter, kind, role, athleteFilter, unreadSessionIds])

  useEffect(() => {
    if (filter !== 'unread') {
      setUnreadSessionIds((prev) => (prev == null ? prev : null))
      return
    }
    setUnreadSessionIds((prev) => {
      const next = new Set(prev ?? [])
      let changed = prev == null
      for (const t of items) {
        if (t.unread && !next.has(t.id)) {
          next.add(t.id)
          changed = true
        }
      }
      if (!changed && prev) return prev
      return next
    })
  }, [filter, items])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [filter, kind, athleteFilter, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(() => {
    if (!selectedId) return
    if (filtered.some((t) => t.id === selectedId)) return
    setSelectedId(filtered[0]?.id ?? null)
  }, [filtered, selectedId])

  const selected = selectedId ? (items.find((t) => t.id === selectedId) ?? null) : null

  const unreadCount = useMemo(() => items.filter((t) => t.unread).length, [items])

  function selectThread(threadId: string) {
    if (!isLg && selectedId === threadId) {
      setSelectedId(null)
      return
    }
    setHoldUnreadId(null)
    openedReadIds.current.add(threadId)
    setSelectedId(threadId)
    if (filter === 'unread') {
      setUnreadSessionIds((prev) => {
        const next = new Set(prev ?? [])
        next.add(threadId)
        return next
      })
    }
    setItems((prev) => {
      let changed = false
      const next = prev.map((t) => {
        if (t.id !== threadId || !t.unread) return t
        changed = true
        return { ...t, unread: false }
      })
      return changed ? next : prev
    })
    // Panel also marks read when mounted; shared client helper dedupes.
    if (!isLg) {
      requestAnimationFrame(() => {
        const card = listItemRefs.current.get(threadId)
        if (card) scrollWithChromeOffset(card)
      })
    }
  }

  function applyOptimisticSend(threadId: string, body: string) {
    const now = new Date().toISOString()
    const authorRole =
      role === 'coach' ? CoachingAuthorRole.COACH : CoachingAuthorRole.ATHLETE
    setItems((prev) => {
      const next = prev.map((t) => {
        if (t.id !== threadId) return t
        return {
          ...t,
          status: CoachingThreadStatus.OPEN,
          lastMessageAt: now,
          preview: body.slice(0, 140),
          lastAuthorRole: authorRole,
          unread: false,
          needsReply: false,
          messageCount: t.messageCount + 1,
          messages: [
            ...t.messages,
            {
              id: `optimistic-${now}`,
              authorRole,
              kind: 'CHAT' as const,
              body,
              createdAt: now,
            },
          ],
        }
      })
      return [...next].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      )
    })
    setSelectedId(threadId)
    setHoldUnreadId(null)
    openedReadIds.current.add(threadId)
  }

  function markUnread(threadId: string) {
    openedReadIds.current.delete(threadId)
    clearInboxThreadReadClient(threadId)
    if (threadId === selectedId) setHoldUnreadId(threadId)
    setItems((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: true } : t)))
    const formData = new FormData()
    formData.set('threadId', threadId)
    startReadTransition(async () => {
      try {
        await markCoachingThreadUnread(formData)
        await refreshInboxUnreadBadge()
      } catch {
        openedReadIds.current.add(threadId)
        if (threadId === selectedId) setHoldUnreadId(null)
        setItems((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: false } : t)))
      }
    })
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {pendingRequestsSlot}

      <div
        ref={filtersRef}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <InboxFilterButton active={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </InboxFilterButton>
          <InboxFilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </InboxFilterButton>
          {role === 'coach' && athleteOptions.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <label htmlFor="inbox-athlete-filter" className="sr-only">
                Filter by athlete
              </label>
              <Select
                id="inbox-athlete-filter"
                value={athleteFilter}
                onChange={(e) => setAthleteFilter(e.target.value)}
                className="h-8 min-w-[9rem] rounded-[6px] border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-2 py-0 text-[12px] font-medium text-[var(--tt-ink,#111)]"
              >
                <option value="all">All athletes</option>
                {athleteOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <InboxNotificationsToggle pushConfigured={pushConfigured} />
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={cn(
                  'rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition',
                  kind === k.id
                    ? 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)]'
                    : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tt-inbox-shell">
        <div className="tt-inbox-list">
          <div className="tt-inbox-list-header">
            <span className="tt-inbox-list-header-label">Threads</span>
            <span className="tt-inbox-list-header-count">{filtered.length}</span>
          </div>
          <div className="tt-inbox-list-scroll">
          {filtered.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
              No conversations here.
            </p>
          ) : (
            <div className="tt-inbox-list-items">
              {paged.map((t) => {
                const active = selected?.id === t.id
                const row = threadRowTitle(t, role)
                const threadAthlete: InboxParticipant = t.athlete
                  ? { name: t.athlete.name, avatarUrl: t.athlete.avatarUrl }
                  : athleteParticipant ?? { name: 'Athlete', avatarUrl: null }
                const conversationPartner = threadConversationPartner(
                  role,
                  coachParticipant,
                  threadAthlete,
                )
                return (
                  <div
                    key={t.id}
                    ref={(el) => {
                      if (el) listItemRefs.current.set(t.id, el)
                      else listItemRefs.current.delete(t.id)
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectThread(t.id)}
                      aria-expanded={active}
                      data-active={active ? 'true' : 'false'}
                      data-unread={t.unread ? 'true' : 'false'}
                      className="tt-inbox-list-row"
                    >
                      <div className="flex gap-3">
                        <AthleteAvatar
                          name={conversationPartner.name}
                          avatarUrl={conversationPartner.avatarUrl}
                          size="sm"
                          className="!h-8 !w-8 shrink-0 !text-[11px] pt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
                                  {row.kind}
                                </span>
                                <p
                                  className={cn(
                                    'min-w-0 truncate text-sm text-[var(--tt-ink,#111)]',
                                    t.unread ? 'font-semibold' : 'font-medium',
                                  )}
                                >
                                  {row.subject}
                                </p>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                                {row.athleteName ? `${row.athleteName} · ` : ''}
                                {row.subjectDate ? formatSessionDate(row.subjectDate) : 'No date'}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {t.unread ? <span className="tt-inbox-unread-badge">1</span> : null}
                              <span className="text-[10px] uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
                                {formatWhen(t.lastMessageAt)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 truncate text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                            {t.preview}
                          </p>
                        </div>
                      </div>
                    </button>
                    {!t.unread && !active ? (
                      <button
                        type="button"
                        disabled={isPendingRead}
                        onClick={() => markUnread(t.id)}
                        aria-label="Mark conversation as unread"
                        title="Mark as unread"
                        className="px-4 pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)] transition hover:text-[var(--tt-ink-soft,#6b6b6b)] disabled:opacity-60"
                      >
                        Mark unread
                      </button>
                    ) : null}
                    {active && selected && !isLg ? (
                      <div className="flex max-h-[min(60vh,28rem)] min-h-[16rem] flex-col overflow-hidden border-t border-[var(--tt-line,#ebebeb)] px-4 py-3">
                        <InboxThreadDetail
                          selected={selected}
                          role={role}
                          holdUnreadId={holdUnreadId}
                          isPendingRead={isPendingRead}
                          onMarkUnread={markUnread}
                          onOpenWorkout={() => {
                            if (selected.workoutDetail) setWorkoutModal(selected.workoutDetail)
                          }}
                          onMessageSent={(body) => applyOptimisticSend(selected.id, body)}
                          embedded
                          dockComposer
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
          </div>
          {filtered.length > 0 ? (
            <div className="tt-inbox-list-footer flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="pr-1 text-[10px] font-medium uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
                  Show
                </span>
                {INBOX_PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    className={cn(
                      'rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition',
                      pageSize === size
                        ? 'bg-[var(--tt-ink,#111)] text-white'
                        : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                <span>
                  {rangeStart}–{rangeEnd} of {filtered.length}
                </span>
                {pageCount > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-[5px] p-0.5 transition hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="tabular-nums">
                      {safePage}/{pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="rounded-[5px] p-0.5 transition hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="tt-inbox-detail hidden lg:flex">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--tt-ink-soft,#6b6b6b)]">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <div className="tt-inbox-detail-inner">
              <InboxThreadDetail
                selected={selected}
                role={role}
                holdUnreadId={holdUnreadId}
                isPendingRead={isPendingRead}
                onMarkUnread={markUnread}
                onOpenWorkout={() => {
                  if (selected.workoutDetail) setWorkoutModal(selected.workoutDetail)
                }}
                onMessageSent={(body) => {
                  applyOptimisticSend(selected.id, body)
                  void refreshInboxUnreadBadge()
                }}
                dockComposer
              />
            </div>
          )}
        </div>
      </div>

      {workoutModal ? (
        <PlanWorkoutModal
          workout={workoutModal}
          isCoach={role === 'coach'}
          open
          onOpenChange={(open) => {
            if (!open) setWorkoutModal(null)
          }}
        />
      ) : null}
    </div>
  )
}
