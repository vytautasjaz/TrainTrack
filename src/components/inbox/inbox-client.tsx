/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { CoachingAuthorRole, CoachingThreadKind, CoachingThreadStatus, type RacePriority } from '@prisma/client'
import { Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import { PlanWorkoutDataCard } from '@/components/plan/plan-workout-data-card'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { parseDateOnly } from '@/lib/dates'
import { getWorkoutCardHero, getWorkoutCardSubtitle } from '@/lib/workout-card'
import { markCoachingThreadUnread } from '@/app/actions/coaching-inbox'
import { InboxNotificationsToggle } from '@/components/inbox/inbox-notifications-toggle'
import { refreshInboxUnreadBadge } from '@/components/layout/inbox-nav-badge'
import { markInboxThreadReadClient, clearInboxThreadReadClient } from '@/lib/inbox-mark-read-client'
import {
  formatInboxRaceResultLabel,
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

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
]

const KINDS: { id: InboxKindFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
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

function formatHeroUnit(workout: PlanWorkoutDetail): string | null {
  const hero = getWorkoutCardHero(workout)
  if (!hero?.value) return null
  const unit = hero.unit ? ` ${hero.unit}` : ''
  return `${hero.approximate ? '~' : ''}${hero.value}${unit}`.trim()
}

function threadSessionMeta(t: InboxThreadListItem): {
  date: string
  subtitle: string | null
  unit: string | null
} | null {
  if (t.workoutDetail) {
    return {
      date: formatSessionDate(t.workoutDetail.dateKey),
      subtitle: getWorkoutCardSubtitle(t.workoutDetail),
      unit: formatHeroUnit(t.workoutDetail),
    }
  }
  if (t.workout) {
    return { date: formatSessionDate(t.workout.dateKey), subtitle: null, unit: null }
  }
  if (t.race) {
    const resultLabel = formatInboxRaceResultLabel(t.race)
    return {
      date: formatSessionDate(t.race.dateKey),
      subtitle: resultLabel,
      unit: t.race.resultPlace?.trim() ?? null,
    }
  }
  return null
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

function InboxMiniWorkoutCard({
  workout,
  role,
  onOpen,
}: {
  workout: PlanWorkoutDetail
  role: 'athlete' | 'coach'
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
      aria-label={`Open workout ${workout.title}`}
      className="w-[32%] min-w-[6.5rem] max-w-[8.5rem] shrink-0 self-start overflow-hidden rounded-[6px] text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
            <PlanWorkoutDataCard
              workout={workout}
              density="week"
              isCoach={role === 'coach'}
              className="pointer-events-none"
            />
    </button>
  )
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
}) {
  return (
    <div className="min-w-0 max-w-full space-y-4">
      {!embedded && role === 'coach' && selected.athlete ? (
        <div className="flex items-center gap-2.5">
          <AthleteAvatar
            name={selected.athlete.name}
            avatarUrl={selected.athlete.avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{selected.athlete.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {kindLabel(selected.kind)}
              {selected.unread || holdUnreadId === selected.id ? (
                <>
                  {' · '}
                  Unread
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {selected.workoutDetail && !embedded ? (
        <div className="space-y-2">
          {role !== 'coach' ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {kindLabel(selected.kind)} about this workout
            </p>
          ) : null}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
          <p className="text-[11px] text-muted-foreground">Tap the card to open the workout</p>
        </div>
      ) : selected.race ? (
        embedded ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/season">Season plan</Link>
          </Button>
        ) : (
          <InboxRaceReportSummary
            race={selected.race}
            dateLabel={formatSessionDate(selected.race.dateKey)}
          />
        )
      ) : selected.workout && !embedded ? (
        <div className="rounded-[6px] border border-border bg-muted/20 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={WORKOUT_TYPE_COLORS[selected.workout.type]}>
              {WORKOUT_TYPE_LABELS[selected.workout.type]}
            </Badge>
            <h2 className="text-base font-semibold">{selected.workout.title}</h2>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>{formatSessionDate(selected.workout.dateKey)}</span>
          </p>
        </div>
      ) : null}

      <CoachingThreadPanel
        thread={{
          id: selected.id,
          status: selected.status,
          kind: selected.kind,
          messages:
            selected.race && !embedded
              ? selected.messages.filter(
                  (m) =>
                    !(
                      m.authorRole === CoachingAuthorRole.ATHLETE &&
                      isRaceReportCardDuplicateMessage(m.body, selected.race)
                    ),
                )
              : selected.messages,
        }}
        role={role}
        skipAutoRead={holdUnreadId === selected.id}
        composerFooter={
          holdUnreadId !== selected.id ? (
            <button
              type="button"
              disabled={isPendingRead}
              onClick={() => onMarkUnread(selected.id)}
              className="text-[11px] font-medium text-muted-foreground/70 transition hover:text-foreground disabled:opacity-60"
            >
              Mark as unread
            </button>
          ) : null
        }
        onMessageSent={(body) => onMessageSent(body)}
      />
    </div>
  )
}

type InboxClientProps = {
  role: 'athlete' | 'coach'
  threads: InboxThreadListItem[]
  pendingRequestsSlot?: React.ReactNode
  pushConfigured?: boolean
}

export function InboxClient({
  role,
  threads,
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

  const athletes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatarUrl: string | null }>()
    for (const t of items) {
      if (t.athlete) map.set(t.athlete.id, t.athlete)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

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
    <div className="min-w-0 max-w-full space-y-2.5">
      {pendingRequestsSlot}

      <div
        ref={filtersRef}
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
      >
        <InboxNotificationsToggle pushConfigured={pushConfigured} />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition',
                filter === f.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>
        <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                'rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium transition',
                kind === k.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        {role === 'coach' && athletes.length > 1 ? (
          <>
            <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setAthleteFilter('all')}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
                  athleteFilter === 'all'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                All
              </button>
              {athletes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.name}
                  onClick={() => setAthleteFilter(a.id)}
                  className={cn(
                    'rounded-full ring-offset-background transition',
                    athleteFilter === a.id
                      ? 'ring-2 ring-foreground ring-offset-1'
                      : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <AthleteAvatar
                    name={a.name}
                    avatarUrl={a.avatarUrl}
                    size="sm"
                    className="!h-6 !w-6 !text-[9px]"
                  />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-[6px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations here.
            </p>
          ) : (
            paged.map((t) => {
              const active = selected?.id === t.id
              const title = t.workout?.title ?? t.race?.name ?? 'Conversation'
              const sessionMeta = threadSessionMeta(t)
              return (
                <div
                  key={t.id}
                  ref={(el) => {
                    if (el) listItemRefs.current.set(t.id, el)
                    else listItemRefs.current.delete(t.id)
                  }}
                  className={cn(
                    'relative min-w-0 max-w-full overflow-x-clip rounded-[6px] border bg-card transition',
                    active
                      ? 'border-2 border-[color-mix(in_srgb,var(--color-foreground)_56%,var(--color-border))] bg-background shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_14%,transparent)]'
                      : t.unread
                        ? 'border-[color-mix(in_srgb,var(--color-foreground)_48%,var(--color-border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_14%,transparent)] hover:bg-muted/20'
                        : 'border-border hover:bg-muted/20',
                  )}
                >
                  <div className="flex items-start gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => selectThread(t.id)}
                      aria-expanded={active}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-2.5">
                        {role === 'coach' && t.athlete ? (
                          <AthleteAvatar
                            name={t.athlete.name}
                            avatarUrl={t.athlete.avatarUrl}
                            size="md"
                            className="mt-0.5"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {role === 'coach' && t.athlete ? (
                                <p
                                  className={cn(
                                    'truncate text-sm text-foreground',
                                    t.unread ? 'font-semibold' : 'font-medium',
                                  )}
                                >
                                  {t.athlete.name}
                                </p>
                              ) : null}
                              <p
                                className={cn(
                                  'truncate text-sm text-foreground',
                                  t.workoutDetail && 'max-lg:hidden',
                                )}
                              >
                                <span className={t.unread ? 'font-semibold' : 'font-medium'}>{title}</span>
                                {sessionMeta?.subtitle || sessionMeta?.unit ? (
                                  <span className="font-normal text-muted-foreground">
                                    {sessionMeta.subtitle ? ` | ${sessionMeta.subtitle}` : ''}
                                    {sessionMeta.unit ? ` | ${sessionMeta.unit}` : ''}
                                  </span>
                                ) : null}
                              </p>
                              {sessionMeta ? (
                                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
                                  <Calendar className="h-3 w-3 shrink-0" strokeWidth={2} />
                                  <span className="truncate">{sessionMeta.date}</span>
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                'shrink-0 pt-0.5 text-[10px] text-muted-foreground',
                                t.workoutDetail && 'max-lg:hidden',
                              )}
                            >
                              {formatWhen(t.lastMessageAt)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-muted text-[10px] text-muted-foreground">
                              {kindLabel(t.kind)}
                            </Badge>
                            {t.workoutDetail ? (
                              <span className="text-[10px] text-muted-foreground lg:hidden">
                                {formatWhen(t.lastMessageAt)}
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={cn(
                              'mt-1 line-clamp-2 text-xs',
                              t.unread ? 'text-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            {t.preview}
                          </p>
                        </div>
                      </div>
                    </button>
                    {t.workoutDetail ? (
                      <InboxMiniWorkoutCard
                        workout={t.workoutDetail}
                        role={role}
                        onOpen={() => setWorkoutModal(t.workoutDetail)}
                      />
                    ) : null}
                  </div>
                  {!t.unread && !active ? (
                    <button
                      type="button"
                      disabled={isPendingRead}
                      onClick={() => markUnread(t.id)}
                      aria-label="Mark conversation as unread"
                      title="Mark as unread"
                      className="px-3 pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40 transition hover:text-muted-foreground/75 disabled:opacity-60"
                    >
                      Unread
                    </button>
                  ) : null}
                  {active && selected && !isLg ? (
                    <div className="min-w-0 border-t border-border p-3">
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
                      />
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
          {filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1">
                <span className="pr-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Show
                </span>
                {INBOX_PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    className={cn(
                      'rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition',
                      pageSize === size
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>
                  {rangeStart}–{rangeEnd} of {filtered.length}
                </span>
                {pageCount > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-[5px] p-0.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
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
                      className="rounded-[5px] p-0.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
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

        <div className="hidden min-w-0 rounded-[6px] border border-border bg-card p-4 lg:block">
          {!isLg ? null : !selected ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
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
            />
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
