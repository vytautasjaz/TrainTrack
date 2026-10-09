/**
 * Week volume / threshold dose guards used after session selection.
 * Blueprint targets are soft; these keep actual km and threshold work honest.
 */
import type { PlannedSession, WorkoutAdaptations } from '@/lib/coach-engine/types'
import type { CandidateWorkout } from '@/lib/coach-engine/types'
import { getWorkoutById } from '@/lib/coach-engine/library'
import {
  scaleStructureVolume,
  syncCopyFromStructure,
} from '@/lib/coach-engine/session-copy'
import {
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Estimate main-set threshold work minutes from sample + adaptations. */
export function estimateThresholdWorkMin(
  candidate: CandidateWorkout,
  adaptations?: WorkoutAdaptations | null,
): number {
  const count = adaptations?.intervalCount ?? candidate.intervalCount
  let dur = adaptations?.intervalDurationMin ?? candidate.intervalDurationMin
  if (count == null || count < 1) return 0
  // Distance-based reps (e.g. 3 km) often store duration as ~pace estimate;
  // if missing, assume ~4.5 min/km from tags/title.
  if (dur == null || dur <= 0) {
    const kmMatch = candidate.title.match(/(\d+(?:\.\d+)?)\s*km/i)
    const km = kmMatch ? Number(kmMatch[1]) : null
    dur = km != null ? km * 4.5 : 5
  }
  return Math.round(count * dur)
}

/**
 * Cap threshold work so we never prescribe ~15 km threshold in one session
 * when the week target is ~25–32′ of controlled work.
 */
export function clampThresholdAdaptations(args: {
  candidate: CandidateWorkout
  adaptations: WorkoutAdaptations
  maxWorkMin: number | null | undefined
}): WorkoutAdaptations {
  const maxWork = args.maxWorkMin
  if (maxWork == null || maxWork <= 0) return args.adaptations
  if (
    args.candidate.primaryAdaptation !== 'threshold' &&
    args.candidate.sessionType !== 'THRESHOLD'
  ) {
    return args.adaptations
  }

  const adaptations = { ...args.adaptations }
  const baseCount = adaptations.intervalCount ?? args.candidate.intervalCount
  let dur =
    adaptations.intervalDurationMin ?? args.candidate.intervalDurationMin
  if (baseCount == null || baseCount < 1) return adaptations
  if (dur == null || dur <= 0) {
    const kmMatch = args.candidate.title.match(/(\d+(?:\.\d+)?)\s*km/i)
    dur = kmMatch ? Number(kmMatch[1]) * 4.5 : 5
    adaptations.intervalDurationMin = Math.round(dur * 10) / 10
  }

  let count = baseCount
  let work = count * dur
  if (work <= maxWork) return adaptations

  // Prefer fewer reps over shortening each rep (keeps stimulus honest).
  count = Math.max(2, Math.floor(maxWork / dur))
  work = count * dur
  if (work > maxWork && dur > 4) {
    const shorter = Math.max(3, Math.floor(maxWork / count))
    adaptations.intervalDurationMin = shorter
    adaptations.intervalCount = count
  } else {
    adaptations.intervalCount = count
  }
  return adaptations
}

/** Prefer samples whose catalog work minutes are near the week target. */
export function scoreThresholdVolumeFit(
  candidate: CandidateWorkout,
  targetWorkMin: number | null | undefined,
): number {
  if (targetWorkMin == null) return 0
  const work = estimateThresholdWorkMin(candidate)
  if (work <= 0) return 2
  const delta = Math.abs(work - targetWorkMin)
  if (delta <= 6) return 0
  if (delta <= 12) return 1
  if (work > targetWorkMin * 1.35) return 5
  return 2 + delta / 10
}

/**
 * Shrink easy/recovery (then long) distances so week total ≈ targetKm.
 * Never touches race-day. Soft-trim quality only if still wildly over.
 */
export function enforceWeekVolumeCap(args: {
  sessions: PlannedSession[]
  targetKm: number
  /** Allow a small overshoot before trimming (default 10%). */
  tolerance?: number
  /** Protect long run from shrinking below this km. */
  longRunFloorKm?: number | null
  /** Protect long run from shrinking below this duration (minutes). */
  longRunFloorMin?: number | null
}): PlannedSession[] {
  const tolerance = args.tolerance ?? 0.1
  const target = Math.max(20, args.targetKm)
  const ceiling = target * (1 + tolerance)
  const longFloor = args.longRunFloorKm ?? null
  const longFloorMin = args.longRunFloorMin ?? null

  const totalKm = () =>
    args.sessions.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)

  if (totalKm() <= ceiling) return args.sessions

  const scaleGroup = (
    sessions: PlannedSession[],
    predicate: (s: PlannedSession) => boolean,
    factor: number,
  ) => {
    for (let i = 0; i < sessions.length; i += 1) {
      const s = sessions[i]!
      if (!predicate(s)) continue
      if (s.tags.includes('race-day')) continue
      const dist = s.plannedDistance
      const dur = s.plannedDuration
      const scaledStructure = scaleStructureVolume(s.structure, factor)
      const synced = syncCopyFromStructure({
        structure: scaledStructure,
        sport: s.type,
        title: s.title,
        fallbackDescription: s.description,
      })
      const durFloor =
        s.sessionType === 'LONG_RUN' && longFloorMin != null
          ? longFloorMin
          : 15
      let plannedDistance =
        dist != null && dist > 0
          ? Math.max(2, Math.round(dist * factor * 10) / 10)
          : dist
      let plannedDuration =
        dur != null && dur > 0
          ? Math.max(durFloor, Math.round(dur * factor))
          : dur
      if (synced.structure) {
        const estDist = estimateStructureDistanceKm(
          synced.structure,
          null,
          s.type,
        )
        const estDur = estimateStructureDurationMinutes(
          synced.structure,
          null,
          s.type,
        )
        if (estDist != null && estDist > 0) plannedDistance = estDist
        if (estDur > 0) {
          plannedDuration = Math.max(durFloor, estDur)
        }
      }
      // Never shrink a long below the week floor.
      if (
        s.sessionType === 'LONG_RUN' &&
        longFloor != null &&
        plannedDistance != null &&
        plannedDistance < longFloor
      ) {
        continue
      }
      if (
        s.sessionType === 'LONG_RUN' &&
        longFloorMin != null &&
        plannedDuration != null &&
        plannedDuration < longFloorMin
      ) {
        continue
      }
      sessions[i] = {
        ...s,
        title: synced.title,
        description: synced.description,
        structure: synced.structure,
        plannedDistance,
        plannedDuration,
      }
    }
  }

  const next = args.sessions.map((s) => ({ ...s }))
  let total = totalKm()

  const isEasyish = (s: PlannedSession) =>
    s.sessionType === 'EASY_RUN' ||
    s.sessionType === 'RECOVERY_RUN' ||
    (!s.isKeySession &&
      s.sessionType !== 'THRESHOLD' &&
      s.sessionType !== 'TEMPO' &&
      s.sessionType !== 'VO2_MAX' &&
      s.sessionType !== 'INTERVALS' &&
      s.sessionType !== 'LONG_RUN' &&
      s.sessionType !== 'RACE_PACE' &&
      s.primaryAdaptation === 'aerobic_capacity')

  const isQualityish = (s: PlannedSession) =>
    !s.tags.includes('race-day') &&
    s.sessionType !== 'LONG_RUN' &&
    (s.sessionType === 'THRESHOLD' ||
      s.sessionType === 'TEMPO' ||
      s.sessionType === 'VO2_MAX' ||
      s.sessionType === 'INTERVALS' ||
      s.sessionType === 'RACE_PACE' ||
      s.sessionType === 'FARTLEK' ||
      s.tags.some((t) => /hm-specific|mp-specific|race-pace|threshold|quality/i.test(t)))

  // 1) Easy / recovery
  if (total > ceiling) {
    const easyKm = next
      .filter(isEasyish)
      .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    if (easyKm > 5) {
      const needCut = total - target * 1.05
      const factor = clamp(1 - needCut / easyKm, 0.55, 0.95)
      scaleGroup(next, isEasyish, factor)
      total = next.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    }
  }

  // 2) Soft-trim oversized quality before gutting the long (W5-style dual HM dumps).
  if (total > ceiling) {
    const qualityKm = next
      .filter(isQualityish)
      .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    // Quality should rarely exceed ~45% of the week.
    const qualityCap = target * 0.45
    if (qualityKm > qualityCap && qualityKm > 8) {
      const factor = clamp(qualityCap / qualityKm, 0.55, 0.92)
      scaleGroup(next, isQualityish, factor)
      total = next.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    }
  }

  // 3) Long run (keep ≥ 70% of current; marathon/HM floors respected)
  if (total > ceiling) {
    const longSessions = next.filter((s) => s.sessionType === 'LONG_RUN')
    const longKm = longSessions.reduce(
      (sum, s) => sum + (s.plannedDistance ?? 0),
      0,
    )
    if (longKm > 8) {
      const needCut = total - target * 1.05
      const isProtectedLong = longSessions.some((s) =>
        s.tags.some((t) => /marathon|mp-specific|hm-specific/i.test(t)),
      )
      const minFactor =
        longFloor != null
          ? clamp(longFloor / Math.max(longKm, 1), 0.7, 0.95)
          : isProtectedLong
            ? 0.85
            : 0.7
      const factor = clamp(1 - needCut / longKm, minFactor, 0.95)
      scaleGroup(next, (s) => s.sessionType === 'LONG_RUN', factor)
      total = next.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    }
  }

  // 4) Last resort: soft-trim easyish, then quality again.
  if (total > target * 1.2) {
    const factor = clamp((target * 1.12) / total, 0.8, 0.95)
    scaleGroup(next, isEasyish, factor)
    total = next.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
  }
  if (total > target * 1.25) {
    const factor = clamp((target * 1.15) / total, 0.75, 0.95)
    scaleGroup(next, isQualityish, factor)
  }

  return next
}

/** True if week-to-week km jump exceeds safe loading (~10%). */
export function isUnsafeVolumeJump(
  prevKm: number,
  nextKm: number,
  opts?: { afterDeload?: boolean },
): boolean {
  if (prevKm < 25) return false
  const maxRatio = opts?.afterDeload ? 1.55 : 1.1
  return nextKm / prevKm > maxRatio
}

export function resolveThresholdCandidate(
  id: string | null | undefined,
): CandidateWorkout | null {
  if (!id) return null
  return getWorkoutById(id)
}
