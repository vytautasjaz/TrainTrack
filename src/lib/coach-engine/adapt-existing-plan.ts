import {
  SessionType,
  WorkoutStatus,
  WorkoutType,
  type Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState, parseAthleteLevel } from '@/lib/coach-engine/state'
import { resolveGoalProfile } from '@/lib/coach-engine/goal'
import { getDemandProfile, demandIdForSkillSlug } from '@/lib/coach-engine/demand'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { selectPriorities } from '@/lib/coach-engine/priority'
import { calculateCapacity } from '@/lib/coach-engine/capacity'
import { buildPhaseProfile } from '@/lib/coach-engine/periodization'
import { selectMethodology } from '@/lib/coach-engine/methodology'
import {
  calculateDoseProfile,
  calculateTrainingBudget,
  applyDoseToPhase,
} from '@/lib/coach-engine/dose'
import { buildWeeklyArchitecture } from '@/lib/coach-engine/weekly'
import { pickDeterministicCandidateV2 } from '@/lib/coach-engine/library-v2'
import { proposalToSession } from '@/lib/coach-engine/validate'
import {
  compareResponse,
  expectedResponseForSession,
} from '@/lib/coach-engine/learning'
import {
  replanAfterMissedSession,
  replanFromResponse,
  type ReplanHint,
} from '@/lib/coach-engine/replan'
import type {
  PlannedSession,
  TrainingModelId,
} from '@/lib/coach-engine/types'
import { addDays } from 'date-fns'

const HARD_SESSION_TYPES: SessionType[] = [
  SessionType.THRESHOLD,
  SessionType.TEMPO,
  SessionType.VO2_MAX,
  SessionType.INTERVALS,
  SessionType.HILL_REPEATS,
  SessionType.RACE_PACE,
]

function isHardSession(sessionType: SessionType, tags: string[]): boolean {
  return (
    HARD_SESSION_TYPES.includes(sessionType) ||
    tags.includes('key-session') ||
    tags.some((t) => t.startsWith('model:') && t.includes('THRESHOLD'))
  )
}

function emptyAdaptations() {
  return {
    intervalCount: null,
    intervalDurationMin: null,
    recoveryMin: null,
    durationMin: null,
    distanceKm: null,
  }
}

export type AdaptExistingPlanResult = {
  summary: string
  editsApplied: number
  guidelines: string
  usedAi: false
}

/**
 * Adapt an existing TrainingPlan through the coach engine (no free-form LLM plan rewrite).
 * Focus + recent compliance drive deterministic session edits / rebuilds.
 */
