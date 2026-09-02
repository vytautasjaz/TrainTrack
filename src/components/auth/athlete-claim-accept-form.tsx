'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { isRedirectError, mapAuthActionError } from '@/lib/auth-form-errors'

type AthleteClaimAcceptFormProps = {
  claimToken: string
  athleteName: string
  coachName: string
  acceptAction: (formData: FormData) => Promise<void>
  declineAction: () => Promise<void>
}

export function AthleteClaimAcceptForm({
  claimToken,
  athleteName,
  coachName,
  acceptAction,
  declineAction,
}: AthleteClaimAcceptFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function acceptClaim() {
    setError(null)
    const formData = new FormData()
    formData.set('claimToken', claimToken)

    startTransition(async () => {
      try {
        await acceptAction(formData)
        router.refresh()
      } catch (err) {
        if (isRedirectError(err)) throw err
        setError(mapAuthActionError(err))
      }
    })
  }

  function declineClaim() {
    setError(null)
    startTransition(async () => {
      try {
        await declineAction()
        router.refresh()
      } catch (err) {
        if (isRedirectError(err)) throw err
        setError(mapAuthActionError(err))
      }
    })
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" className="w-full" disabled={isPending} onClick={acceptClaim}>
        {isPending ? 'Connecting…' : `Accept — continue as ${athleteName}`}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        You&apos;ll train with {coachName} using the plan they already started for you.
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending}
        onClick={declineClaim}
      >
        Not now
      </Button>
    </div>
  )
}
