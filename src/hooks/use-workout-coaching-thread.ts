'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CoachingThreadView } from '@/components/inbox/coaching-thread-panel'
import {
  invalidateWorkoutCoachingThreadCache,
  prefetchWorkoutCoachingThread,
  readWorkoutCoachingThreadCache,
} from '@/lib/coaching-thread-prefetch'

export function useWorkoutCoachingThread(workoutId: string | undefined) {
  const [thread, setThread] = useState<CoachingThreadView | null>(() => {
    if (!workoutId) return null
    const cached = readWorkoutCoachingThreadCache(workoutId)
    return cached === undefined ? null : cached
  })
  const [ready, setReady] = useState(() => {
    if (!workoutId) return true
    return readWorkoutCoachingThreadCache(workoutId) !== undefined
  })

  useEffect(() => {
    if (!workoutId) {
      setThread(null)
      setReady(true)
      return
    }

    const cached = readWorkoutCoachingThreadCache(workoutId)
    if (cached !== undefined) {
      setThread(cached)
      setReady(true)
    } else {
      setReady(false)
    }

    let cancelled = false
    void prefetchWorkoutCoachingThread(workoutId).then((next) => {
      if (!cancelled) {
        setThread(next)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [workoutId])

  const reload = useCallback(async () => {
    if (!workoutId) return null
    invalidateWorkoutCoachingThreadCache(workoutId)
    setReady(false)
    const next = await prefetchWorkoutCoachingThread(workoutId)
    setThread(next)
    setReady(true)
    return next
  }, [workoutId])

  return { thread, ready, reload, setThread }
}
