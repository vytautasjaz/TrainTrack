'use client'

import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Flag,
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
} from 'lucide-react'
import { SportIcon } from './mock-ui'
import { MockExpandShell, useMockExpandScroll } from './mock-expandable'

type AthleteStatus = 'Active' | 'Inactive' | 'Archived'

export type CoachAthleteWorkoutRef = {
  title: string
  date: string
  sport: 'run' | 'bike' | 'swim' | 'strength' | 'recovery' | 'mobility'
  distance?: string
  duration?: string
}

export type CoachAthleteRescheduleRequest = {
  fromDate: string
  toDate: string
  status: 'pending' | 'approved' | 'declined'
}

export type CoachAthleteConnectRequest = {
  status: 'pending' | 'approved' | 'declined'
  summary?: string
}

export type CoachAthleteActivity = {
  id: string
  kind: 'message' | 'feedback' | 'note'
  when: string
  title: string
  body: string
  unread?: boolean
  /** Who sent the message — used for chat bubbles */
  from?: 'coach' | 'athlete'
  /** Present on workout feedback / ask — basic session facts */
  workout?: CoachAthleteWorkoutRef
  /** Athlete asked to move a session — coach can approve from chat */
  reschedule?: CoachAthleteRescheduleRequest
  /** Athlete asked to join the roster — coach can approve from chat */
  connectRequest?: CoachAthleteConnectRequest
}

export type CoachAthleteRow = {
  id: string
  initials: string
  name: string
  status: AthleteStatus
  /**
   * Week-to-date (Mon → today): sessions due so far.
   * Use this to spot skips before the week ends.
   */
  compliance: number
  completed: number
  planned: number
  /** Full prior calendar week (Mon–Sun). */
  lastWeekCompliance: number
  lastWeekCompleted: number
  lastWeekPlanned: number
  nextRace: string | null
  /** Days until next race; null = none */
  nextRaceDays: number | null
  warning: string | null
  /**
   * Higher = more urgent.
   * 3 = needs reply / pending request linked
   * 2 = planning warning
   * 1 = soft attention (low compliance)
   * 0 = none
   */
  attention: number
  attentionLabel: string | null
  /**
   * Whether athlete allowed coach to propose zone/pace adjustments.
   * Without this, coach can view training but not edit personal zones.
   */
  zonesPermission?: 'granted' | 'denied' | 'not-requested'
  /** Latest inbox / feedback items shown when row expands */
  activity: CoachAthleteActivity[]
}

type SortKey =
  | 'attention'
  | 'name'
  | 'status'
  | 'compliance'
  | 'lastWeek'
  | 'nextRace'

type SortDir = 'asc' | 'desc'

export type CoachAthleteSortKey = SortKey
export type CoachAthleteSortDir = SortDir

const STATUS_ORDER: Record<AthleteStatus, number> = {
  Active: 0,
  Inactive: 1,
  Archived: 2,
}

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'attention', label: 'Attention' },
  { key: 'name', label: 'Athlete' },
  { key: 'status', label: 'Status' },
  { key: 'compliance', label: 'To today', align: 'right' },
  { key: 'lastWeek', label: 'Last week', align: 'right' },
  { key: 'nextRace', label: 'Next race' },
]

export const COACH_ATHLETE_SORT_OPTIONS = COLUMNS.map(({ key, label }) => ({ key, label }))

function complianceBarColor(pct: number) {
  if (pct >= 80) return 'var(--tt-good)'
  if (pct >= 50) return 'var(--tt-sport-run)'
  if (pct > 0) return 'var(--tt-red)'
  return 'var(--tt-ink-faint)'
}

