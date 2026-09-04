'use client'

import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  readStoredTrainingDefaultView,
  resolveTrainingDefaultView,
  trainingDefaultViewHref,
  type TrainingDefaultViewRole,
} from '@/lib/training-default-view'

/** Matches Tailwind `lg` — desktop sidebar / week table breakpoint. */
const DESKTOP_MQ = '(min-width: 1024px)'

type TrainingDefaultViewRedirectProps = {
  role: TrainingDefaultViewRole
}

/**
 * When `/training` has no `view` query, open the user's preferred layout
 * (Settings), else mobile → List and desktop → Week.
 */
export function TrainingDefaultViewRedirect({
  role,
}: TrainingDefaultViewRedirectProps) {
  const router = useRouter()

  useLayoutEffect(() => {
    const desktop = window.matchMedia(DESKTOP_MQ).matches
    const view = resolveTrainingDefaultView(
      readStoredTrainingDefaultView(role),
      desktop,
    )
    router.replace(trainingDefaultViewHref(view))
  }, [router, role])

  return (
    <div className="pt-2 lg:pt-4" aria-busy="true" aria-label="Loading training">
      <div className="h-8 w-36 animate-pulse rounded-md bg-muted/60" />
      <div className="mt-4 h-10 w-full max-w-md animate-pulse rounded-md bg-muted/40" />
    </div>
  )
}
