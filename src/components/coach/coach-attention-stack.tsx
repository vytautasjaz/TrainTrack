'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { respondCoachRequest } from '@/app/actions/auth'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { ExpandShell } from '@/components/ui/expand-shell'
import { Caption, CardTitle } from '@/components/ui/typography'
import { formatDateKey } from '@/lib/dates'
import { type CoachNeedsReplySummary } from '@/lib/coach-roster'
import { cn } from '@/lib/utils'

type AttentionBlockId = 'requests' | 'underplanned' | 'replies'

type JoinRequest = {
  id: string
  athlete: { id: string; name: string }
  createdAt: Date
}

type UnderplannedItem = {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  lastPlannedKey: string | null
}

const BLOCKS: Array<{
  id: AttentionBlockId
  kind: 'request' | 'plan' | 'reply'
  title: string
  summary: string
}> = [
  {
    id: 'requests',
    kind: 'request',
    title: 'Join requests',
    summary: 'Athletes waiting to connect',
  },
  {
    id: 'underplanned',
    kind: 'plan',
    title: 'Under-planned',
    summary: 'Active athletes need more days planned ahead',
  },
  {
    id: 'replies',
    kind: 'reply',
    title: 'Needs reply',
    summary: 'Unread athlete messages in Inbox',
  },
]

function BlockIcon({ kind }: { kind: (typeof BLOCKS)[number]['kind'] }) {
  if (kind === 'request') {
    return <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
  }
  if (kind === 'plan') {
    return <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
  }
  return <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
}

function OpenPlanButton({ athleteId }: { athleteId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
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
        className="title-eyebrow font-semibold text-[var(--tt-ink)] hover:text-[var(--tt-red)] disabled:opacity-60"
      >
        {isPending ? 'Opening…' : 'Open plan →'}
      </button>
    </form>
  )
}

function JoinRequestRow({ link }: { link: JoinRequest }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function respond(decision: 'accept' | 'reject') {
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('linkId', link.id)
        formData.set('decision', decision)
        await respondCoachRequest(formData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not respond to request')
      }
    })
  }

  return (
    <li className="flex items-start gap-2.5 px-4 py-3">
      <AthleteAvatar name={link.athlete.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <CardTitle className="text-sm">{link.athlete.name}</CardTitle>
          <span className="tt-data-cell-meta">
            {formatDistanceToNow(link.createdAt, { addSuffix: true })}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" size="sm" disabled={isPending} onClick={() => respond('accept')}>
            {isPending ? 'Saving…' : 'Approve'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => respond('reject')}
          >
            Decline
          </Button>
        </div>
        <FormError message={error} />
      </div>
    </li>
  )
}

export type CoachAttentionStackProps = {
  joinRequests: JoinRequest[]
  coachingCode: string | null
  underplanned: UnderplannedItem[]
  needsReply: CoachNeedsReplySummary[]
  planningLeadDays: number
  hideReplies?: boolean
}

