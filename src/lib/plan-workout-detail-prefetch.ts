import { getPlanWorkoutDetail } from '@/app/actions/workouts'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type CacheEntry = {
  promise: Promise<PlanWorkoutDetail | null>
  result?: PlanWorkoutDetail | null
  settled: boolean
}

const detailCache = new Map<string, CacheEntry>()

export function readPlanWorkoutDetailCache(
  workoutId: string,
): PlanWorkoutDetail | null | undefined {
  const entry = detailCache.get(workoutId)
  if (!entry?.settled) return undefined
  return entry.result ?? null
}

export function invalidatePlanWorkoutDetailCache(workoutId: string) {
  detailCache.delete(workoutId)
}

/** Start or reuse an in-flight full workout fetch for modal open. */
export function prefetchPlanWorkoutDetail(
  workoutId: string,
): Promise<PlanWorkoutDetail | null> {
  const existing = detailCache.get(workoutId)
  if (existing) return existing.promise

  const entry: CacheEntry = {
    settled: false,
    promise: Promise.resolve(null),
  }

  entry.promise = getPlanWorkoutDetail(workoutId)
    .then((detail) => {
      entry.result = detail
      entry.settled = true
      return detail
    })
    .catch(() => {
      entry.result = null
      entry.settled = true
      return null
    })

  detailCache.set(workoutId, entry)
  return entry.promise
}
