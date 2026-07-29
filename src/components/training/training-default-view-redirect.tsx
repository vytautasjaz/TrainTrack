'use client'

import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Matches Tailwind `lg` — desktop sidebar / week table breakpoint. */
const DESKTOP_MQ = '(min-width: 1024px)'

/**
 * When `/training` has no `view` query, send mobile → List and desktop → Week.
 */
export function TrainingDefaultViewRedirect() {
  const router = useRouter()

  useLayoutEffect(() => {
    const desktop = window.matchMedia(DESKTOP_MQ).matches
    router.replace(desktop ? '/training?view=week' : '/training?view=list')
  }, [router])

  return (
    <div className="pt-2 lg:pt-4" aria-busy="true" aria-label="Loading training">
      <div className="h-8 w-36 animate-pulse rounded-md bg-muted/60" />
      <div className="mt-4 h-10 w-full max-w-md animate-pulse rounded-md bg-muted/40" />
    </div>
  )
}
