'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/action-error'

export default function JoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[join]', error)
  }, [error])

  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Couldn’t open this invite</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {toUserMessage(error, 'Something went wrong with this coaching invite. Try again or open TrainTrack home.')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to TrainTrack</Link>
        </Button>
      </div>
    </div>
  )
}
