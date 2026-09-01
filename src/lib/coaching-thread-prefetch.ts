import type { CoachingThreadView } from '@/components/inbox/coaching-thread-panel'
import { loadWorkoutCoachingThread } from '@/app/actions/coaching-inbox'

type CacheEntry = {
  promise: Promise<CoachingThreadView | null>
  result?: CoachingThreadView | null
  settled: boolean
}

const threadCache = new Map<string, CacheEntry>()

function getEntry(workoutId: string): CacheEntry | undefined {
  return threadCache.get(workoutId)
}

/** Read cached thread after prefetch settled; undefined if not cached yet. */
export function readWorkoutCoachingThreadCache(
  workoutId: string,
): CoachingThreadView | null | undefined {
  const entry = getEntry(workoutId)
  if (!entry?.settled) return undefined
  return entry.result ?? null
}

export function setWorkoutCoachingThreadCache(
  workoutId: string,
  thread: CoachingThreadView | null,
) {
  threadCache.set(workoutId, {
    promise: Promise.resolve(thread),
    result: thread,
    settled: true,
  })
}

export function invalidateWorkoutCoachingThreadCache(workoutId: string) {
  threadCache.delete(workoutId)
}

/** Start or reuse an in-flight coaching thread fetch for a workout. */
export function prefetchWorkoutCoachingThread(
  workoutId: string,
): Promise<CoachingThreadView | null> {
  const existing = getEntry(workoutId)
  if (existing) return existing.promise

  const entry: CacheEntry = {
    settled: false,
    promise: Promise.resolve(null),
  }

  entry.promise = loadWorkoutCoachingThread(workoutId)
    .then((thread) => {
      entry.result = thread
      entry.settled = true
      return thread
    })
    .catch(() => {
      entry.result = null
      entry.settled = true
      return null
    })

  threadCache.set(workoutId, entry)
  return entry.promise
}
