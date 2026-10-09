/**
 * Session load classification for weekly stress budgeting.
 * Prefer structure-derived WorkoutLoad (v1) when available; fall back to tags.
 */
import type { CandidateWorkout, PlannedSession } from '@/lib/coach-engine/types'
import type { LongIntensityProfile } from '@/lib/coach-engine/long-run-target'
import type { AthleteLevel } from '@/lib/coach-engine/types'
import {
  calculateWorkoutLoad,
  sessionLoadClassFromWorkoutLoad,
} from '@/lib/training-load/workout-load'
import { hasStructureContent } from '@/lib/workout-builder/utils'

export type SessionLoadClass = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

const LOAD_COST: Record<SessionLoadClass, number> = {
  LOW: 5,
  MODERATE: 12,
  HIGH: 22,
  VERY_HIGH: 32,
}

/** Soft weekly high-load budget (sum of session costs). */
export function weeklyStressBudget(level: AthleteLevel): number {
  switch (level) {
    case 'beginner':
      return 100
    case 'intermediate':
      return 120
    case 'advanced':
      return 145
    case 'elite':
      return 170
  }
}

export function loadCost(cls: SessionLoadClass): number {
  return LOAD_COST[cls]
}

export function classifyLongIntensity(
  profile: LongIntensityProfile | null | undefined,
): SessionLoadClass {
  switch (profile) {
    case 'race_specific':
    case 'fast_finish':
      return 'VERY_HIGH'
    case 'progressive':
      return 'HIGH'
    case 'steady_finish':
      return 'MODERATE'
    case 'aerobic':
    default:
      return 'HIGH' // long distance is always meaningful mechanical load
  }
}

export function classifyCandidateLoad(
  candidate: CandidateWorkout,
  opts?: {
    stimulus?: string
    longIntensityProfile?: LongIntensityProfile | null
    doubleThreshold?: boolean
  },
): SessionLoadClass {
  if (opts?.doubleThreshold) return 'VERY_HIGH'
  if (opts?.stimulus === 'long') {
    return classifyLongIntensity(opts.longIntensityProfile)
  }
  if (opts?.stimulus === 'race') return 'VERY_HIGH'
  if (opts?.stimulus === 'recovery' || opts?.stimulus === 'rest') return 'LOW'
  if (opts?.stimulus === 'easy') {
    if (candidate.tags.some((t) => /stride|pickup/i.test(t))) return 'MODERATE'
    return 'LOW'
  }

  const tags = candidate.tags.join(' ').toLowerCase()
  const title = candidate.title.toLowerCase()
  const blob = `${tags} ${title}`

  if (/race-day|race simulation|benchmark/i.test(blob)) return 'VERY_HIGH'
  if (
    /vo2|vo₂|mile \/ 1500|hard hill|race-specific long/i.test(blob) ||
    candidate.difficulty === 'hard'
  ) {
    return 'HIGH'
  }
  if (
    /hm-specific|mp-specific|race-pace|threshold|tempo|interval/i.test(blob)
  ) {
    // Large threshold / race-pace volumes are HIGH; short intros MODERATE.
    if (
      (candidate.intervalCount ?? 0) >= 6 ||
      (candidate.intervalDurationMin ?? 0) >= 6 ||
      (candidate.durationMin ?? 0) >= 55
    ) {
      return 'HIGH'
    }
    return 'MODERATE'
  }
  if (/stride|speed|fartlek|hill/i.test(blob)) return 'MODERATE'
  return 'LOW'
}

export function classifyPlannedSessionLoad(
  session: PlannedSession,
): SessionLoadClass {
  const tags = (session.tags ?? []).join(' ').toLowerCase()
  if (tags.includes('double-threshold')) return 'VERY_HIGH'
  if (tags.includes('race-day')) return 'VERY_HIGH'

  if (hasStructureContent(session.structure ?? null)) {
    const load = calculateWorkoutLoad({
      structure: session.structure,
      sport: session.type,
      sessionType: session.sessionType,
      plannedDurationMin: session.plannedDuration,
      plannedDistanceKm: session.plannedDistance,
      tags: session.tags,
      title: session.title,
    })
    return sessionLoadClassFromWorkoutLoad(load)
  }

  if (session.sessionType === 'LONG_RUN') {
    if (/hm-specific|mp-specific|race-pace|threshold|fartlek/i.test(tags)) {
      return 'VERY_HIGH'
    }
    if (/progress|steady/i.test(tags)) return 'HIGH'
    return 'HIGH'
  }
  if (
    session.sessionType === 'RECOVERY_RUN' ||
    session.sessionType === 'EASY_RUN'
  ) {
    return tags.includes('stride') ? 'MODERATE' : 'LOW'
  }
  if (
    /vo2|hm-specific|mp-specific|race-pace/i.test(tags) ||
    session.sessionType === 'RACE_PACE' ||
    session.sessionType === 'VO2_MAX'
  ) {
    return 'HIGH'
  }
  if (session.sessionType === 'THRESHOLD' || session.sessionType === 'TEMPO') {
    return (session.plannedDuration ?? 0) >= 55 ? 'HIGH' : 'MODERATE'
  }
  return 'MODERATE'
}

/** Sum session costs; optionally count unique high-load calendar days. */
export function summarizeWeekLoad(sessions: PlannedSession[]): {
  totalCost: number
  highLoadDays: number
  qualitySessionCount: number
} {
  let totalCost = 0
  const highDays = new Set<number>()
  let qualitySessionCount = 0
  for (const s of sessions) {
    const cls = classifyPlannedSessionLoad(s)
    totalCost += loadCost(cls)
    if (cls === 'HIGH' || cls === 'VERY_HIGH') {
      highDays.add(s.dayOfWeek)
    }
    if (
      s.sessionType === 'THRESHOLD' ||
      s.sessionType === 'TEMPO' ||
      s.sessionType === 'VO2_MAX' ||
      s.sessionType === 'RACE_PACE' ||
      (s.tags ?? []).some((t) => /quality|hm-specific|threshold|vo2/i.test(t))
    ) {
      // Double-threshold AM+PM = two quality sessions, one high-load day.
      qualitySessionCount += 1
    }
  }
  return {
    totalCost,
    highLoadDays: highDays.size,
    qualitySessionCount,
  }
}
