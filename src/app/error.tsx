'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/action-error'
import { isStaleServerActionError } from '@/lib/auth-form-errors'

const STALE_CLIENT_RELOAD_KEY = 'tt-stale-client-reload'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const staleClient = isStaleServerActionError(error)

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    if (!staleClient) return
    if (sessionStorage.getItem(STALE_CLIENT_RELOAD_KEY) === '1') return
    sessionStorage.setItem(STALE_CLIENT_RELOAD_KEY, '1')
    window.location.reload()
  }, [staleClient])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {staleClient
          ? 'TrainTrack was updated. Reloading to fetch the latest version…'
          : toUserMessage(error, 'An unexpected error occurred.')}
      </p>
      {!staleClient ? (
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
