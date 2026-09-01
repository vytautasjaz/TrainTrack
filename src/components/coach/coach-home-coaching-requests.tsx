'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { respondCoachRequest } from '@/app/actions/auth'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import {
  CoachHomePanelHeader,
  CoachHomePanelTable,
} from '@/components/coach/coach-home-panel'
import { FormError } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'

export type CoachHomeCoachingRequest = {
  id: string
  createdAt: string
  athlete: { id: string; name: string; avatarUrl: string | null }
}

type CoachHomeCoachingRequestsProps = {
  requests: CoachHomeCoachingRequest[]
}

export function CoachHomeCoachingRequests({ requests }: CoachHomeCoachingRequestsProps) {
  if (requests.length === 0) return null

  return (
    <section className="min-w-0">
      <CoachHomePanelHeader title="Coaching requests" count={requests.length} />
      <CoachHomePanelTable tableClassName="table-fixed">
        <colgroup>
          <col />
          <col className="w-[4.5rem]" />
          <col className="w-[9.5rem]" />
        </colgroup>
        <thead>
          <tr>
            <th>Athlete</th>
            <th className="text-right">When</th>
            <th className="pr-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <CoachingRequestRow key={request.id} request={request} />
          ))}
        </tbody>
      </CoachHomePanelTable>
    </section>
  )
}

function CoachingRequestRow({ request }: { request: CoachHomeCoachingRequest }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function respond(decision: 'accept' | 'reject') {
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('linkId', request.id)
        formData.set('decision', decision)
        await respondCoachRequest(formData)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not respond to request')
      }
    })
  }

  return (
    <tr>
      <td className="min-w-0 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <AthleteAvatar
            name={request.athlete.name}
            avatarUrl={request.athlete.avatarUrl}
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p
              className="truncate text-[13px] font-semibold leading-snug text-[var(--tt-ink)]"
              title={request.athlete.name}
            >
              {request.athlete.name}
            </p>
            <p className="text-[11px] text-[var(--tt-ink-faint)]">Wants to connect</p>
            {error ? <FormError message={error} className="mt-1" /> : null}
          </div>
        </div>
      </td>
      <td className="text-right align-middle">
        <span
          className="tt-data-cell-meta inline-block whitespace-nowrap tabular-nums text-[10px]"
          title={formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        >
          {compactRelativeTime(request.createdAt)}
        </span>
      </td>
      <td className="pr-3 text-right align-middle">
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond('accept')}
            className={cn(
              'rounded-full bg-[var(--tt-ink)] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {isPending ? '…' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond('reject')}
            className={cn(
              'rounded-full border border-[var(--tt-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)] transition',
              'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            Decline
          </button>
        </div>
      </td>
    </tr>
  )
}

function compactRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}
