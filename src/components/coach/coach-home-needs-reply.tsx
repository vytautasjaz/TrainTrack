'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { CoachingThreadPanel } from '@/components/inbox/coaching-thread-panel'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { ExpandShell } from '@/components/ui/expand-shell'
import { formatDateKeyCompact } from '@/lib/dates'
import { type CoachHomeNeedsReplyThread } from '@/lib/coach-roster'

type CoachHomeNeedsReplyProps = {
  threads: CoachHomeNeedsReplyThread[]
}

function threadHeadline(item: CoachHomeNeedsReplyThread) {
  if (item.threadKind === 'GENERAL') return 'General chat'
  const title = item.contextTitle ?? 'Conversation'
  if (item.contextDateKey) {
    return `${formatDateKeyCompact(item.contextDateKey)} · ${title}`
  }
  return title
}

export function CoachHomeNeedsReply({ threads }: CoachHomeNeedsReplyProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(
    threads.length === 1 ? threads[0]!.id : null,
  )

  if (threads.length === 0) {
    return (
      <section>
        <SectionHeading title="Needs reply" count={0} />
        <p className="mt-2 text-[13px] text-[var(--tt-ink-faint)]">No threads waiting for a reply.</p>
      </section>
    )
  }

  return (
    <section>
      <SectionHeading title="Needs reply" count={threads.length} />
      <ul className="mt-2 divide-y divide-[var(--tt-line)] border-y border-[var(--tt-line)]">
        {threads.map((item) => {
          const open = expandedId === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 px-0 py-3 text-left transition hover:bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_35%,white)]"
                data-active={open ? 'true' : 'false'}
                onClick={() => setExpandedId(open ? null : item.id)}
              >
                <AthleteAvatar
                  name={item.athleteName}
                  avatarUrl={item.avatarUrl}
                  size="sm"
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-[13px] font-semibold text-[var(--tt-ink)]">
                      {item.athleteName}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--tt-ink-faint)]">
                      {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[var(--tt-ink-soft)]">
                    {threadHeadline(item)}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[13px] text-[var(--tt-ink-soft)]">
                    {item.preview}
                  </span>
                </span>
              </button>
              <ExpandShell open={open}>
                <div className="pb-3">
                  <CoachingThreadPanel
                    thread={item.thread}
                    role="coach"
                    compact
                    dockComposer
                    className="min-h-[14rem]"
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

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft)]">
        {title}
      </p>
      {count > 0 ? (
        <span className="text-[12px] tabular-nums text-[var(--tt-red)]">{count}</span>
      ) : null}
    </div>
  )
}
