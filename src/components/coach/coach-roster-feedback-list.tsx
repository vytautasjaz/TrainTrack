'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { loadCoachRosterFeedbackPage } from '@/app/actions/coach-roster-feedback'
import { Caption } from '@/components/ui/typography'
import { formatDateKey } from '@/lib/dates'
import { type CoachRosterFeedbackListItem } from '@/lib/coaching-inbox'

type CoachRosterFeedbackListProps = {
  athleteId: string
  initialItems: CoachRosterFeedbackListItem[]
  emptyLabel: string
}

function sortFeedback(items: CoachRosterFeedbackListItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )
}

function mergeFeedback(
  existing: CoachRosterFeedbackListItem[],
  incoming: CoachRosterFeedbackListItem[],
) {
  const map = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return sortFeedback([...map.values()])
}

export function CoachRosterFeedbackList({
  athleteId,
  initialItems,
  emptyLabel,
}: CoachRosterFeedbackListProps) {
  const [items, setItems] = useState(() => sortFeedback(initialItems))
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(initialItems.at(-1)?.lastMessageAt ?? null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const result = await loadCoachRosterFeedbackPage(athleteId, cursorRef.current ?? undefined)
      if (!result.ok || result.items.length === 0) {
        hasMoreRef.current = false
        setHasMore(false)
        return
      }
      setItems((prev) => mergeFeedback(prev, result.items))
      cursorRef.current = result.nextCursor
      hasMoreRef.current = result.nextCursor != null
      setHasMore(hasMoreRef.current)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    if (initialItems.length === 0) {
      void loadMore()
    }
  }, [initialItems.length, loadMore])

  useEffect(() => {
    const el = sentinelRef.current
    const root = el?.parentElement
    if (!el || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { root, rootMargin: '80px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  if (items.length === 0 && !loading) {
    return <Caption className="py-8 text-center">{emptyLabel}</Caption>
  }

  return (
    <div
      className="max-h-[18rem] overflow-y-auto overscroll-contain"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="divide-y divide-[var(--tt-line)]">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid gap-3 px-3 py-3 sm:grid-cols-2 sm:gap-4 sm:px-4 sm:py-3.5"
          >
            <div className="min-w-0">
              {item.workoutDateKey ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                  {formatDateKey(item.workoutDateKey)}
                </p>
              ) : null}
              <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--tt-ink)]">
                {item.workoutTitle ?? item.title}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--tt-ink-soft)]">{item.title}</p>
              <p className="mt-1 text-[10px] text-[var(--tt-ink-faint)]">
                {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-[var(--tt-line)] sm:pl-4">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="py-2 text-center">
        {loading ? (
          <Caption>Loading…</Caption>
        ) : hasMore ? (
          <Caption className="text-[var(--tt-ink-faint)]">Scroll for more</Caption>
        ) : items.length > 0 ? (
          <Caption className="text-[var(--tt-ink-faint)]">End of feedback</Caption>
        ) : null}
      </div>
    </div>
  )
}