export async function adaptExistingTrainingPlan(args: {
  planId: string
  athleteId: string
  brief: Record<string, unknown>
  lockedModel?: TrainingModelId | null
}): Promise<AdaptExistingPlanResult> {
  const { refreshWorkoutLibraryFromDb } = await import(
    '@/lib/coach-engine/library-store'
  )
  await refreshWorkoutLibraryFromDb()

  const plan = await prisma.trainingPlan.findUniqueOrThrow({
    where: { id: args.planId },
    include: {
      sessions: {
        orderBy: [
          { weekIndex: 'asc' },
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
    },
  })

  const focus =
    typeof args.brief.focus === 'string' ? args.brief.focus : 'maintain'
  const notes =
    typeof args.brief.notes === 'string' ? args.brief.notes.trim() : ''

  const data = await collectAthleteData(args.athleteId)
  const level = parseAthleteLevel(plan.level ?? 'intermediate')
  const athleteState = buildAthleteState(data, level)

  // Pre-adapt safety gate — injury focus is not enough; red flags can block.
  const {
    evaluateSafetyIntake,
    applySafetyConstraintsToCapacity,
    CoachEngineSafetyError,
  } = await import('@/lib/coach-engine/safety-intake')
  const safetyGate = evaluateSafetyIntake({
    brief: args.brief,
    state: athleteState,
    profileRestingHr: data.hr.resting,
  })
  if (safetyGate.blocked) {
    throw new CoachEngineSafetyError(safetyGate)
  }

  const skillSlug =
    plan.target?.toLowerCase().includes('marathon') &&
    !plan.target?.toLowerCase().includes('half')
      ? 'run-marathon'
      : plan.sportFocus === WorkoutType.HYROX
        ? 'hyrox-general'
        : plan.sportFocus === WorkoutType.TRIATHLON
          ? 'multi-sport-base'
          : plan.target?.toLowerCase().includes('5')
            ? 'run-5k-build'
            : 'run-half-marathon'

  const goal = resolveGoalProfile({
    skillSlug,
    brief: {
      weekCount: plan.weekCount,
      level,
      notes: [focus, notes].filter(Boolean).join(' · '),
      goalTime: plan.target ?? '',
    },
    data,
  })
  const demand = getDemandProfile(goal.demandId)
  const capabilities = calculateCapabilities(athleteState, data, goal)
  const gaps = calculateGaps(capabilities, demand.demands)
  const seedPhase = buildPhaseProfile({
    goal,
    priority: {
      primary: { adaptation: 'aerobic_durability', score: 0.5 },
      secondary: [],
    },
    weekIndex: Math.floor(goal.weekCount / 2),
  })
  const priority = selectPriorities({
    gaps,
    demand,
    phase: seedPhase,
    state: athleteState,
  })
  const capacity = applySafetyConstraintsToCapacity(
    calculateCapacity(athleteState, goal),
    safetyGate,
  )
  const budget = calculateTrainingBudget({
    brief: args.brief,
    capacity,
    state: athleteState,
  })
  const dose = calculateDoseProfile({
    state: athleteState,
    goal,
    capacity,
    budget,
  })
  const methodology = selectMethodology({
    state: athleteState,
    goal,
    phase: seedPhase,
    priority,
    lockedModel: args.lockedModel,
  })

  // Recent compliance → replan hint
  const recentSkipped = data.recentSessions.filter((s) => s.status === 'SKIPPED')
  const recentHardRpe = data.recentSessions.find(
    (s) => s.rpe != null && s.rpe >= 8 && s.status === 'COMPLETED',
  )
  let hint: ReplanHint = {
    action: 'keep',
    message: 'Maintain current plan structure.',
  }
  if (
    focus === 'recover' ||
    focus === 'injury' ||
    safetyGate.constraints.includes('no_hard_sessions') ||
    safetyGate.constraints.includes('easy_intensity_only') ||
    safetyGate.constraints.includes('max_one_hard_session')
  ) {
    hint = {
      action: 'reduce_next_hard',
      message:
        safetyGate.flags[0]?.message ??
        (focus === 'injury'
          ? 'Injury focus: reduce hard mechanical load.'
          : 'Recover focus: cut hard-session dose.'),
    }
  } else if (recentSkipped.length >= 2) {
    hint = {
      action: 'drop_missed_stimulus',
      message: 'Multiple skips — do not stack make-up intensity.',
    }
  } else if (recentHardRpe) {
    const fakeSession: PlannedSession = {
      weekIndex: 0,
      dayOfWeek: 1,
      type: WorkoutType.RUN,
      sessionType: SessionType.THRESHOLD,
      title: recentHardRpe.title,
      description: null,
      plannedDistance: recentHardRpe.plannedDistanceKm,
      plannedDuration: recentHardRpe.plannedDurationMin,
      coachNotes: null,
      tags: [],
      candidateId: 'RUN_THRESHOLD_01',
      primaryAdaptation: priority.primary.adaptation,
      estimatedTss: recentHardRpe.estimatedTss ?? 60,
      isKeySession: true,
    }
    const expected = expectedResponseForSession(fakeSession)
    const comparison = compareResponse(expected, {
      actualRpe: recentHardRpe.rpe,
      completion: 1,
      actualTss: recentHardRpe.estimatedTss,
      feltHarder: true,
      missed: false,
    })
    hint = replanFromResponse({ comparison, methodology, priority })
  }

  let editsApplied = 0
  const scaleHard =
    focus === 'recover' ||
    focus === 'injury' ||
    hint.action === 'reduce_next_hard'
      ? 0.75
      : focus === 'progress'
        ? 1.08
        : 1

  // Rebuild remaining weeks when asked, otherwise scale hard sessions in place.
  const shouldRebuild =
    hint.action === 'rebuild_remaining' || focus === 'progress'

  if (shouldRebuild) {
    const newSessions: Prisma.TrainingPlanSessionCreateManyInput[] = []
    for (let weekIndex = 0; weekIndex < plan.weekCount; weekIndex += 1) {
      let phase = buildPhaseProfile({ goal, priority, weekIndex })
      phase = applyDoseToPhase(phase, dose, weekIndex)
      if (focus === 'recover' || focus === 'injury') {
        phase = {
          ...phase,
          volumeScale: Math.min(phase.volumeScale ?? 1, 0.85),
          isDeload: true,
        }
      }
      const arch = buildWeeklyArchitecture({
        priority,
        capacity,
        phase,
        methodology,
      })
      for (const slot of arch.slots) {
        if (slot.stimulus === 'rest') continue
        const pick = pickDeterministicCandidateV2(
          slot,
          goal.sport,
          methodology,
        )
        const duration = Math.round(
          Math.min(pick.durationMin, slot.availableMinutes || pick.durationMin) *
            (phase.volumeScale ?? 1) *
            (slot.hard ? scaleHard : 1),
        )
        const session = proposalToSession({
          weekIndex,
          dayOfWeek: slot.dayOfWeek,
          proposal: {
            selectedWorkoutId: pick.id,
            adaptations: {
              ...emptyAdaptations(),
              durationMin: duration,
              distanceKm: pick.distanceKm,
            },
            reason: hint.message,
          },
        })
        if (!session || session.type === WorkoutType.REST) continue
        newSessions.push({
          planId: plan.id,
          weekIndex: session.weekIndex,
          dayOfWeek: session.dayOfWeek,
          sortOrder: 0,
          type: session.type,
          sessionType: session.sessionType,
          title: session.title,
          description: session.description,
          plannedDistance: session.plannedDistance,
          plannedDuration: session.plannedDuration,
          coachNotes: session.coachNotes,
          tags: [
            ...session.tags,
            ...(slot.isKeySession ? ['key-session'] : []),
            `model:${methodology.selectedModel}`,
            `adapt:${focus}`,
          ].slice(0, 8),
        })
      }
    }
    await prisma.trainingPlanSession.deleteMany({ where: { planId: plan.id } })
    if (newSessions.length) {
      await prisma.trainingPlanSession.createMany({ data: newSessions })
    }
    editsApplied = newSessions.length
  } else {
    for (const s of plan.sessions) {
      if (!isHardSession(s.sessionType, s.tags)) continue
      if (scaleHard === 1) continue
      const nextDuration =
        s.plannedDuration != null
          ? Math.max(20, Math.round(s.plannedDuration * scaleHard))
          : s.plannedDuration
      const nextDistance =
        s.plannedDistance != null
          ? Math.round(s.plannedDistance * scaleHard * 10) / 10
          : s.plannedDistance
      await prisma.trainingPlanSession.update({
        where: { id: s.id },
        data: {
          plannedDuration: nextDuration,
          plannedDistance: nextDistance,
          coachNotes: [s.coachNotes, hint.message].filter(Boolean).join('\n'),
          tags: [...new Set([...s.tags, `adapt:${focus}`])].slice(0, 8),
        },
      })
      editsApplied += 1
    }

    // Convert a second weekly quality day to easy when recovering.
    if (focus === 'recover' || focus === 'injury') {
      const byWeek = new Map<number, typeof plan.sessions>()
      for (const s of plan.sessions) {
        const list = byWeek.get(s.weekIndex) ?? []
        list.push(s)
        byWeek.set(s.weekIndex, list)
      }
      for (const [, weekSessions] of byWeek) {
        const hard = weekSessions.filter((s) =>
          isHardSession(s.sessionType, s.tags),
        )
        if (hard.length < 2) continue
        const secondary = hard[1]!
        await prisma.trainingPlanSession.update({
          where: { id: secondary.id },
          data: {
            sessionType: SessionType.EASY_RUN,
            title: 'Easy aerobic (adapted)',
            plannedDuration:
              secondary.plannedDuration != null
                ? Math.min(45, secondary.plannedDuration)
                : 40,
            coachNotes: hint.message,
            tags: ['easy', `adapt:${focus}`],
          },
        })
        editsApplied += 1
      }
    }
  }

  const guidelines = [
    '## Why this plan',
    `Focus: ${priority.primary.adaptation.replaceAll('_', ' ')} (${focus}).`,
    `Methodology: ${methodology.selectedModel} (confidence ${methodology.confidence}).`,
    `Adapt action: ${hint.action} — ${hint.message}`,
    notes ? `Notes: ${notes}` : null,
    `Edits applied: ${editsApplied}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const existing = plan.description?.trim() || ''
  const withoutOldAdapt = existing
    .replace(/\n*## Why this plan[\s\S]*$/m, '')
    .replace(/\n*Adapt notes:[\s\S]*$/m, '')
    .trim()
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: {
      description: [withoutOldAdapt, guidelines].filter(Boolean).join('\n\n').slice(0, 4000),
      updatedAt: new Date(),
    },
  })

  return {
    summary: hint.message,
    editsApplied,
    guidelines,
    usedAi: false,
  }
}

/**
 * After a calendar workout is skipped/completed, adjust upcoming same-week
 * hard sessions — never blindly move the missed session to tomorrow.
 */
export async function applyCalendarReplanAfterLog(args: {
  athleteId: string
  workoutId: string
  kind: 'skipped' | 'completed'
}): Promise<ReplanHint | null> {
  const workout = await prisma.workout.findFirst({
    where: { id: args.workoutId, athleteId: args.athleteId },
    include: { result: true },
  })
  if (!workout || workout.isRescheduleGhost) return null

  const data = await collectAthleteData(args.athleteId, { lookbackWeeks: 6 })
  const state = buildAthleteState(data, 'intermediate')
  const demandId = demandIdForSkillSlug('run-half-marathon')
  const goal = resolveGoalProfile({
    skillSlug: 'run-half-marathon',
    brief: { weekCount: 8, level: 'intermediate', notes: '' },
    data,
  })
  const demand = getDemandProfile(demandId)
  const capabilities = calculateCapabilities(state, data, goal)
  const gaps = calculateGaps(capabilities, demand.demands)
  const phase = buildPhaseProfile({
    goal,
    priority: {
      primary: { adaptation: 'aerobic_durability', score: 0.5 },
      secondary: [],
    },
  })
  const priority = selectPriorities({ gaps, demand, phase, state })
  const methodology = selectMethodology({
    state,
    goal,
    phase,
    priority,
  })

  const dayOfWeek = (workout.date.getUTCDay() + 6) % 7
  const isKey = isHardSession(workout.sessionType, workout.tags)
  const planned: PlannedSession = {
    weekIndex: 0,
    dayOfWeek,
    type: workout.type,
    sessionType: workout.sessionType,
    title: workout.title,
    description: workout.description,
    plannedDistance: workout.plannedDistance,
    plannedDuration: workout.plannedDuration,
    coachNotes: workout.coachNotes,
    tags: workout.tags,
    candidateId: 'calendar',
    primaryAdaptation: priority.primary.adaptation,
    estimatedTss: 50,
    isKeySession: isKey,
  }

  let hint: ReplanHint
  if (args.kind === 'skipped') {
    hint = replanAfterMissedSession({
      missed: planned,
      remaining: [],
      state,
      longDayOfWeek: 5,
    })
  } else {
    const expected = expectedResponseForSession(planned)
    const comparison = compareResponse(expected, {
      actualRpe: workout.result?.rpe ?? null,
      completion: 1,
      actualTss: null,
      feltHarder: (workout.result?.rpe ?? 0) >= 8,
      missed: false,
    })
    hint = replanFromResponse({ comparison, methodology, priority })
  }

  if (hint.action === 'keep' || hint.action === 'drop_missed_stimulus') {
    // Explicitly do not reschedule the missed session onto another day.
    return hint
  }

  if (hint.action === 'reduce_next_hard') {
    const start = workout.date
    const end = addDays(start, 7)
    const upcoming = await prisma.workout.findMany({
      where: {
        athleteId: args.athleteId,
        date: { gt: start, lte: end },
        status: WorkoutStatus.PLANNED,
        isRescheduleGhost: false,
      },
      orderBy: { date: 'asc' },
    })
    const nextHard = upcoming.find((w) => isHardSession(w.sessionType, w.tags))
    if (nextHard && nextHard.plannedDuration != null) {
      await prisma.workout.update({
        where: { id: nextHard.id },
        data: {
          plannedDuration: Math.max(20, Math.round(nextHard.plannedDuration * 0.75)),
          plannedDistance:
            nextHard.plannedDistance != null
              ? Math.round(nextHard.plannedDistance * 0.75 * 10) / 10
              : nextHard.plannedDistance,
          coachNotes: [nextHard.coachNotes, `Coach engine: ${hint.message}`]
            .filter(Boolean)
            .join('\n')
            .slice(0, 2000),
        },
      })
    }
  }

  if (hint.action === 'rebuild_remaining') {
    const start = workout.date
    const end = addDays(start, 7)
    const upcoming = await prisma.workout.findMany({
      where: {
        athleteId: args.athleteId,
        date: { gt: start, lte: end },
        status: WorkoutStatus.PLANNED,
        isRescheduleGhost: false,
      },
    })
    for (const w of upcoming) {
      if (!isHardSession(w.sessionType, w.tags)) continue
      await prisma.workout.update({
        where: { id: w.id },
        data: {
          sessionType: SessionType.EASY_RUN,
          title: w.type === WorkoutType.RUN ? 'Easy aerobic (replan)' : w.title,
          plannedDuration:
            w.plannedDuration != null
              ? Math.min(45, Math.round(w.plannedDuration * 0.7))
              : 40,
          coachNotes: `Coach engine replan: ${hint.message}`,
        },
      })
    }
  }

  return hint
}
