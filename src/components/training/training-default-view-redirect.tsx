'use client'

import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrainingPageSkeleton } from '@/components/ui/route-skeletons'
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

  return <TrainingPageSkeleton />
}
