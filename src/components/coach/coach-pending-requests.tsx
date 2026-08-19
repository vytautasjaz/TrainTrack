'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { FormError } from '@/components/ui/form-error'
import { respondCoachRequest } from '@/app/actions/auth'

export type PendingCoachRequest = {
  id: string
  athlete: { id: string; name: string }
}

type CoachPendingRequestsProps = {
  coachingCode: string
  requests: PendingCoachRequest[]
}

function CoachRequestRow({ link }: { link: PendingCoachRequest }) {
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
    <li className="flex flex-col gap-2 rounded-[6px] border border-border/60 bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{link.athlete.name}</span>
        <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => respond('accept')}
        >
          {isPending ? 'Saving…' : 'Accept'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => respond('reject')}
        >
          Reject
        </Button>
      </div>
      </div>
      <FormError message={error} />
    </li>
  )
}

export function CoachPendingRequests({ coachingCode, requests }: CoachPendingRequestsProps) {
  if (requests.length === 0) return null

  return (
    <section className="card-elevated space-y-4 border border-brand/20 bg-brand-soft/30 p-5">
      <div>
        <SectionTitle variant="ui">Pending athlete requests</SectionTitle>
        <Caption>
          {requests.length === 1
            ? '1 athlete wants to connect'
            : `${requests.length} athletes want to connect`}
          {' · '}
          Your code:{' '}
          <span className="font-semibold text-foreground">{coachingCode}</span>
        </Caption>
      </div>
      <ul className="space-y-2">
        {requests.map((link) => (
          <CoachRequestRow key={link.id} link={link} />
        ))}
      </ul>
    </section>
  )
}
