import { SessionType, WorkoutType } from '@prisma/client'
import type {
  AdaptationKey,
  CandidateWorkout,
  SlotStimulus,
  WeeklySlot,
} from '@/lib/coach-engine/types'
import { DETAILED_SEED_LIBRARY } from '@/lib/coach-engine/library-seed'

const SEED_LIBRARY: CandidateWorkout[] = DETAILED_SEED_LIBRARY

function adaptationForStimulus(
  stimulus: SlotStimulus,
  preferred: AdaptationKey | null,
): AdaptationKey[] {
  if (stimulus === 'rest') return []
  if (stimulus === 'recovery') return ['aerobic_capacity']
  if (stimulus === 'race') {
    return preferred ? [preferred, 'threshold', 'aerobic_durability'] : ['threshold']
  }
  if (stimulus === 'long') {
    return preferred
      ? [preferred, 'long_run_tolerance', 'aerobic_durability']
      : ['long_run_tolerance', 'aerobic_durability']
  }
  if (stimulus === 'strength') return ['max_strength']
  if (stimulus === 'quality') {
    return preferred
      ? [preferred, 'threshold', 'aerobic_capacity', 'speed']
      : ['threshold', 'aerobic_capacity', 'speed']
  }
  return preferred
    ? [preferred, 'aerobic_capacity', 'running_economy']
    : ['aerobic_capacity', 'running_economy']
}

/** File-seeded catalog — used when DB is empty or unavailable. */
export function listSeedWorkoutLibrary(): CandidateWorkout[] {
  return SEED_LIBRARY
}

let libraryCache: CandidateWorkout[] | null = null

function activeLibrary(): CandidateWorkout[] {
  return libraryCache ?? SEED_LIBRARY
}

/** Sync accessors used by the engine; prefer DB cache when loaded. */
export function listWorkoutLibrary(): CandidateWorkout[] {
  return activeLibrary()
}

export function getWorkoutById(id: string): CandidateWorkout | null {
  return activeLibrary().find((w) => w.id === id) ?? null
}

export function setWorkoutLibraryCache(rows: CandidateWorkout[] | null) {
  libraryCache = rows && rows.length > 0 ? rows : null
}

/** Return 3–5 valid candidates for a weekly slot. */
export function findCandidatesForSlot(
  slot: WeeklySlot,
  opts?: { sportFocus?: WorkoutType; limit?: number },
): CandidateWorkout[] {
  const library = activeLibrary()
  if (slot.stimulus === 'rest') {
    return library.filter((w) => w.id === 'REST_01')
  }

  const preferred = adaptationForStimulus(slot.stimulus, slot.primaryAdaptation)
  const limit = opts?.limit ?? 4
  const scored = library
    .filter((w) => {
      if (w.id === 'REST_01') return false
      if (slot.stimulus === 'strength') {
        return w.primaryAdaptation === 'max_strength'
      }
      if (slot.stimulus === 'race') {
        return (
          w.sessionType === SessionType.RACE_PACE ||
          w.family === 'race' ||
          w.tags.some((t) => /race-day|race-pace|hm-specific/i.test(t))
        )
      }
      if (slot.stimulus === 'long') {
        // Marathon/HM key longs must be running — bike endurance rides are
        // CV work, not running mechanical durability.
        const isRunEnduranceFocus =
          !opts?.sportFocus ||
          opts.sportFocus === WorkoutType.RUN ||
          opts.sportFocus === WorkoutType.HYROX
        if (
          isRunEnduranceFocus &&
          w.sport !== WorkoutType.RUN &&
          w.sport !== WorkoutType.HYROX
        ) {
          return false
        }
        return (
          w.primaryAdaptation === 'long_run_tolerance' ||
          w.primaryAdaptation === 'aerobic_durability'
        )
      }
      if (slot.stimulus === 'recovery') {
        return (
          w.sessionType === SessionType.RECOVERY_RUN || w.difficulty === 'easy'
        )
      }
      if (
        slot.hard &&
        w.difficulty === 'easy' &&
        w.sessionType === SessionType.RECOVERY_RUN
      ) {
        return false
      }
      // Quality day ≠ long run (even progressive / aerobic-durability samples).
      if (
        slot.stimulus === 'quality' &&
        (w.sessionType === SessionType.LONG_RUN ||
          w.family === 'long' ||
          w.primaryAdaptation === 'long_run_tolerance')
      ) {
        return false
      }
      if (opts?.sportFocus === WorkoutType.HYROX) {
        return (
          w.sport === WorkoutType.HYROX ||
          w.sport === WorkoutType.RUN ||
          w.sport === WorkoutType.STRENGTH
        )
      }
      if (opts?.sportFocus === WorkoutType.TRIATHLON) {
        return (
          w.sport === WorkoutType.RUN ||
          w.sport === WorkoutType.STRENGTH ||
          w.sport === WorkoutType.BIKE ||
          w.sport === WorkoutType.SWIM ||
          w.sport === WorkoutType.TRIATHLON
        )
      }
      if (opts?.sportFocus === WorkoutType.BIKE) {
        return w.sport === WorkoutType.BIKE || w.sport === WorkoutType.STRENGTH
      }
      if (opts?.sportFocus === WorkoutType.SWIM) {
        return w.sport === WorkoutType.SWIM || w.sport === WorkoutType.STRENGTH
      }
      return w.sport === WorkoutType.RUN || w.sport === WorkoutType.STRENGTH
    })
    .map((w) => {
      const adaptRank = preferred.indexOf(w.primaryAdaptation)
      const durationFit = Math.abs(w.durationMin - slot.availableMinutes)
      const hardFit =
        slot.hard ===
        (w.difficulty === 'hard' || w.difficulty === 'medium_high')
          ? 0
          : 2
      const score =
        (adaptRank === -1 ? 8 : adaptRank) * 10 + durationFit / 10 + hardFit
      return { w, score }
    })
    .sort((a, b) => a.score - b.score)

  const unique: CandidateWorkout[] = []
  for (const row of scored) {
    if (unique.some((u) => u.id === row.w.id)) continue
    unique.push(row.w)
    if (unique.length >= limit) break
  }

  if (unique.length === 0) {
    return library.filter((w) => w.id === 'RUN_EASY_01')
  }
  return unique
}

export function pickDeterministicCandidate(
  slot: WeeklySlot,
  sportFocus?: WorkoutType,
): CandidateWorkout {
  return findCandidatesForSlot(slot, { sportFocus, limit: 1 })[0]!
}

export function estimateCandidateTss(candidate: CandidateWorkout): number {
  if (candidate.durationMin <= 0) return 0
  const hours = candidate.durationMin / 60
  const ifFactor =
    candidate.cardiovascularLoad === 'high'
      ? 0.9
      : candidate.cardiovascularLoad === 'medium'
        ? 0.75
        : 0.55
  return Math.round(hours * ifFactor * ifFactor * 100)
}
