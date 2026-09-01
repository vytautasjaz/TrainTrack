'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import {
  WorkoutDetailView,
} from '@/components/plan/workout-detail-view'
import { Caption } from '@/components/ui/typography'
import { formatDateKeyCompact } from '@/lib/dates'
import { type CoachRosterChatThread } from '@/lib/coach-roster'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { queueCoachRosterSessionMarkRead } from '@/lib/coach-roster-session-reads'
import { cn } from '@/lib/utils'

export type CoachRosterThreadItem = {
  id: string
  unread: boolean
  preview: string
  lastMessageAt: string
  contextTitle: string | null
  contextSubtitle: string | null
  contextMetric: string | null
  contextDateKey: string | null
  isGeneral: boolean
  workoutDetail: PlanWorkoutDetail | null
  thread: CoachingThreadView
}

type CoachRosterThreadSplitProps = {
  generalChat: CoachRosterChatThread | null
  threads: CoachRosterChatThread[]
  emptyLabel: string
}

function toThreadItem(thread: CoachRosterChatThread): CoachRosterThreadItem {
  return {
    id: thread.id,
    unread: thread.unread,
    preview: thread.preview,
    lastMessageAt: thread.lastMessageAt,
    contextTitle: thread.contextTitle,
    contextSubtitle: thread.contextSubtitle,
    contextMetric: thread.contextMetric,
    contextDateKey: thread.contextDateKey,
    isGeneral: thread.threadKind === 'GENERAL',
    workoutDetail: thread.workoutDetail,
    thread: thread.thread,
  }
}

function threadRailHeadline(item: CoachRosterThreadItem) {
  if (item.isGeneral) return 'General chat'
  const title = item.contextTitle ?? 'Conversation'
  if (item.contextDateKey) {
    return `${formatDateKeyCompact(item.contextDateKey)} · ${title}`
  }
  return title
}

function sortByRecent(list: CoachRosterThreadItem[]) {
  return [...list].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )
}

