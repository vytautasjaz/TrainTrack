import type {
  CapacityProfile,
  MethodologySelection,
  PlannedSession,
  PriorityProfile,
  WeeklyArchitecture,
  WeeklySlot,
} from '@/lib/coach-engine/types'
import { capacityCeilingForWeek } from '@/lib/coach-engine/capacity'
import { findCandidatesForSlotV2 } from '@/lib/coach-engine/library-v2'
import {
  PLAN_SCORE_IMPROVE_TARGET,
  scorePlan,
} from '@/lib/coach-engine/plan-score'
import { proposalToSession } from '@/lib/coach-engine/validate'
import { getWorkoutById } from '@/lib/coach-engine/library'

function weeklyTssTarget(
  capacity: CapacityProfile,
  weekIndex?: number,
): number {
  const ceiling =
    weekIndex != null
      ? capacityCeilingForWeek(capacity, weekIndex)
      : {
          maxTss: capacity.maxWeeklyTss,
          kind: 'present' as const,
        }
  const mult =
    ceiling.kind === 'race'
      ? 0.55
      : ceiling.kind === 'taper'
        ? 0.7
        : ceiling.kind === 'deload'
          ? 0.78
          : 0.85
  return Math.max(20, ceiling.maxTss * mult)
}

/** Nudge non-key session load so weekly TSS sits closer to the phase target. */
function alignWeekTssForScore(
  sessions: PlannedSession[],
  capacity: CapacityProfile,
  weekIndex?: number,
  architecture?: WeeklyArchitecture,
): boolean {
  if (
    architecture?.phase.isTaper ||
    architecture?.phase.phase === 'RACE'
  ) {
    return false
  }
  const training = sessions.filter((s) => !s.tags.includes('race-day'))
  const sumTss = () =>
    training.reduce((sum, s) => sum + (s.estimatedTss ?? 0), 0)
  const target = weeklyTssTarget(capacity, weekIndex)
  const current = sumTss()
  if (current <= 0 || target <= 0) return false
  const ratio = target / current
  if (ratio > 0.94 && ratio < 1.06) return false

  // Only trim overload — never inflate volume/TSS (avoids cap breaches & taper spikes).
  if (ratio >= 1) return false
  const factor = Math.max(0.94, ratio)
  let changed = false
  for (let i = 0; i < sessions.length; i += 1) {
    const s = sessions[i]!
    if (s.tags.includes('race-day') || s.isKeySession) continue
    if (s.sessionType === 'LONG_RUN') continue
    const dur = s.plannedDuration
    const dist = s.plannedDistance
    sessions[i] = {
      ...s,
      plannedDuration:
        dur != null && dur > 0
          ? Math.min(120, Math.max(20, Math.round(dur * factor)))
          : dur,
      plannedDistance:
        dist != null && dist > 0
          ? Math.round(dist * factor * 10) / 10
          : dist,
      estimatedTss: Math.max(
        8,
        Math.round((s.estimatedTss ?? 0) * factor),
      ),
    }
    changed = true
  }
  return changed
}

function slotForSession(
  architecture: WeeklyArchitecture,
  session: PlannedSession,
): WeeklySlot | null {
  return (
    architecture.slots.find((sl) => sl.dayOfWeek === session.dayOfWeek) ??
    null
  )
}

/** Swap one easy day for a library workout that matches the primary gap. */
function boostPrimaryAdaptationCoverage(args: {
  sessions: PlannedSession[]
  architecture: WeeklyArchitecture
  priority: PriorityProfile
  methodology: MethodologySelection
  capacity: CapacityProfile
  weekIndex?: number
}): boolean {
  const primary = args.priority.primary.adaptation
  const pool = args.sessions
    .map((s, i) => ({ s, i }))
    .filter(
      ({ s }) =>
        !s.tags.includes('race-day') &&
        !s.isKeySession &&
        s.sessionType !== 'LONG_RUN' &&
        s.primaryAdaptation !== primary &&
        (s.sessionType === 'EASY_RUN' ||
          s.sessionType === 'RECOVERY_RUN' ||
          s.sessionType === 'CUSTOM'),
    )
  if (!pool.length) return false

  const pick = pool.find(({ s }) => (s.plannedDuration ?? 0) >= 35) ?? pool[0]!
  const slot = slotForSession(args.architecture, pick.s)
  if (!slot) return false

  const candidates = findCandidatesForSlotV2(
    { ...slot, stimulus: 'easy', hard: false },
    {
      methodology: args.methodology,
      athleteLevel: null,
    },
  ).filter((c) => c.primaryAdaptation === primary)
  const candidate = candidates[0]
  if (!candidate) return false

  const base = getWorkoutById(candidate.id)
  if (!base) return false

  const minutes = slot.availableMinutes || pick.s.plannedDuration || 45
  const proposal = {
    selectedWorkoutId: candidate.id,
    adaptations: {
      durationMin: Math.min(minutes, base.durationMin + 10),
      intervalCount: null,
      intervalDurationMin: null,
      recoveryMin: null,
      distanceKm: null,
    },
    reason: 'Score improvement: align easy day with primary adaptation.',
  }
  const rebuilt = proposalToSession({
    weekIndex: pick.s.weekIndex,
    dayOfWeek: pick.s.dayOfWeek,
    proposal,
    longRunMinMinutes: null,
    longRunTargetKm: null,
    volumeScale: null,
  })
  if (!rebuilt) return false

  args.sessions[pick.i] = {
    ...rebuilt,
    isKeySession: false,
    tags: [...rebuilt.tags, 'score-improve'].slice(0, 8),
  }
  return true
}

/**
 * One deterministic pass to raise weekly plan score (no AI / no tokens).
 * Returns true if sessions were modified.
 */
export function improvePlanScoreOnce(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  architecture: WeeklyArchitecture
  priority: PriorityProfile
  methodology: MethodologySelection
  weekIndex?: number
}): boolean {
  const before = scorePlan(args)
  if (before >= PLAN_SCORE_IMPROVE_TARGET) return false

  const allowFocusSwap =
    (args.capacity.architectureId ?? 'run_endurance') === 'run_endurance'

  const tss = alignWeekTssForScore(
    args.sessions,
    args.capacity,
    args.weekIndex,
    args.architecture,
  )
  const focus = allowFocusSwap ? boostPrimaryAdaptationCoverage(args) : false
  if (!tss && !focus) return false

  const after = scorePlan(args)
  return after > before || tss || focus
}
