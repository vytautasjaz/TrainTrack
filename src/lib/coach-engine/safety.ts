import type {
  PlannedSession,
  ReadinessDecision,
  AthleteState,
  SportArchitecture,
  ValidationError,
  WeeklyArchitecture,
  WeeklySlot,
  CandidateWorkout,
} from '@/lib/coach-engine/types'
import { findSportInterferenceErrors } from '@/lib/coach-engine/sport-architecture'

export function classifyStress(candidate: CandidateWorkout): {
  cardiovascular: number
  mechanical: number
  muscular: number
  neuromuscular: number
} {
  const map = { low: 1, medium: 2, high: 3 } as const
  return {
    cardiovascular: map[candidate.cardiovascularLoad],
    mechanical: map[candidate.mechanicalLoad],
    muscular: map[candidate.muscularLoad],
    neuromuscular:
      candidate.difficulty === 'hard' || candidate.difficulty === 'medium_high'
        ? 3
        : candidate.difficulty === 'medium'
          ? 2
          : 1,
  }
}

/** Quality / intensity hard — not easy long, not race-day alone. */
export function isQualityHardSession(session: PlannedSession): boolean {
  if (session.tags.includes('race-day')) return false
  if (
    session.sessionType === 'LONG_RUN' ||
    session.sessionType === 'EASY_RUN' ||
    session.sessionType === 'RECOVERY_RUN'
  ) {
    return false
  }
  if (session.tags.some((t) => /validation-repair|easy/i.test(t)) &&
      !session.tags.some((t) => /threshold|vo2|hm-specific|quality/i.test(t))) {
    return false
  }
  return (
    Boolean(session.isKeySession) ||
    session.sessionType === 'THRESHOLD' ||
    session.sessionType === 'TEMPO' ||
    session.sessionType === 'VO2_MAX' ||
    session.sessionType === 'INTERVALS' ||
    session.sessionType === 'RACE_PACE' ||
    session.sessionType === 'FARTLEK' ||
    session.tags.some((t) =>
      /threshold|tempo|vo2|hm-specific|mp-specific|race-pace|quality|norwegian|fartlek/i.test(
        t,
      ),
    )
  )
}

/** Flag cross-sport interference using the sport architecture rule table. */
export function findInterferenceErrors(
  sessions: PlannedSession[],
  architecture?: SportArchitecture | null,
): ValidationError[] {
  return findSportInterferenceErrors(sessions, architecture)
}

/** Two hard days in a row / hard before long — based on materialized sessions. */
export function findKeySessionProtectionErrors(
  sessions: PlannedSession[],
  architecture: WeeklyArchitecture,
): ValidationError[] {
  const errors: ValidationError[] = []
  const longDay =
    sessions.find((s) => s.sessionType === 'LONG_RUN')?.dayOfWeek ??
    architecture.slots.find((s) => s.stimulus === 'long')?.dayOfWeek
  const sessionHard = sessions
    .filter((s) => isQualityHardSession(s))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  for (let i = 0; i < sessionHard.length - 1; i += 1) {
    const a = sessionHard[i]!
    const b = sessionHard[i + 1]!
    if (b.dayOfWeek - a.dayOfWeek === 1) {
      errors.push({
        type: 'BACK_TO_BACK_HARD',
        message: `Back-to-back hard sessions on days ${a.dayOfWeek} and ${b.dayOfWeek}.`,
      })
    }
  }
  if (longDay != null) {
    const dayBefore = longDay === 0 ? 6 : longDay - 1
    if (sessionHard.some((s) => s.dayOfWeek === dayBefore)) {
      errors.push({
        type: 'KEY_SESSION_PROTECTION',
        message: 'Hard session placed the day before the long run.',
      })
    }
  }
  return errors
}

export function markKeySessions(slots: WeeklySlot[]): WeeklySlot[] {
  let firstQualityMarked = false
  let firstStationMarked = false
  return slots.map((s) => {
    if (s.stimulus === 'long' || s.stimulus === 'race') {
      return { ...s, isKeySession: true }
    }
    // HYROX station / simulation blocks are key concurrent-load sessions.
    if (
      (s.modality === 'hyrox' || s.stimulus === 'strength') &&
      s.hard &&
      !firstStationMarked
    ) {
      firstStationMarked = true
      return { ...s, isKeySession: true }
    }
    if (s.stimulus === 'quality' && s.hard && !firstQualityMarked) {
      firstQualityMarked = true
      return { ...s, isKeySession: true }
    }
    return { ...s, isKeySession: false }
  })
}

/** Readiness decision tree (stub signals). */
export function decideReadinessAction(state: AthleteState): ReadinessDecision {
  if (state.readiness.score < 0.45) return 'cancel'
  if (state.readiness.score < 0.55) return 'easy'
  if (state.readiness.score < 0.65) return 'reduce'
  return 'keep'
}

export function applyReadinessToSlot(
  slot: WeeklySlot,
  decision: ReadinessDecision,
): WeeklySlot {
  if (decision === 'keep' || !slot.hard) return slot
  // Never demote race day for readiness stubs.
  if (slot.stimulus === 'race') return slot
  if (decision === 'cancel' && slot.stimulus === 'quality') {
    return {
      ...slot,
      stimulus: 'recovery',
      hard: false,
      isKeySession: false,
      availableMinutes: Math.min(35, slot.availableMinutes),
      primaryAdaptation: 'aerobic_capacity',
    }
  }
  if (decision === 'easy' || decision === 'reduce') {
    return {
      ...slot,
      stimulus: decision === 'easy' ? 'easy' : slot.stimulus,
      hard: decision === 'reduce' ? slot.hard : false,
      availableMinutes:
        decision === 'reduce'
          ? Math.round(slot.availableMinutes * 0.75)
          : Math.min(45, slot.availableMinutes),
      isKeySession: decision === 'reduce' ? slot.isKeySession : false,
      preferRaceSpecific: false,
    }
  }
  return slot
}
