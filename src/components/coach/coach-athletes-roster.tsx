'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { CalendarRange, ChevronDown, ChevronRight, Flag, Link2, MessageCircle, MessageSquare, Plus, Search, UserRound } from 'lucide-react'
import type { AthleteStatus } from '@prisma/client'
import { createAthlete } from '@/app/actions/workouts'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'
import { CoachRosterThreadSplit } from '@/components/coach/coach-roster-thread-split'
import { CoachRosterProfilePanel } from '@/components/coach/coach-roster-profile-panel'
import { CoachRosterFeedbackList } from '@/components/coach/coach-roster-feedback-list'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteStatusPill } from '@/components/coach/athlete-status-pill'
import { Button } from '@/components/ui/button'
import { DataSortHeader, type DataSortDir } from '@/components/ui/data-sort-header'
import { ExpandShell } from '@/components/ui/expand-shell'
import { Input } from '@/components/ui/input'
import { athleteStatusLabel } from '@/lib/athlete-status'
import { type CoachRosterRow } from '@/lib/coach-roster'
import {
  flushCoachRosterSessionMarkReads,
  installCoachRosterSessionReadFlush,
} from '@/lib/coach-roster-session-reads'
import { DATA_TABLE, DATA_TABLE_SHELL } from '@/lib/table-styles'
import { cn } from '@/lib/utils'

type SortKey = 'attention' | 'name' | 'status' | 'compliance' | 'lastWeek' | 'nextRace'

const STATUS_ORDER: Record<AthleteStatus, number> = {
  ACTIVE: 0,
  INACTIVE: 1,
  ARCHIVED: 2,
}

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'attention', label: 'Attention' },
  { key: 'name', label: 'Athlete' },
  { key: 'status', label: 'Status' },
  { key: 'compliance', label: 'To today', align: 'right' },
  { key: 'lastWeek', label: 'Last week', align: 'right' },
  { key: 'nextRace', label: 'Next race' },
]

function complianceBarColor(pct: number) {
  if (pct >= 80) return 'var(--tt-good)'
  if (pct >= 50) return 'var(--tt-sport-run)'
  if (pct > 0) return 'var(--tt-red)'
  return 'var(--tt-ink-faint)'
}

function WeekCompletionCell({
  pct,
  completed,
  planned,
  emphasize = false,
}: {
  pct: number
  completed: number
  planned: number
  emphasize?: boolean
}) {
  if (planned <= 0) {
    return <span className="tt-data-cell-meta">—</span>
  }

  const skipped = completed < planned

  return (
    <div
      className={cn(
        'ml-auto flex flex-col items-end',
        emphasize ? 'w-[8.5rem] gap-1' : 'w-[7.5rem] gap-0.5',
      )}
    >
      <div
        className={cn(
          'tt-data-num flex items-baseline gap-1.5',
          emphasize ? 'tt-data-cell-primary' : 'tt-data-cell-secondary',
          skipped && emphasize && 'text-[var(--tt-red)]',
        )}
      >
        <span>
          {completed}/{planned}
        </span>
        <span className={emphasize ? 'tt-data-cell-secondary font-normal' : 'tt-data-cell-meta'}>
          {pct}%
        </span>
      </div>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-[var(--tt-sidebar)]',
          emphasize ? 'h-1.5' : 'h-1',
        )}
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

function AttentionCell({ row }: { row: CoachRosterRow }) {
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
    <span className={cn('tt-data-cell-secondary font-semibold', tone)} title={row.warning ?? row.attentionLabel}>
      {row.attentionLabel}
    </span>
  )
}