function ThreadRailButton({
  item,
  active,
  sessionUnread,
  onSelect,
}: {
  item: CoachRosterThreadItem
  active: boolean
  sessionUnread: boolean
  onSelect: () => void
}) {
  const headline = threadRailHeadline(item)
  const metric = item.isGeneral ? item.preview : item.contextMetric
  const timeLabel = item.lastMessageAt
    ? formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })
    : null

  return (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      className={cn(
        'tt-coach-roster-thread-btn w-full cursor-pointer border-b border-[var(--tt-line)] px-3 py-2.5 text-left transition sm:px-4',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div className="flex items-start gap-2">
        {sessionUnread ? (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--tt-red)]"
            aria-label="Unread"
          />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className={cn(
              'truncate text-[12px] font-semibold leading-snug',
              sessionUnread ? 'text-[var(--tt-ink)]' : 'text-[var(--tt-ink-soft)]',
            )}
          >
            {headline}
          </p>
          {metric ? (
            <p className="truncate text-[11px] font-semibold tabular-nums leading-snug text-[var(--tt-ink)]">
              {metric}
            </p>
          ) : (
            <p className="truncate text-[11px] leading-snug text-[var(--tt-ink-faint)]">—</p>
          )}
          {timeLabel ? (
            <p className="truncate text-[10px] leading-snug text-[var(--tt-ink-faint)]">
              {timeLabel}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function CoachRosterWorkoutDetailPanel({
  workout,
  collapsed,
  onExpand,
  onCollapse,
}: {
  workout: PlanWorkoutDetail
  collapsed: boolean
  onExpand: () => void
  onCollapse: () => void
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        className="tt-coach-roster-detail-rail group flex h-full w-full cursor-pointer flex-col items-center gap-2 border-l border-[var(--tt-line)] bg-[var(--tt-bg,#fafafa)] px-1 py-3 transition hover:bg-white"
        onClick={(e) => {
          e.stopPropagation()
          onExpand()
        }}
        aria-label="Show workout detail"
        title={workout.title}
      >
        <ChevronLeft
          className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition group-hover:text-[var(--tt-ink)]"
          strokeWidth={2}
        />
        <span
          className="max-h-[12rem] truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-soft)] [writing-mode:vertical-rl] rotate-180"
          aria-hidden
        >
          {workout.title}
        </span>
      </button>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-[var(--tt-line)] bg-white">
      <WorkoutDetailView
        key={workout.id}
        workout={workout}
        isCoach
        active
        heroTone="light"
        showCloseButton
        hideCoachingThread
        onClose={onCollapse}
        className="h-full"
      />
    </div>
  )
}

export function CoachRosterThreadSplit({
  generalChat,
  threads,
  emptyLabel,
}: CoachRosterThreadSplitProps) {
  const router = useRouter()
  const generalItem = useMemo(
    () => (generalChat ? toThreadItem(generalChat) : null),
    [generalChat],
  )
  const allThreads = useMemo(() => sortByRecent(threads.map(toThreadItem)), [threads])
  const [sessionUnreadIds] = useState(() => {
    const ids = new Set(threads.filter((t) => t.unread).map((t) => t.id))
    if (generalChat?.unread) ids.add(generalChat.id)
    return ids
  })

  const [selectedId, setSelectedId] = useState<string | null>(
    () => generalItem?.id ?? allThreads[0]?.id ?? null,
  )
  const [detailCollapsed, setDetailCollapsed] = useState(false)

  const selected = useMemo(() => {
    if (generalItem && selectedId === generalItem.id) return generalItem
    return allThreads.find((t) => t.id === selectedId) ?? generalItem ?? null
  }, [allThreads, generalItem, selectedId])

  const showWorkoutDetail = Boolean(
    selected?.workoutDetail && !selected.workoutDetail.isRace,
  )

  useEffect(() => {
    setDetailCollapsed(false)
  }, [selectedId])

  useEffect(() => {
    if (selectedId) queueCoachRosterSessionMarkRead(selectedId)
  }, [selectedId])

  function handleMessageSent() {
    router.refresh()
  }

  function handleSelect(id: string) {
    setSelectedId(id)
  }

  if (!generalItem && allThreads.length === 0) {
    return <Caption className="py-8 text-center">{emptyLabel}</Caption>
  }

  const chatPane = (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {selected ? (
        <CoachingThreadPanel
          key={selected.id}
          thread={selected.thread}
          role="coach"
          compact
          dockComposer
          className="h-full px-3 py-3 sm:px-4"
          skipAutoRead
          onMessageSent={handleMessageSent}
          onUpdated={handleMessageSent}
        />
      ) : (
        <Caption className="flex flex-1 items-center justify-center px-3 py-8 text-center">
          Select a thread
        </Caption>
      )}
    </div>
  )

  return (
    <div
      className="grid min-h-[22rem] min-w-[44rem] grid-cols-[minmax(0,15rem)_minmax(0,1fr)] items-stretch divide-x divide-[var(--tt-line)] sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      onClick={(e) => e.stopPropagation()}
    >
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {generalItem ? (
          <div className="border-b border-[var(--tt-line)]">
            <p className="border-b border-[var(--tt-line)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint)] sm:px-4">
              General chat
            </p>
            <ThreadRailButton
              item={generalItem}
              active={selectedId === generalItem.id}
              sessionUnread={sessionUnreadIds.has(generalItem.id)}
              onSelect={() => handleSelect(generalItem.id)}
            />
          </div>
        ) : null}

        {allThreads.length > 0 ? (
          <>
            <p className="border-b border-[var(--tt-line)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint)] sm:px-4">
              Threads
            </p>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {allThreads.map((item) => (
                <li key={item.id}>
                  <ThreadRailButton
                    item={item}
                    active={item.id === selectedId}
                    sessionUnread={sessionUnreadIds.has(item.id)}
                    onSelect={() => handleSelect(item.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>

      <div className="tt-coach-roster-chat-split flex h-full min-h-[22rem] min-w-[28rem] flex-col">
        <div
          className={cn(
            'flex h-full min-h-0 min-w-[28rem] flex-1',
            showWorkoutDetail && 'divide-x divide-[var(--tt-line)]',
          )}
        >
          {chatPane}
          {showWorkoutDetail && selected?.workoutDetail ? (
            <div
              className={cn(
                'tt-coach-roster-detail-slot shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                detailCollapsed ? 'w-9' : 'w-[20rem] sm:w-[22rem]',
              )}
            >
              <CoachRosterWorkoutDetailPanel
                workout={selected.workoutDetail}
                collapsed={detailCollapsed}
                onExpand={() => setDetailCollapsed(false)}
                onCollapse={() => setDetailCollapsed(true)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
