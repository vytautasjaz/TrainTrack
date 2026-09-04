'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startTraining } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { isRedirectError, mapAuthActionError } from '@/lib/auth-form-errors'

type CoachInviteStartTrainingFormProps = {
  coachingCode: string
  label?: string
}

/** Start Training on invite accept — shows inline errors instead of a blank crash. */
export function CoachInviteStartTrainingForm({
  coachingCode,
  label = 'Start Training & connect',
}: CoachInviteStartTrainingFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit() {
    setError(null)
    const formData = new FormData()
    formData.set('coachingCode', coachingCode)

    startTransition(async () => {
      try {
        await startTraining(formData)
        router.refresh()
      } catch (err) {
        if (isRedirectError(err)) throw err
        setError(mapAuthActionError(err, 'Could not start training. Try again.'))
      }
    })
  }

  return (
    <div className="space-y-2.5">
      {error ? (
        <p className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" className="w-full" disabled={isPending} onClick={onSubmit}>
        {isPending ? 'Connecting…' : label}
      </Button>
    </div>
  )
}