/** Week-to-date or last-week completion cell */
export function WeekCompletionCell({
  pct,
  completed,
  planned,
  compact = false,
  emphasize = false,
}: {
  pct: number
  completed: number
  planned: number
  compact?: boolean
  /** Primary metric (to today) vs quieter last week */
  emphasize?: boolean
}) {
  if (planned <= 0) {
    return (
      <span
        className={
          emphasize
            ? 'text-xs text-[var(--tt-ink-faint)]'
            : 'text-[11px] text-[var(--tt-ink-faint)]'
        }
      >
        —
      </span>
    )
  }

  const skipped = completed < planned

  return (
    <div
      className={`ml-auto flex flex-col ${emphasize ? 'w-[8.5rem] items-end gap-1' : 'w-[7.5rem] items-end gap-0.5'}`}
    >
      <div
        className={`flex items-baseline gap-1.5 tabular-nums ${
          emphasize ? 'text-xs font-semibold' : 'text-[11px] font-medium'
        } ${
          skipped && emphasize
            ? 'text-[var(--tt-red)]'
            : emphasize
              ? 'text-[var(--tt-ink)]'
              : 'text-[var(--tt-ink-soft)]'
        }`}
      >
        <span>
          {completed}/{planned}
        </span>
        <span className={emphasize ? '' : 'text-[var(--tt-ink-faint)]'}>{pct}%</span>
      </div>
      <div
        className={`w-full overflow-hidden rounded-full bg-[var(--tt-sidebar)] ${
          compact || !emphasize ? 'h-1' : 'h-1.5'
        }`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: complianceBarColor(pct),
          }}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: AthleteStatus }) {
  const styles =
    status === 'Active'
      ? 'bg-[var(--tt-good-soft)] text-[var(--tt-good)]'
      : status === 'Inactive'
        ? 'bg-[var(--tt-sidebar)] text-[var(--tt-ink-soft)]'
        : 'bg-[var(--tt-line)] text-[var(--tt-ink-faint)]'
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${styles}`}
    >
      {status}
    </span>
  )
}

function AttentionCell({ row }: { row: CoachAthleteRow }) {
  if (row.attention <= 0 || !row.attentionLabel) {
    return <span className="text-[var(--tt-ink-faint)]">—</span>
  }
  const tone =
    row.attention >= 3
      ? 'text-[var(--tt-red)]'
      : row.attention === 2
        ? 'text-[var(--tt-sport-run)]'
        : 'text-[var(--tt-ink-soft)]'
  return (
    <span
      className={`text-[12px] font-semibold ${tone}`}
      title={row.warning ?? row.attentionLabel}
    >
      {row.attentionLabel}
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.75} />
  }
  return dir === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-[var(--tt-red)]" strokeWidth={2} />
  ) : (
    <ArrowDown className="h-3 w-3 text-[var(--tt-red)]" strokeWidth={2} />
  )
}

function ActivityIcon({ kind }: { kind: CoachAthleteActivity['kind'] }) {
  if (kind === 'message') {
    return <MessageSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
  }
  if (kind === 'feedback') {
    return <ThumbsUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
  }
  return <Flag className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
}

function AthleteChat({
  athleteName,
  initialMessages,
  compact = false,
}: {
  athleteName: string
  initialMessages: CoachAthleteActivity[]
  /** Shorter fixed height for mobile stacked layout */
  compact?: boolean
}) {
  const [messages, setMessages] = useState(() =>
    initialMessages.map((m) => ({
      ...m,
      from: m.from ?? (m.title === 'You' ? ('coach' as const) : ('athlete' as const)),
      replyToId: undefined as string | undefined,
    })),
  )
  const [draft, setDraft] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const replyTarget = replyToId ? messages.find((m) => m.id === replyToId) : null

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, replyToId])

  function selectReplyTarget(id: string) {
    setReplyToId((cur) => (cur === id ? null : id))
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function resolveReschedule(id: string, status: 'approved' | 'declined') {
    const target = messages.find((m) => m.id === id)
    const label =
      status === 'approved'
        ? `Approved reschedule${target?.workout ? ` · ${target.workout.title}` : ''}: ${target?.reschedule?.fromDate} → ${target?.reschedule?.toDate}`
        : `Declined reschedule${target?.workout ? ` · ${target.workout.title}` : ''}`

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === id && m.reschedule
          ? { ...m, unread: false, reschedule: { ...m.reschedule, status } }
          : m,
      ),
      {
        id: `local-rs-${Date.now()}`,
        kind: 'message' as const,
        when: 'Now',
        title: 'You',
        body: label,
        from: 'coach' as const,
        replyToId: undefined as string | undefined,
        workout: target?.workout,
      },
    ])
    if (replyToId === id) setReplyToId(null)
  }

  function resolveConnect(id: string, status: 'approved' | 'declined') {
    const label =
      status === 'approved'
        ? `Approved — ${athleteName.split(' ')[0]} is on your roster.`
        : `Declined join request from ${athleteName.split(' ')[0]}.`

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === id && m.connectRequest
          ? { ...m, unread: false, connectRequest: { ...m.connectRequest, status } }
          : m,
      ),
      {
        id: `local-cn-${Date.now()}`,
        kind: 'message' as const,
        when: 'Now',
        title: 'You',
        body: label,
        from: 'coach' as const,
        replyToId: undefined as string | undefined,
      },
    ])
    if (replyToId === id) setReplyToId(null)
  }

  function send(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const body = draft.trim()
    if (!body) return
    const targetId = replyToId
    setMessages((prev) => {
      const next = prev.map((m) =>
        targetId && m.id === targetId ? { ...m, unread: false } : m,
      )
      next.push({
        id: `local-${Date.now()}`,
        kind: 'message',
        when: 'Now',
        title: 'You',
        body,
        from: 'coach',
        replyToId: targetId ?? undefined,
        workout: targetId ? prev.find((m) => m.id === targetId)?.workout : undefined,
      })
      return next
    })
    setDraft('')
    setReplyToId(null)
  }

  return (
    <section
      className={`flex w-full min-w-0 flex-col ${
        compact
          ? 'bg-transparent'
          : 'h-[20rem] overflow-hidden rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={listRef}
        className={`min-h-0 overflow-y-auto overscroll-contain ${
          compact ? 'h-[14rem] px-3 py-2' : 'flex-1 px-3 py-3'
        }`}
      >
        <div className="flex flex-col gap-2">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[var(--tt-ink-faint)]">
            No messages yet — say hello below.
          </p>
        ) : (
          messages.map((item) => {
            const mine = item.from === 'coach'
            const selected = replyToId === item.id
            const repliedTo = item.replyToId
              ? messages.find((m) => m.id === item.replyToId)
              : null
            const authorLabel = mine ? 'Coach' : 'Athlete'
            const otherBubble = compact
              ? 'bg-white text-[var(--tt-ink)]'
              : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink)]'

            return (
              <div
                key={item.id}
                className={`flex max-w-[min(85%,100%)] flex-col gap-1.5 ${mine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {repliedTo ? (
                  <p className="max-w-full truncate rounded-md bg-white/80 px-2 py-1 text-[10px] text-[var(--tt-ink-soft)]">
                    Replying to: {repliedTo.body}
                  </p>
                ) : null}
                {item.workout ? (
                  <div className="flex max-w-full items-start gap-2 rounded-[10px] border border-[var(--tt-line)] bg-white px-2.5 py-2">
                    <SportIcon sport={item.workout.sport} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[var(--tt-ink)]">
                        {item.workout.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--tt-ink-soft)]">
                        {[item.workout.date, item.workout.distance, item.workout.duration]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    selectReplyTarget(item.id)
                  }}
                  title="Tap to reply"
                  className={`w-full rounded-[10px] px-3 py-2 text-left text-sm leading-relaxed transition ${
                    mine
                      ? selected
                        ? 'bg-[var(--tt-ink)] text-white ring-2 ring-[var(--tt-ink)]/25 ring-offset-1'
                        : 'bg-[var(--tt-ink)] text-white hover:opacity-95'
                      : selected
                        ? `${otherBubble} ring-2 ring-[var(--tt-ink)]/15 ring-offset-1`
                        : item.unread
                          ? `${otherBubble} ring-1 ring-[var(--tt-line-strong)]`
                          : `${otherBubble} hover:brightness-[0.98]`
                  }`}
                >
                  <p className="[overflow-wrap:anywhere]">{item.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? 'text-white/70' : 'text-[var(--tt-ink-faint)]'
                    }`}
                  >
                    {authorLabel} · {item.when}
                    {item.unread && !mine ? ' · Unread' : null}
                    {selected ? ' · Replying' : null}
                  </p>
                </button>
                {item.reschedule ? (
                  <div className="w-full max-w-full rounded-[10px] border border-[var(--tt-line)] bg-white px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                      Reschedule request
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[var(--tt-ink)]">
                      {item.reschedule.fromDate}
                      <span className="mx-1.5 text-[var(--tt-ink-faint)]">→</span>
                      {item.reschedule.toDate}
                    </p>
                    {item.reschedule.status === 'pending' ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="tt-mock-btn tt-mock-btn-ghost !bg-[var(--tt-ink)] !px-2.5 !py-1 !text-[11px] !normal-case !tracking-normal !text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveReschedule(item.id, 'approved')
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="tt-mock-btn tt-mock-btn-ghost !bg-white !px-2.5 !py-1 !text-[11px] !normal-case !tracking-normal"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveReschedule(item.id, 'declined')
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-semibold text-[var(--tt-ink-faint)]">
                        {item.reschedule.status === 'approved' ? 'Approved' : 'Declined'}
                      </p>
                    )}
                  </div>
                ) : null}
                {item.connectRequest ? (
                  <div className="w-full max-w-full rounded-[10px] border border-[var(--tt-line)] bg-white px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                      Join request
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[var(--tt-ink)]">
                      {item.connectRequest.summary ?? 'Wants to join your coaching squad'}
                    </p>
                    {item.connectRequest.status === 'pending' ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="tt-mock-btn tt-mock-btn-ghost !bg-[var(--tt-ink)] !px-2.5 !py-1 !text-[11px] !normal-case !tracking-normal !text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveConnect(item.id, 'approved')
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="tt-mock-btn tt-mock-btn-ghost !bg-white !px-2.5 !py-1 !text-[11px] !normal-case !tracking-normal"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveConnect(item.id, 'declined')
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-semibold text-[var(--tt-ink-faint)]">
                        {item.connectRequest.status === 'approved' ? 'Approved' : 'Declined'}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
        </div>
      </div>

      {replyTarget ? (
        <div
          className={`flex w-full min-w-0 items-start gap-2 border-t border-[var(--tt-line)] bg-white px-3 py-2 ${
            compact ? '' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
              Replying to
            </p>
            {replyTarget.workout ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--tt-ink)]">
                {replyTarget.workout.title}
                <span className="font-normal text-[var(--tt-ink-soft)]">
                  {' '}
                  · {[replyTarget.workout.date, replyTarget.workout.distance]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </p>
            ) : null}
            <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--tt-ink-soft)]">
              {replyTarget.body}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 self-center px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]"
            onClick={(e) => {
              e.stopPropagation()
              setReplyToId(null)
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <form
        className="flex w-full min-w-0 border-t border-[var(--tt-line)] bg-white"
        onSubmit={send}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={replyTarget ? 'Write your reply…' : 'Reply…'}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className={`shrink-0 border-l border-[var(--tt-line)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition disabled:opacity-35 ${
            draft.trim()
              ? 'text-[var(--tt-ink)] hover:bg-[var(--tt-bg)]'
              : 'text-[var(--tt-ink-faint)]'
          }`}
        >
          Send
        </button>
      </form>
    </section>
  )
}

export function AthleteExpandPanel({
  row,
  stacked = false,
  initialTab,
}: {
  row: CoachAthleteRow
  /** Force chat/feedback tabs (mobile phone frame ignores viewport breakpoints). */
  stacked?: boolean
  /** Prefer a tab when opening from an attention item */
  initialTab?: 'chat' | 'feedback' | 'zones'
}) {
  const messages = row.activity.filter((a) => a.kind === 'message')
  const feedbacks = row.activity.filter((a) => a.kind === 'feedback' || a.kind === 'note')
  const chatUnread = messages.filter((m) => m.unread).length
  const feedbackUnread = feedbacks.filter((f) => f.unread).length
  const zonesPermission = row.zonesPermission ?? 'not-requested'

  const [tab, setTab] = useState<'chat' | 'feedback' | 'zones'>(() => {
    if (initialTab) return initialTab
    return chatUnread > 0 ? 'chat' : feedbackUnread > 0 ? 'feedback' : 'chat'
  })

  const actions = (
    <div className="grid grid-cols-2 border-t border-[var(--tt-line)] bg-white">
      {(
        [
          { label: 'Open training' },
          { label: 'View profile' },
        ] as const
      ).map((item, i) => (
        <button
          key={item.label}
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center justify-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)] transition hover:text-[var(--tt-ink)] ${
            i === 0 ? 'border-r border-[var(--tt-line)]' : ''
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  const tablist = (
    <div
      className={`grid grid-cols-3 border-y border-[var(--tt-line)]`}
      role="tablist"
      aria-label="Athlete activity"
    >
      {(
        [
          { id: 'chat' as const, label: 'Chat', count: chatUnread },
          { id: 'feedback' as const, label: 'Feedback', count: feedbackUnread },
          { id: 'zones' as const, label: 'Zones', count: 0 },
        ] as const
      ).map((item, i) => {
        const active = tab === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={(e) => {
              e.stopPropagation()
              setTab(item.id)
            }}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${
              i < 2 ? 'border-r border-[var(--tt-line)]' : ''
            } ${
              active
                ? 'bg-white text-[var(--tt-ink)]'
                : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]'
            }`}
          >
            <span className={active ? 'font-bold' : undefined}>{item.label}</span>
            {item.count > 0 ? (
              <span
                className={`tabular-nums normal-case tracking-normal ${
                  active
                    ? 'font-bold text-[var(--tt-ink-soft)]'
                    : 'font-medium text-[var(--tt-ink-faint)]'
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  const tabBody = (
    <div className="bg-[var(--tt-sidebar)]">
      {tab === 'chat' ? (
        <AthleteChat athleteName={row.name} initialMessages={messages} compact={stacked} />
      ) : null}
      {tab === 'feedback' ? (
        <div className="px-3 py-2.5">
          <AthleteFeedbackList feedbacks={feedbacks} embedded />
        </div>
      ) : null}
      {tab === 'zones' ? (
        <AthleteZonesPanel
          athleteName={row.name}
          permission={zonesPermission}
          compact={stacked}
        />
      ) : null}
    </div>
  )

  if (stacked) {
    return (
      <div>
        {tablist}
        {tabBody}
        {actions}
      </div>
    )
  }

  return (
    <div className="pt-1 pb-1">
      <div className="overflow-hidden rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)]">
        {tablist}
        {tabBody}
        {actions}
      </div>
    </div>
  )
}

function AthleteZonesPanel({
  athleteName,
  permission: initialPermission,
  compact = false,
}: {
  athleteName: string
  permission: 'granted' | 'denied' | 'not-requested'
  compact?: boolean
}) {
  const first = athleteName.split(' ')[0] ?? athleteName
  const [permission, setPermission] = useState(initialPermission)
  const [sentFlash, setSentFlash] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    z2: '5:05–5:35',
    z3: '4:35–5:00',
    z4: '4:10–4:30',
  })

  function propose() {
    if (permission !== 'granted') return
    setSentFlash(`Notification sent to ${first} — they can accept or dismiss the pace update.`)
    window.setTimeout(() => setSentFlash(null), 3200)
  }

  function requestAccess() {
    setPermission('denied')
    setSentFlash(`Permission request sent to ${first}.`)
    window.setTimeout(() => setSentFlash(null), 2800)
  }

  return (
    <div className={`space-y-3 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
      <div>
        <p className="text-[13px] font-semibold text-[var(--tt-ink)]">Training zones</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--tt-ink-soft)]">
          Personal athlete settings stay with the athlete. With permission you can propose
          pace/zone adjustments — they get a notification and must accept.
        </p>
      </div>

      {permission !== 'granted' ? (
        <div className="rounded-[8px] border border-dashed border-[var(--tt-line)] bg-white px-3.5 py-4">
          <p className="text-[13px] font-medium text-[var(--tt-ink)]">
            {permission === 'denied'
              ? `${first} hasn’t granted zone-edit permission yet`
              : `No permission to adjust ${first}’s zones`}
          </p>
          <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
            You can still plan workouts. Zone edits require explicit athlete consent.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              requestAccess()
            }}
            className="mt-3 text-[12px] font-semibold text-[var(--tt-ink)] underline-offset-2 hover:underline"
          >
            Request permission
          </button>
          {/* Mock shortcut so reviewers can try the granted flow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPermission('granted')
            }}
            className="ml-3 mt-3 text-[11px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]"
          >
            Mock · grant access
          </button>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-medium text-[var(--tt-good)]">
            Permission granted · proposals notify {first}
          </p>
          <div className="overflow-hidden rounded-[8px] border border-[var(--tt-line)] bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)] text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Proposed pace /km</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['z2', 'Z2 Easy'],
                    ['z3', 'Z3 Tempo'],
                    ['z4', 'Z4 Threshold'],
                  ] as const
                ).map(([key, label]) => (
                  <tr key={key} className="border-b border-[var(--tt-line)] last:border-0">
                    <td className="px-3 py-2 text-[12px] font-medium text-[var(--tt-ink)]">
                      {label}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft[key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-full max-w-[9rem] rounded-[6px] border border-[var(--tt-line)] bg-white px-2 text-[12px] tabular-nums text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              propose()
            }}
            className="rounded-[8px] bg-[var(--tt-ink)] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90"
          >
            Propose adjustment
          </button>
          <p className="text-[11px] text-[var(--tt-ink-faint)]">
            Does not overwrite their zones until they accept in Notifications.
          </p>
        </>
      )}

      {sentFlash ? (
        <p className="rounded-[6px] border border-[var(--tt-good)]/25 bg-[var(--tt-good-soft)] px-3 py-2 text-[12px] text-[var(--tt-good)]">
          {sentFlash}
        </p>
      ) : null}
    </div>
  )
}

function AthleteFeedbackList({
  feedbacks,
  embedded = false,
}: {
  feedbacks: CoachAthleteActivity[]
  embedded?: boolean
}) {
  if (embedded) {
    return (
      <div className="max-h-[16rem] overflow-y-auto overscroll-contain">
        {feedbacks.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[var(--tt-ink-faint)]">
            No recent workout feedback
          </p>
        ) : (
          <ul className="divide-y divide-[var(--tt-line)]">
            {feedbacks.map((item) => (
              <li key={item.id} className="py-3 first:pt-1 last:pb-1">
                {item.workout ? (
                  <div className="mb-2 flex items-start gap-2.5">
                    <SportIcon sport={item.workout.sport} className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                        {item.workout.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--tt-ink-soft)]">
                        {[item.workout.date, item.workout.distance, item.workout.duration]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-[var(--tt-ink-soft)]">
                    <ActivityIcon kind={item.kind} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                        {item.title}
                        {item.unread ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-red)]">
                            New
                          </span>
                        ) : null}
                      </p>
                      <p className="tt-mock-caption shrink-0">{item.when}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                      {item.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white p-3">
      <p className="tt-mock-overline mb-2.5">Latest feedback</p>
      {feedbacks.length === 0 ? (
        <p className="rounded-[var(--tt-radius-sm)] border border-dashed border-[var(--tt-line)] px-3 py-4 text-[12px] text-[var(--tt-ink-faint)]">
          No recent workout feedback
        </p>
      ) : (
        <ul className="max-h-[16rem] space-y-2 overflow-y-auto overscroll-contain">
          {feedbacks.map((item) => (
            <li
              key={item.id}
              className={`rounded-[var(--tt-radius-sm)] border px-3 py-2.5 ${
                item.unread
                  ? 'border-[var(--tt-red)]/20 bg-[var(--tt-red)]/5'
                  : 'border-[var(--tt-line)] bg-[var(--tt-bg)]'
              }`}
            >
              {item.workout ? (
                <div className="mb-2 flex items-start gap-2.5 rounded-[var(--tt-radius-sm)] bg-white px-2.5 py-2 ring-1 ring-[var(--tt-line)]">
                  <SportIcon sport={item.workout.sport} className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                      {item.workout.title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--tt-ink-soft)]">
                      <span>{item.workout.date}</span>
                      {item.workout.distance ? (
                        <span className="before:mr-2 before:text-[var(--tt-ink-faint)] before:content-['·']">
                          {item.workout.distance}
                        </span>
                      ) : null}
                      {item.workout.duration ? (
                        <span className="before:mr-2 before:text-[var(--tt-ink-faint)] before:content-['·']">
                          {item.workout.duration}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--tt-ink-soft)]">
                  <ActivityIcon kind={item.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                      {item.title}
                      {item.unread ? (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-red)]">
                          New
                        </span>
                      ) : null}
                    </p>
                    <p className="tt-mock-caption shrink-0">{item.when}</p>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                    {item.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function compareCoachAthletes(
  a: CoachAthleteRow,
  b: CoachAthleteRow,
  key: SortKey,
  dir: SortDir,
) {
  const mul = dir === 'asc' ? 1 : -1
  let cmp = 0
  switch (key) {
    case 'attention':
      cmp = a.attention - b.attention
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      break
    case 'name':
      cmp = a.name.localeCompare(b.name)
      break
    case 'status':
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      break
    case 'compliance':
      cmp = a.compliance - b.compliance
      if (cmp === 0) cmp = a.completed - b.completed
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      break
    case 'lastWeek':
      cmp = a.lastWeekCompliance - b.lastWeekCompliance
      if (cmp === 0) cmp = a.lastWeekCompleted - b.lastWeekCompleted
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      break
    case 'nextRace': {
      const ad = a.nextRaceDays ?? Number.POSITIVE_INFINITY
      const bd = b.nextRaceDays ?? Number.POSITIVE_INFINITY
      cmp = ad - bd
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      break
    }
  }
  return cmp * mul
}

export function CoachAthletesTable({ athletes }: { athletes: CoachAthleteRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('attention')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Archived'>(
    'Active',
  )
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const expandPanelRef = useRef<HTMLDivElement | null>(null)
  useMockExpandScroll(expandedId, expandPanelRef)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' || key === 'nextRace' || key === 'status' ? 'asc' : 'desc')
  }

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id))
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = athletes.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        (a.warning?.toLowerCase().includes(q) ?? false) ||
        (a.nextRace?.toLowerCase().includes(q) ?? false) ||
        (a.attentionLabel?.toLowerCase().includes(q) ?? false) ||
        a.activity.some(
          (item) =>
            item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q),
        )
      )
    })
    return [...filtered].sort((a, b) => compareCoachAthletes(a, b, sortKey, sortDir))
  }, [athletes, query, sortKey, sortDir, statusFilter])

  const colSpan = COLUMNS.length + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint)]" />
          <input
            type="search"
            placeholder="Search athletes, race, warning…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-red)]/40"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'Active', 'Inactive', 'Archived'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                statusFilter === f
                  ? 'bg-[var(--tt-ink)] text-white'
                  : 'border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tt-mock-btn tt-mock-btn-primary ml-auto inline-flex items-center gap-1.5 !normal-case !tracking-normal"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add athlete
        </button>
      </div>

      <p className="tt-mock-caption">
        Sorted by{' '}
        <span className="font-semibold text-[var(--tt-ink)]">
          {COLUMNS.find((c) => c.key === sortKey)?.label}
        </span>{' '}
        · {sortDir === 'asc' ? 'ascending' : 'descending'} · {rows.length} shown ·{' '}
        <span className="text-[var(--tt-ink)]">To today</span> = sessions due Mon–today (skips
        show early) · click a row to expand
      </p>

      <div className="tt-mock-card overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)]">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-3 py-2.5 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                      sortKey === col.key ? 'text-[var(--tt-red)]' : 'text-[var(--tt-ink-faint)]'
                    } ${col.align === 'right' ? 'w-full justify-end' : ''}`}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="w-8 px-2 py-2.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-[var(--tt-ink-faint)]"
                >
                  No athletes match this filter
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const open = expandedId === a.id
                return (
                  <Fragment key={a.id}>
                    <tr
                      className={`group cursor-pointer border-b border-[var(--tt-line)] transition ${
                        open
                          ? 'border-b-0 bg-white shadow-[inset_3px_0_0_0_var(--tt-red)]'
                          : 'hover:bg-[var(--tt-bg)]'
                      }`}
                      onClick={() => toggleExpand(a.id)}
                      aria-expanded={open}
                    >
                      <td className="px-3 py-3 align-middle">
                        <AttentionCell row={a} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ${
                              open
                                ? 'bg-[var(--tt-red)] text-white ring-[var(--tt-red)]'
                                : 'bg-[var(--tt-sidebar)] ring-[var(--tt-line)]'
                            }`}
                          >
                            {a.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--tt-ink)]">{a.name}</p>
                            {a.warning ? (
                              <p className="truncate text-[11px] font-medium text-[var(--tt-red)]">
                                {a.warning}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <WeekCompletionCell
                          pct={a.compliance}
                          completed={a.completed}
                          planned={a.planned}
                          emphasize
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <WeekCompletionCell
                          pct={a.lastWeekCompliance}
                          completed={a.lastWeekCompleted}
                          planned={a.lastWeekPlanned}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {a.nextRace ? (
                          <span className="inline-flex max-w-[14rem] items-center gap-1.5 truncate text-[var(--tt-ink-soft)]">
                            <Flag
                              className="h-3.5 w-3.5 shrink-0 text-[var(--tt-red)]"
                              strokeWidth={1.75}
                            />
                            <span className="truncate">{a.nextRace}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--tt-ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-middle">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-[var(--tt-red)]" strokeWidth={2.25} />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[var(--tt-ink-faint)] opacity-60 transition group-hover:opacity-100" />
                        )}
                      </td>
                    </tr>
                    <tr
                      className={`tt-mock-athlete-expand-row border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)] ${
                        open ? 'shadow-[inset_3px_0_0_0_var(--tt-red)]' : ''
                      }`}
                    >
                      <td colSpan={colSpan} className="!p-0">
                        <MockExpandShell
                          open={open}
                          panelRef={expandPanelRef}
                          panelClassName="px-3 py-3 sm:px-4 sm:py-4"
                        >
                          <AthleteExpandPanel row={a} />
                        </MockExpandShell>
                      </td>
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
