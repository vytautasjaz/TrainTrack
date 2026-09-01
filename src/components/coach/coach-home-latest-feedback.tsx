'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { CoachingThreadPanel } from '@/components/inbox/coaching-thread-panel'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { ExpandShell } from '@/components/ui/expand-shell'
import { formatDateKey } from '@/lib/dates'
import { type CoachRosterFeedbackItem } from '@/lib/coach-roster'

type CoachHomeLatestFeedbackProps = {
  items: CoachRosterFeedbackItem[]
}

export function CoachHomeLatestFeedback({ items }: CoachHomeLatestFeedbackProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <section>
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft)]">
          Latest feedback
        </p>
        <p className="mt-2 text-[13px] text-[var(--tt-ink-faint)]">No recent feedback yet.</p>
      </section>
    )
  }

  return (
    <section>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft)]">
        Latest feedback
      </p>
      <ul className="mt-2 divide-y divide-[var(--tt-line)] border-y border-[var(--tt-line)]">
        {items.map((item) => {
          const open = expandedId === item.id
          const headline = item.workoutTitle
            ? item.workoutDateKey
              ? `${formatDateKey(item.workoutDateKey)} · ${item.workoutTitle}`
              : item.workoutTitle
            : item.title

          return (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 py-3 text-left transition hover:bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_35%,white)]"
                onClick={() => setExpandedId(open ? null : item.id)}
              >
                <AthleteAvatar name={item.athleteName} avatarUrl={item.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
                      {item.athleteName}
                      <span className="font-normal text-[var(--tt-ink-soft)]"> · {headline}</span>
                    </p>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--tt-ink-faint)]">
                      {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--tt-ink-soft)]">{item.body}</p>
                </div>
              </button>
              <ExpandShell open={open}>
                <div className="pb-3">
                  <CoachingThreadPanel
                    thread={item.thread}
                    role="coach"
                    compact
                    dockComposer
                    className="min-h-[12rem]"
                    onUpdated={() => router.refresh()}
                  />
                </div>
              </ExpandShell>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
