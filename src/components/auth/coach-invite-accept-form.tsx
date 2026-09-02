'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { isRedirectError, mapAuthActionError } from '@/lib/auth-form-errors'

type CoachInviteAcceptFormProps = {
  coachingCode: string
  coachName: string
  acceptAction: (formData: FormData) => Promise<void>
  declineAction: () => Promise<void>
}

export function CoachInviteAcceptForm({
  coachingCode,
  coachName,
  acceptAction,
  declineAction,
}: CoachInviteAcceptFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function acceptInvite() {
    setError(null)
    const formData = new FormData()
    formData.set('coachingCode', coachingCode)

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

  function declineInvite() {
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
      <Button type="button" className="w-full" disabled={isPending} onClick={acceptInvite}>
        {isPending ? 'Connecting…' : `Accept — train with ${coachName}`}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending}
        onClick={declineInvite}
      >
        Not now
      </Button>
    </div>
  )
}
