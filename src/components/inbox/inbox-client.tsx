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
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header'
import { InboxComposeGeneralChatButton } from '@/components/inbox/inbox-compose-general-chat-button'
import { InboxMobileHeaderActions } from '@/components/inbox/inbox-mobile-header-actions'
import { InboxMobileList } from '@/components/inbox/inbox-mobile-list'
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
import { InboxCoachRequestDetail } from '@/components/inbox/inbox-coach-request-detail'
import { isRaceReportCardDuplicateMessage } from '@/lib/race-feedback-report'
import {
  inboxCoachRequestListId,
  isInboxCoachRequestListId,
  parseInboxCoachRequestListId,
  type InboxCoachRequest,
} from '@/lib/inbox-coach-requests'
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

type InboxListEntry =
  | { type: 'thread'; thread: InboxThreadListItem; sortAt: string }
  | { type: 'request'; request: InboxCoachRequest; sortAt: string }

function inboxListEntryId(entry: InboxListEntry): string {
  return entry.type === 'thread'
    ? entry.thread.id
    : inboxCoachRequestListId(entry.request.id)
}

function filterCoachRequests(
  requests: InboxCoachRequest[],
  opts: { filter: InboxFilter; kind: InboxKindFilter; role: 'athlete' | 'coach'; athleteFilter: string },
): InboxCoachRequest[] {
  if (opts.role !== 'coach') return []
  if (opts.filter !== 'all' && opts.filter !== 'unread' && opts.filter !== 'requests') {
    return []
  }
  if (opts.filter !== 'requests' && opts.kind !== 'all') return []

  let list = requests
  if (opts.athleteFilter !== 'all') {
    list = list.filter((request) => request.athlete.id === opts.athleteFilter)
  }
  return list
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
  if (opts.filter === 'requests') return false
  if (opts.kind !== 'all' && t.kind !== opts.kind) return false
  if (opts.role === 'coach' && opts.athleteFilter !== 'all' && t.athlete?.id !== opts.athleteFilter) {
    return false
  }
  // Coach: hide empty general chats from lists; still available via Chat + specific athlete.
  if (
    opts.role === 'coach' &&
    t.kind === CoachingThreadKind.GENERAL &&
    t.messageCount === 0 &&
    (opts.kind !== 'GENERAL' || opts.athleteFilter === 'all')
  ) {
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
  allowWorkoutSplit = true,
  hideTitle = false,
}: {
  selected: InboxThreadListItem
  role: 'athlete' | 'coach'
  holdUnreadId: string | null
  isPendingRead: boolean
  onMarkUnread: (threadId: string) => void
  onOpenWorkout: () => void
  onMessageSent: (body: string) => void
  /** Compact context — skip repeating list-row chrome. */
  embedded?: boolean
  dockComposer?: boolean
  /** Desktop only: side-by-side workout panel. Mobile stacks the workout card. */
  allowWorkoutSplit?: boolean
  /** When a mobile back header already shows the title. */
  hideTitle?: boolean
}) {
  const [workoutPanelCollapsed, setWorkoutPanelCollapsed] = useState(false)
  const rowTitle = threadRowTitle(selected, role)
  const detailTitle = `${rowTitle.kind} · ${rowTitle.subject}`

  const isWorkoutThread = Boolean(
    selected.workoutDetail &&
      !selected.workoutDetail.isRace &&
      (selected.kind === CoachingThreadKind.ASK || selected.kind === CoachingThreadKind.FEEDBACK),
  )
  const showWorkoutSplit =
    dockComposer &&
    !embedded &&
    allowWorkoutSplit &&
    isWorkoutThread &&
    selected.workoutDetail

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
        showWorkoutSplit
          ? 'min-h-0 min-w-0 flex-1 overflow-hidden'
          : dockComposer
            ? cn('min-h-0 flex-1 overflow-hidden', !hideTitle && 'mt-4')
            : embedded
              ? 'mt-3'
              : 'mt-4',
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
      {!embedded && !showWorkoutSplit && !hideTitle ? (
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
  coachingRequests?: InboxCoachRequest[]
  coachingCode?: string | null
  pushConfigured?: boolean
  /** Deep-link from `/inbox?thread=` (notification click / home attention). */
  initialThreadId?: string | null
}

function resolveInitialSelectedId(opts: {
  threads: InboxThreadListItem[]
  coachingRequests: InboxCoachRequest[]
  role: 'athlete' | 'coach'
  initialThreadId?: string | null
}) {
  if (
    opts.initialThreadId &&
    opts.threads.some((t) => t.id === opts.initialThreadId)
  ) {
    return opts.initialThreadId
  }
  const firstThread = opts.threads.find((t) =>
    threadMatchesFilters(t, {
      filter: INITIAL_FILTER,
      kind: INITIAL_KIND,
      role: opts.role,
      athleteFilter: 'all',
    }),
  )
  if (firstThread) return firstThread.id
  const firstRequest = opts.coachingRequests[0]
  if (firstRequest && opts.role === 'coach') {
    return inboxCoachRequestListId(firstRequest.id)
  }
  return null
}

export function InboxClient({
  role,
  threads,
  coachParticipant,
  athleteParticipant,
  coachAthletes = [],
  coachingRequests = [],
  coachingCode = null,
  pushConfigured = false,
  initialThreadId = null,
}: InboxClientProps) {
  const [filter, setFilter] = useState<InboxFilter>(INITIAL_FILTER)
  const [kind, setKind] = useState<InboxKindFilter>(INITIAL_KIND)
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const openedReadIds = useRef(new Set<string>())
  /** Keep compose-opened threads selected even if hidden by current filters. */
  const holdSelectedOutsideFilterRef = useRef(false)
  const deepLinkAppliedRef = useRef<string | null>(
    initialThreadId && threads.some((t) => t.id === initialThreadId) ? initialThreadId : null,
  )
  const [items, setItems] = useState(threads)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialSelectedId({ threads, coachingRequests, role, initialThreadId }),
  )
  const [mobileDetailOpen, setMobileDetailOpen] = useState(() =>
    Boolean(initialThreadId && threads.some((t) => t.id === initialThreadId)),
  )
  const [workoutModal, setWorkoutModal] = useState<PlanWorkoutDetail | null>(null)
  const [holdUnreadId, setHoldUnreadId] = useState<string | null>(null)
  const [isPendingRead, startReadTransition] = useTransition()
  const [pageSize, setPageSize] = useState<InboxPageSize>(INBOX_DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [unreadSessionIds, setUnreadSessionIds] = useState<Set<string> | null>(null)
  const isLg = useIsLg()
  const filtersRef = useRef<HTMLDivElement>(null)

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

  // Notification / attention deep-link: `/inbox?thread=<id>`
  useEffect(() => {
    const raw = initialThreadId
    if (!raw || !/^[a-zA-Z0-9_-]+$/.test(raw)) return
    if (deepLinkAppliedRef.current === raw) return
    if (!items.some((t) => t.id === raw)) return
    deepLinkAppliedRef.current = raw
    holdSelectedOutsideFilterRef.current = true
    setHoldUnreadId(null)
    openedReadIds.current.add(raw)
    setSelectedId(raw)
    if (!isLg) setMobileDetailOpen(true)
    setItems((prev) => {
      let changed = false
      const next = prev.map((t) => {
        if (t.id !== raw || !t.unread) return t
        changed = true
        return { ...t, unread: false }
      })
      return changed ? next : prev
    })
  }, [initialThreadId, items, isLg])

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

  const shouldMarkSelectedRead =
    Boolean(selectedId) &&
    holdUnreadId !== selectedId &&
    (isLg || mobileDetailOpen)

  useEffect(() => {
    if (!shouldMarkSelectedRead || !selectedId) return
    if (isInboxCoachRequestListId(selectedId)) return
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
  }, [shouldMarkSelectedRead, selectedId])

  useEffect(() => {
    if (isLg || !mobileDetailOpen) {
      document.documentElement.removeAttribute('data-inbox-mobile-detail')
      return
    }
    document.documentElement.setAttribute('data-inbox-mobile-detail', 'true')
    return () => {
      document.documentElement.removeAttribute('data-inbox-mobile-detail')
    }
  }, [isLg, mobileDetailOpen])

  useEffect(() => {
    if (isLg) {
      document.documentElement.style.removeProperty('--tt-inbox-thread-top')
      return
    }

    function syncThreadTop() {
      const chrome = document.querySelector<HTMLElement>('[data-app-sticky-chrome]')
      const top = chrome ? Math.round(chrome.getBoundingClientRect().bottom) : 52
      document.documentElement.style.setProperty('--tt-inbox-thread-top', `${top}px`)
    }

    syncThreadTop()
    window.addEventListener('resize', syncThreadTop)
    window.visualViewport?.addEventListener('resize', syncThreadTop)
    return () => {
      document.documentElement.style.removeProperty('--tt-inbox-thread-top')
      window.removeEventListener('resize', syncThreadTop)
      window.visualViewport?.removeEventListener('resize', syncThreadTop)
    }
  }, [isLg])

  useEffect(() => {
    if (isLg) setMobileDetailOpen(false)
  }, [isLg])

  const filteredRequests = useMemo(
    () =>
      filterCoachRequests(coachingRequests, { filter, kind, role, athleteFilter }),
    [coachingRequests, filter, kind, role, athleteFilter],
  )

  const filtered = useMemo(() => {
    const threadList =
      filter === 'requests'
        ? []
        : items.filter((t) =>
            threadMatchesFilters(t, { filter, kind, role, athleteFilter, unreadSessionIds }),
          )

    const entries: InboxListEntry[] = [
      ...threadList.map((thread) => ({
        type: 'thread' as const,
        thread,
        sortAt: thread.lastMessageAt,
      })),
      ...filteredRequests.map((request) => ({
        type: 'request' as const,
        request,
        sortAt: request.createdAt,
      })),
    ]

    return entries.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    )
  }, [items, filter, kind, role, athleteFilter, unreadSessionIds, filteredRequests])

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
  }, [filter, kind, athleteFilter, pageSize, coachingRequests.length])

  useEffect(() => {
    holdSelectedOutsideFilterRef.current = false
  }, [filter, kind, athleteFilter])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(() => {
    if (!selectedId) return
    if (filtered.some((entry) => inboxListEntryId(entry) === selectedId)) {
      holdSelectedOutsideFilterRef.current = false
      return
    }
    if (
      holdSelectedOutsideFilterRef.current &&
      !isInboxCoachRequestListId(selectedId) &&
      items.some((t) => t.id === selectedId)
    ) {
      return
    }
    holdSelectedOutsideFilterRef.current = false
    const nextId = filtered[0] ? inboxListEntryId(filtered[0]) : null
    setSelectedId(nextId)
    if (!nextId) setMobileDetailOpen(false)
  }, [filtered, selectedId, items])

  const selectedRequest = useMemo(() => {
    if (!selectedId || !isInboxCoachRequestListId(selectedId)) return null
    const linkId = parseInboxCoachRequestListId(selectedId)
    if (!linkId) return null
    return coachingRequests.find((request) => request.id === linkId) ?? null
  }, [selectedId, coachingRequests])

  const selected =
    selectedRequest || !selectedId
      ? null
      : (items.find((t) => t.id === selectedId) ?? null)

  const unreadCount = useMemo(() => items.filter((t) => t.unread).length, [items])
  const pendingRequestCount = useMemo(() => {
    if (role !== 'coach') return 0
    if (athleteFilter === 'all') return coachingRequests.length
    return coachingRequests.filter((request) => request.athlete.id === athleteFilter).length
  }, [coachingRequests, athleteFilter, role])

  /** Unread dots on All / Chat / Asks / … — scoped to current athlete filter. */
  const kindUnread = useMemo(() => {
    const flags: Record<InboxKindFilter, boolean> = {
      all: false,
      GENERAL: false,
      ASK: false,
      FEEDBACK: false,
      RACE_REPORT: false,
    }
    for (const t of items) {
      if (!t.unread) continue
      if (role === 'coach' && athleteFilter !== 'all' && t.athlete?.id !== athleteFilter) {
        continue
      }
      if (
        role === 'coach' &&
        t.kind === CoachingThreadKind.GENERAL &&
        t.messageCount === 0
      ) {
        continue
      }
      flags.all = true
      if (t.kind === CoachingThreadKind.GENERAL) flags.GENERAL = true
      else if (t.kind === CoachingThreadKind.ASK) flags.ASK = true
      else if (t.kind === CoachingThreadKind.FEEDBACK) flags.FEEDBACK = true
      else if (t.kind === CoachingThreadKind.RACE_REPORT) flags.RACE_REPORT = true
    }
    return flags
  }, [items, role, athleteFilter])

  /** Coach: Chat tab + one athlete → open that athlete's general chat under the filters. */
  const directGeneralThread = useMemo(() => {
    if (role !== 'coach' || kind !== 'GENERAL' || athleteFilter === 'all') return null
    return (
      items.find(
        (t) =>
          t.kind === CoachingThreadKind.GENERAL && t.athlete?.id === athleteFilter,
      ) ?? null
    )
  }, [role, kind, athleteFilter, items])

  const showDirectGeneralChat = Boolean(directGeneralThread)

  function selectThread(threadId: string, opts?: { openMobile?: boolean }) {
    const openMobile = opts?.openMobile ?? true
    setHoldUnreadId(null)
    openedReadIds.current.add(threadId)
    setSelectedId(threadId)
    if (!isLg && openMobile) setMobileDetailOpen(true)
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
  }

  function closeMobileDetail() {
    setMobileDetailOpen(false)
  }

  function selectEntry(entryId: string) {
    holdSelectedOutsideFilterRef.current = false
    if (isInboxCoachRequestListId(entryId)) {
      setSelectedId(entryId)
      if (!isLg) setMobileDetailOpen(true)
      return
    }
    selectThread(entryId)
  }

  function openGeneralChatForAthlete(athleteId: string) {
    const thread = items.find(
      (t) =>
        t.kind === CoachingThreadKind.GENERAL && t.athlete?.id === athleteId,
    )
    if (!thread) return
    holdSelectedOutsideFilterRef.current = true
    selectThread(thread.id)
  }

  useEffect(() => {
    if (isLg || !showDirectGeneralChat) {
      document.documentElement.removeAttribute('data-inbox-direct-chat')
      document.documentElement.style.removeProperty('--tt-inbox-direct-chat-top')
      return
    }
    document.documentElement.setAttribute('data-inbox-direct-chat', 'true')
    document.documentElement.removeAttribute('data-inbox-mobile-detail')
    setMobileDetailOpen(false)

    function syncDirectChatTop() {
      const el = document.querySelector<HTMLElement>('.tt-inbox-mobile-direct-chat')
      if (!el) return
      const top = Math.round(el.getBoundingClientRect().top)
      document.documentElement.style.setProperty('--tt-inbox-direct-chat-top', `${top}px`)
    }

    syncDirectChatTop()
    const raf = window.requestAnimationFrame(syncDirectChatTop)
    const el = document.querySelector<HTMLElement>('.tt-inbox-mobile-direct-chat')
    const ro = el ? new ResizeObserver(syncDirectChatTop) : null
    if (el && ro) ro.observe(el)
    window.addEventListener('resize', syncDirectChatTop)
    window.visualViewport?.addEventListener('resize', syncDirectChatTop)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      document.documentElement.removeAttribute('data-inbox-direct-chat')
      document.documentElement.style.removeProperty('--tt-inbox-direct-chat-top')
      window.removeEventListener('resize', syncDirectChatTop)
      window.visualViewport?.removeEventListener('resize', syncDirectChatTop)
    }
  }, [isLg, showDirectGeneralChat, athleteFilter, kind])

  useEffect(() => {
    if (!directGeneralThread) return
    setMobileDetailOpen(false)
    if (selectedId === directGeneralThread.id) return
    selectThread(directGeneralThread.id, { openMobile: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directGeneralThread?.id])

  const showMobileDetail =
    !isLg &&
    !showDirectGeneralChat &&
    mobileDetailOpen &&
    Boolean(selected || selectedRequest)

  const mobileDetailTitle = selectedRequest
    ? `Request · ${selectedRequest.athlete.name}`
    : selected
      ? (() => {
          const row = threadRowTitle(selected, role)
          return `${row.kind} · ${row.subject}`
        })()
      : 'Conversation'

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
      <PageHeader className="tt-inbox-page-header">
        <div className="flex w-full min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <PageHeaderEyebrow className="hidden lg:block">Messages</PageHeaderEyebrow>
            <PageHeaderTitle className="tt-inbox-page-title">
              Inbox<span className="tt-inbox-title-dot">.</span>
            </PageHeaderTitle>
            <PageHeaderDescription className="hidden max-w-lg lg:block">
              {role === 'coach'
                ? 'Workout asks, feedback, and race threads with your athletes.'
                : 'Ask your coach about workouts, share feedback, and follow up on races.'}
            </PageHeaderDescription>
          </div>
          {!showMobileDetail ? (
            <InboxMobileHeaderActions
              role={role}
              filter={filter}
              onFilterChange={setFilter}
              pendingRequestCount={pendingRequestCount}
              pushConfigured={pushConfigured}
              className="lg:hidden"
              trailing={
                role === 'coach' ? (
                  <InboxComposeGeneralChatButton
                    athletes={athleteOptions}
                    onSelectAthlete={openGeneralChatForAthlete}
                  />
                ) : null
              }
            />
          ) : null}
          {role === 'coach' ? (
            <InboxComposeGeneralChatButton
              athletes={athleteOptions}
              className="mt-0.5 hidden shrink-0 lg:mt-1 lg:inline-flex"
              onSelectAthlete={openGeneralChatForAthlete}
            />
          ) : null}
        </div>
      </PageHeader>

      {showMobileDetail ? (
        <div className="tt-inbox-shell tt-inbox-shell--mobile-thread lg:hidden">
          <div className="tt-inbox-mobile-thread">
            <header className="tt-inbox-mobile-thread-header">
              <button
                type="button"
                onClick={closeMobileDetail}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--tt-ink,#111)]">
                  {mobileDetailTitle}
                </p>
                {selected && !selectedRequest ? (
                  <p className="truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                    {(() => {
                      const row = threadRowTitle(selected, role)
                      const bits = [
                        row.athleteName,
                        row.subjectDate ? formatSessionDate(row.subjectDate) : null,
                      ].filter(Boolean)
                      return bits.join(' · ')
                    })()}
                  </p>
                ) : selectedRequest ? (
                  <p className="truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                    Coaching request
                  </p>
                ) : null}
              </div>
            </header>
            <div className="tt-inbox-mobile-thread-body">
              {selectedRequest ? (
                <InboxCoachRequestDetail
                  request={selectedRequest}
                  coachingCode={coachingCode}
                  embedded
                />
              ) : selected ? (
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
                  allowWorkoutSplit={false}
                  hideTitle
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <>
          <InboxMobileList
            role={role}
            entries={filtered}
            kind={kind}
            onKindChange={setKind}
            kindUnread={kindUnread}
            filter={filter}
            athleteFilter={athleteFilter}
            onAthleteFilterChange={setAthleteFilter}
            athleteOptions={athleteOptions}
            coachParticipant={coachParticipant}
            athleteParticipant={athleteParticipant}
            onSelectEntry={selectEntry}
            directChat={
              showDirectGeneralChat && directGeneralThread ? (
                <InboxThreadDetail
                  selected={directGeneralThread}
                  role={role}
                  holdUnreadId={holdUnreadId}
                  isPendingRead={isPendingRead}
                  onMarkUnread={markUnread}
                  onOpenWorkout={() => {
                    if (directGeneralThread.workoutDetail) {
                      setWorkoutModal(directGeneralThread.workoutDetail)
                    }
                  }}
                  onMessageSent={(body) => {
                    applyOptimisticSend(directGeneralThread.id, body)
                    void refreshInboxUnreadBadge()
                  }}
                  dockComposer
                  allowWorkoutSplit={false}
                  hideTitle
                />
              ) : showDirectGeneralChat ? (
                <p className="px-1 py-10 text-center text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
                  No general chat for this athlete yet.
                </p>
              ) : undefined
            }
          />

          <div
            ref={filtersRef}
            className="hidden flex-col gap-3 lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:justify-between"
          >
            <div className="tt-inbox-filters-scroll">
              <InboxFilterButton active={filter === 'unread'} onClick={() => setFilter('unread')}>
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </InboxFilterButton>
              <InboxFilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </InboxFilterButton>
              {role === 'coach' && pendingRequestCount > 0 ? (
                <InboxFilterButton
                  active={filter === 'requests'}
                  onClick={() => setFilter('requests')}
                >
                  Requests ({pendingRequestCount})
                </InboxFilterButton>
              ) : null}
              {role === 'coach' && athleteOptions.length > 0 ? (
                <div className="flex shrink-0 items-center gap-1.5">
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
            <div className="flex min-w-0 flex-col gap-2 lg:items-end">
              <InboxNotificationsToggle pushConfigured={pushConfigured} />
              <div className="tt-inbox-filters-scroll">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={cn(
                      'shrink-0 rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition',
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

          <div
            className={cn(
              'tt-inbox-shell',
              showDirectGeneralChat && 'tt-inbox-shell--direct-chat',
            )}
          >
            {!showDirectGeneralChat ? (
            <div className="tt-inbox-list">
              <div className="tt-inbox-list-header">
                <span className="tt-inbox-list-header-label">Threads</span>
                <span className="tt-inbox-list-header-count">{filtered.length}</span>
              </div>
              <div className="tt-inbox-list-scroll">
                {filtered.length === 0 ? (
                  <p className="px-2 py-10 text-center text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
                    {filter === 'requests' ? 'No pending requests.' : 'No conversations here.'}
                  </p>
                ) : (
                  <div className="tt-inbox-list-items">
                    {paged.map((entry) => {
                      const entryId = inboxListEntryId(entry)
                      const active = isLg && selectedId === entryId

                      if (entry.type === 'request') {
                        const request = entry.request
                        return (
                          <button
                            key={entryId}
                            type="button"
                            onClick={() => selectEntry(entryId)}
                            data-active={active ? 'true' : 'false'}
                            data-unread="true"
                            data-inbox-request="true"
                            className="tt-inbox-list-row"
                          >
                            <div className="flex gap-3">
                              <AthleteAvatar
                                name={request.athlete.name}
                                avatarUrl={request.athlete.avatarUrl}
                                size="sm"
                                className="!h-8 !w-8 shrink-0 !text-[11px] pt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-red,#da2f36)]">
                                        Request
                                      </span>
                                      <p className="min-w-0 truncate text-sm font-semibold text-[var(--tt-ink,#111)]">
                                        {request.athlete.name}
                                      </p>
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                                      Wants to connect as your athlete
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="tt-inbox-unread-badge">1</span>
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
                                      {formatWhen(request.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-1 truncate text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                                  Approve or decline this coaching request
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      }

                      const t = entry.thread
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
                        <div key={entryId}>
                          <button
                            type="button"
                            onClick={() => selectEntry(entryId)}
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
                                      {row.subjectDate
                                        ? formatSessionDate(row.subjectDate)
                                        : 'No date'}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    {t.unread ? (
                                      <span className="tt-inbox-unread-badge">1</span>
                                    ) : null}
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
                          {!t.unread && isLg ? (
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
            ) : null}

            {isLg ? (
              <div className="tt-inbox-detail flex">
                {!selected && !selectedRequest ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--tt-ink-soft,#6b6b6b)]">
                    <MessageSquare className="h-8 w-8 opacity-40" />
                    <p className="text-sm">
                      {showDirectGeneralChat
                        ? 'No general chat for this athlete yet.'
                        : 'Select a conversation'}
                    </p>
                  </div>
                ) : (
                  <div className="tt-inbox-detail-inner">
                    {selectedRequest ? (
                      <InboxCoachRequestDetail
                        request={selectedRequest}
                        coachingCode={coachingCode}
                      />
                    ) : selected ? (
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
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>

        </>
      )}

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