function compareRows(a: CoachRosterRow, b: CoachRosterRow, key: SortKey, dir: DataSortDir) {
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

const ROSTER_TAB_ICON = 'h-3.5 w-3.5 shrink-0'

function OpenPlanTab({ athleteId }: { athleteId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <form
      className="flex h-full w-full items-stretch"
      action={(formData) => {
        startTransition(async () => {
          await selectAthleteForTraining(formData)
        })
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <button
        type="submit"
        disabled={isPending}
        data-active="false"
        className="tt-coach-roster-expand-tab flex w-full cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 transition disabled:opacity-60"
      >
        <CalendarRange className={ROSTER_TAB_ICON} strokeWidth={1.75} aria-hidden />
        <span className="title-eyebrow font-semibold">
          {isPending ? 'OPENING…' : 'OPEN PLAN'}
        </span>
      </button>
    </form>
  )
}

function AthleteExpandPanel({ row }: { row: CoachRosterRow }) {
  const [tab, setTab] = useState<'chat' | 'feedback' | 'profile'>(() =>
    row.unreadChatCount > 0 ? 'chat' : row.feedback.length > 0 ? 'feedback' : 'chat',
  )
  const sessionChatUnreadRef = useRef(row.unreadChatCount)

  const tabBtnClass = (active: boolean, bordered: boolean) =>
    cn(
      'tt-coach-roster-expand-tab flex cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 transition',
      bordered && 'border-r border-[var(--tt-line)]',
      active && 'relative z-[1]',
    )

  return (
    <div className="tt-coach-roster-expand min-w-0 font-sans text-sm">
      <div
        className="tt-coach-roster-expand-tabs grid grid-cols-4 border-b border-[var(--tt-line)]"
        role="tablist"
        aria-label="Athlete activity"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          data-active={tab === 'chat' ? 'true' : 'false'}
          onClick={(e) => {
            e.stopPropagation()
            setTab('chat')
          }}
          className={tabBtnClass(tab === 'chat', true)}
        >
          <MessageCircle className={ROSTER_TAB_ICON} strokeWidth={1.75} aria-hidden />
          <span className="title-eyebrow font-semibold">Chat</span>
          {sessionChatUnreadRef.current > 0 ? (
            <span className="text-caption tabular-nums font-semibold normal-case tracking-normal text-[var(--tt-red)]">
              {sessionChatUnreadRef.current}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'feedback'}
          data-active={tab === 'feedback' ? 'true' : 'false'}
          onClick={(e) => {
            e.stopPropagation()
            setTab('feedback')
          }}
          className={tabBtnClass(tab === 'feedback', true)}
        >
          <MessageSquare className={ROSTER_TAB_ICON} strokeWidth={1.75} aria-hidden />
          <span className="title-eyebrow font-semibold">Feedback</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'profile'}
          data-active={tab === 'profile' ? 'true' : 'false'}
          onClick={(e) => {
            e.stopPropagation()
            setTab('profile')
          }}
          className={tabBtnClass(tab === 'profile', true)}
        >
          <UserRound className={ROSTER_TAB_ICON} strokeWidth={1.75} aria-hidden />
          <span className="title-eyebrow font-semibold">View profile</span>
        </button>

        <OpenPlanTab athleteId={row.id} />
      </div>

      {tab === 'chat' ? (
        <CoachRosterThreadSplit
          generalChat={row.generalChatThread}
          threads={row.chatThreads}
          emptyLabel="No chat threads yet."
        />
      ) : null}

      {tab === 'feedback' ? (
        <CoachRosterFeedbackList
          athleteId={row.id}
          initialItems={row.feedback.map((item) => ({
            id: item.id,
            preview: item.preview,
            lastMessageAt: item.lastMessageAt,
            title: item.title,
            body: item.body,
            workoutTitle: item.workoutTitle,
            workoutDateKey: item.workoutDateKey,
          }))}
          emptyLabel="No feedback yet."
        />
      ) : null}

      {tab === 'profile' ? <CoachRosterProfilePanel row={row} /> : null}
    </div>
  )
}

export function CoachAthletesRoster({
  athletes,
  coachingCode = null,
}: {
  athletes: CoachRosterRow[]
  coachingCode?: string | null
}) {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    installCoachRosterSessionReadFlush()
  }, [])

  useEffect(() => {
    if (pathnameRef.current === pathname) return
    pathnameRef.current = pathname
    void flushCoachRosterSessionMarkReads()
  }, [pathname])

  const [sortKey, setSortKey] = useState<SortKey>('attention')
  const [sortDir, setSortDir] = useState<DataSortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<'All' | AthleteStatus>('ACTIVE')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' || key === 'nextRace' || key === 'status' ? 'asc' : 'desc')
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
        (a.attentionLabel?.toLowerCase().includes(q) ?? false)
      )
    })
    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir))
  }, [athletes, query, sortKey, sortDir, statusFilter])

  const colSpan = COLUMNS.length + 1
  const activeCount = athletes.filter((a) => a.status === 'ACTIVE').length
  const attentionCount = athletes.filter((a) => a.attention > 0).length

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
            className="w-full rounded-[10px] border border-[var(--tt-line)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-red)]/40"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
                statusFilter === f
                  ? 'bg-[var(--tt-ink)] text-white'
                  : 'border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)]',
              )}
            >
              {f === 'All' ? 'All' : athleteStatusLabel(f)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {coachingCode ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="inline-flex items-center gap-1.5"
              onClick={() => {
                setShowInvite((v) => !v)
                setShowAdd(false)
              }}
            >
              <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
              Invite athlete
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="inline-flex items-center gap-1.5"
            onClick={() => {
              setShowAdd((v) => !v)
              setShowInvite(false)
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add athlete
          </Button>
        </div>
      </div>

      {showInvite && coachingCode ? (
        <div className="tt-surface-card px-4 py-4">
          <CoachInviteLinkPanel coachingCode={coachingCode} compact />
        </div>
      ) : null}

      {showAdd ? (
        <div className="tt-surface-card px-4 py-4">
          <form action={createAthlete} className="flex flex-wrap gap-2">
            <Input name="name" placeholder="Athlete name" required className="min-w-[12rem] flex-1" />
            <Button type="submit" variant="secondary" size="sm">
              Create
            </Button>
          </form>
        </div>
      ) : null}

      <p className="page-header-description">
        {activeCount} active · {attentionCount} need attention · {rows.length} shown ·{' '}
        <span className="text-[var(--tt-ink)]">To today</span> = Mon–today · click a row to expand
      </p>

      <div className={DATA_TABLE_SHELL}>
        <table className={cn(DATA_TABLE, 'tt-coach-roster-table min-w-[44rem] text-sm')} data-density="comfortable">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
                  <DataSortHeader
                    label={col.label}
                    active={sortKey === col.key}
                    dir={sortKey === col.key ? sortDir : null}
                    onClick={() => toggleSort(col.key)}
                    className={col.align === 'right' ? 'w-full justify-end' : undefined}
                  />
                </th>
              ))}
              <th className="w-8" aria-hidden />
            </tr>
          </thead>
          {rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={colSpan} className="py-10 text-center text-[var(--tt-ink-faint)]">
                  No athletes match this filter
                </td>
              </tr>
            </tbody>
          ) : (
            rows.map((row) => {
              const open = expandedId === row.id
              return (
                <tbody
                  key={row.id}
                  className={cn('tt-coach-roster-group', open && 'tt-coach-roster-expanded-group')}
                >
                  <tr
                    className={cn(
                      'tt-coach-roster-main-row group cursor-pointer transition',
                      open
                        ? 'tt-coach-roster-expanded-main border-b-0'
                        : 'hover:bg-[var(--tt-bg)]',
                    )}
                    onClick={() => setExpandedId(open ? null : row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpandedId(open ? null : row.id)
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={open}
                  >
                      <td className="cursor-pointer">
                        <AttentionCell row={row} />
                      </td>
                      <td className="cursor-pointer">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <AthleteAvatar
                            name={row.name}
                            size="sm"
                            className={cn(
                              open && 'bg-[var(--tt-red)] text-white ring-[var(--tt-red)]',
                            )}
                          />
                          <div className="min-w-0">
                            <span className="tt-data-cell-primary truncate">{row.name}</span>
                            {row.warning ? (
                              <p className="tt-data-cell-secondary truncate font-medium text-[var(--tt-red)]">
                                {row.warning}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="cursor-default">
                        <AthleteStatusPill athleteId={row.id} status={row.status} size="sm" />
                      </td>
                      <td className="cursor-pointer">
                        <WeekCompletionCell
                          pct={row.compliance}
                          completed={row.completed}
                          planned={row.planned}
                          emphasize
                        />
                      </td>
                      <td className="cursor-pointer">
                        <WeekCompletionCell
                          pct={row.lastWeekCompliance}
                          completed={row.lastWeekCompleted}
                          planned={row.lastWeekPlanned}
                        />
                      </td>
                      <td className="cursor-pointer">
                        {row.nextRace ? (
                          <span className="tt-data-cell-secondary inline-flex max-w-[14rem] items-center gap-1.5 truncate">
                            <Flag className="h-3.5 w-3.5 shrink-0 text-[var(--tt-red)]" strokeWidth={1.75} />
                            <span className="truncate">{row.nextRace}</span>
                          </span>
                        ) : (
                          <span className="tt-data-cell-meta">—</span>
                        )}
                      </td>
                      <td className="cursor-pointer">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-[var(--tt-red)]" strokeWidth={2.25} />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[var(--tt-ink-faint)] opacity-60 group-hover:opacity-100" />
                        )}
                      </td>
                    </tr>
                  <tr
                    className={cn(
                      'tt-expand-row tt-coach-roster-expand-row',
                      open && 'tt-coach-roster-expanded-detail',
                    )}
                  >
                    <td colSpan={colSpan} className="!p-0">
                      <ExpandShell open={open}>
                        <AthleteExpandPanel row={row} />
                      </ExpandShell>
                    </td>
                  </tr>
                </tbody>
              )
            })
          )}
        </table>
      </div>
    </div>
  )
}
