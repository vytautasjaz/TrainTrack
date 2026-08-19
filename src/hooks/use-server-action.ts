'use client'

import { useCallback, useState, useTransition } from 'react'
import { toUserMessage } from '@/lib/action-error'

type RunOptions = {
  onSuccess?: () => void
  fallbackMessage?: string
}

export function useServerAction() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const clearError = useCallback(() => setError(null), [])

  const run = useCallback((action: () => Promise<void>, options?: RunOptions) => {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        options?.onSuccess?.()
      } catch (err) {
        setError(toUserMessage(err, options?.fallbackMessage))
      }
    })
  }, [])

  return { run, error, clearError, isPending }
}
