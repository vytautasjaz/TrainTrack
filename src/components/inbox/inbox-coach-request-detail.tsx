'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { respondCoachRequest } from '@/app/actions/auth'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { FormError } from '@/components/ui/form-error'
import type { InboxCoachRequest } from '@/lib/inbox-coach-requests'
import { cn } from '@/lib/utils'

type InboxCoachRequestDetailProps = {
  request: InboxCoachRequest
  coachingCode?: string | null
  embedded?: boolean
}

export function InboxCoachRequestDetail({
  request,
  coachingCode,
  embedded = false,
}: InboxCoachRequestDetailProps) {
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
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        embedded ? 'gap-3' : 'gap-4',
      )}
    >
      {!embedded ? (
        <div className="shrink-0">
          <p className="text-sm font-semibold text-[var(--tt-ink,#111)]">Coaching request</p>
          <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
            Review before connecting this athlete to your roster.
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          'rounded-[8px] border border-[color-mix(in_srgb,var(--tt-red)_28%,var(--tt-line))]',
          'bg-[color-mix(in_srgb,var(--tt-red)_6%,white)] p-4 shadow-[inset_3px_0_0_var(--tt-red)]',
        )}
      >
        <div className="flex items-start gap-3">
          <AthleteAvatar
            name={request.athlete.name}
            avatarUrl={request.athlete.avatarUrl}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tt-red)_14%,white)] text-[var(--tt-red)]">
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
              <p className="truncate text-base font-semibold text-[var(--tt-ink)]">
                {request.athlete.name}
              </p>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-[var(--tt-ink-soft)]">
              Wants to connect as your athlete. Approve to add them to your roster and share
              training plans.
            </p>
            {coachingCode ? (
              <p className="mt-2 text-[11px] text-[var(--tt-ink-faint)]">
                They used your coaching code{' '}
                <span className="font-semibold tabular-nums text-[var(--tt-ink-soft)]">
                  {coachingCode}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <FormError message={error} className="mt-3" />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond('accept')}
            className={cn(
              'rounded-full bg-[var(--tt-ink)] px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {isPending ? 'Saving…' : 'Approve athlete'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond('reject')}
            className={cn(
              'rounded-full border border-[var(--tt-line)] px-4 py-2 text-[12px] font-semibold text-[var(--tt-ink-soft)] transition',
              'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