export function CoachAttentionStack({
  joinRequests,
  coachingCode,
  underplanned,
  needsReply,
  planningLeadDays,
  hideReplies = false,
}: CoachAttentionStackProps) {
  const visibleBlocks = hideReplies ? BLOCKS.filter((block) => block.id !== 'replies') : BLOCKS

  const [expandedId, setExpandedId] = useState<AttentionBlockId | null>(() => {
    if (joinRequests.length > 0) return 'requests'
    if (underplanned.length > 0) return 'underplanned'
    if (!hideReplies && needsReply.length > 0) return 'replies'
    return null
  })

  const counts = useMemo(
    () => ({
      requests: joinRequests.length,
      underplanned: underplanned.length,
      replies: hideReplies ? 0 : needsReply.length,
    }),
    [joinRequests.length, underplanned.length, needsReply.length, hideReplies],
  )

  const totalAttention = counts.requests + counts.underplanned + counts.replies
  if (totalAttention === 0) return null

  return (
    <div className="tt-surface-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)] px-4 py-2.5">
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--tt-red)]" strokeWidth={2} />
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-red)]">
          Needs attention
        </p>
      </div>

      <ul>
        {visibleBlocks.map((block) => {
          const count = counts[block.id]
          if (count === 0) return null
          const open = expandedId === block.id
          const summary =
            block.id === 'underplanned'
              ? `${count} athlete${count === 1 ? '' : 's'} · plan ${planningLeadDays} day${planningLeadDays === 1 ? '' : 's'} ahead`
              : block.summary

          return (
            <li key={block.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--tt-bg)]"
                aria-expanded={open}
                onClick={() => setExpandedId(open ? null : block.id)}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    open
                      ? 'bg-[var(--tt-red)] text-white'
                      : block.kind === 'request'
                        ? 'bg-[var(--tt-red)]/10 text-[var(--tt-red)]'
                        : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink-soft)]',
                  )}
                >
                  <BlockIcon kind={block.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">{block.title}</CardTitle>
                  <Caption className="truncate">{summary}</Caption>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--tt-red)]">
                  {count}
                </span>
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--tt-red)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" />
                )}
              </button>

              <ExpandShell
                open={open}
                scrollKey={open ? block.id : null}
                panelClassName="border-t border-[var(--tt-line)] bg-[var(--tt-bg)] font-sans text-sm"
              >
                {block.id === 'requests' ? (
                  <ul className="divide-y divide-[var(--tt-line)]">
                    {joinRequests.map((link) => (
                      <JoinRequestRow key={link.id} link={link} />
                    ))}
                  </ul>
                ) : null}
                {block.id === 'underplanned' ? (
                  <ul className="divide-y divide-[var(--tt-line)]">
                    {underplanned.map((item) => (
                      <li key={item.athleteId} className="flex items-start gap-2.5 px-4 py-3">
                        <AthleteAvatar
                          name={item.athleteName}
                          avatarUrl={item.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">{item.athleteName}</CardTitle>
                          <Caption className="mt-1 text-[var(--tt-ink)]">
                            <span className="text-[var(--tt-ink-faint)]">Last upcoming · </span>
                            {item.lastPlannedKey
                              ? formatDateKey(item.lastPlannedKey)
                              : 'No upcoming workouts'}
                          </Caption>
                          <div className="mt-2">
                            <OpenPlanButton athleteId={item.athleteId} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {block.id === 'replies' ? (
                  <ul className="divide-y divide-[var(--tt-line)]">
                    {needsReply.map((item) => (
                      <li key={item.athleteId} className="flex items-start gap-2.5 px-4 py-3">
                        <AthleteAvatar
                          name={item.athleteName}
                          avatarUrl={item.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                            <CardTitle className="text-sm">
                              {item.athleteName}
                              {item.count > 1 ? (
                                <span className="ml-1.5 text-caption font-semibold tabular-nums text-[var(--tt-red)]">
                                  · {item.count} need reply
                                </span>
                              ) : null}
                            </CardTitle>
                            <span className="tt-data-cell-meta shrink-0">
                              {formatDistanceToNow(new Date(item.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <Caption className="mt-0.5 line-clamp-2">{item.preview}</Caption>
                          <Link
                            href="/inbox"
                            className="title-eyebrow mt-2 inline-flex font-semibold text-[var(--tt-ink)] hover:text-[var(--tt-red)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open chat →
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ExpandShell>
            </li>
          )
        })}
      </ul>

      {coachingCode ? (
        <p className="border-t border-[var(--tt-line)] px-4 py-2.5 text-[11px] text-[var(--tt-ink-faint)]">
          Invite athletes via coaching code in Settings → Integrations ·{' '}
          <span className="font-semibold text-[var(--tt-ink-soft)]">{coachingCode}</span>
        </p>
      ) : null}
    </div>
  )
}
