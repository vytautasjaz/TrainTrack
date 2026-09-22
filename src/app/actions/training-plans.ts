'use server'

import { revalidatePath } from 'next/cache'
import {
  Prisma,
  RaceIntent,
  RacePriority,
  RaceType,
  SeasonPhase,
  SessionType,
  WorkoutType,
  type HyroxDivision,
  type PlannedMetricSource,
  type RaceCourseType,
  type SwimEnvironment,
  type TriathlonDistance,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  addDateOnlyDays,
  parseDateOnly,
  startOfWeekDateOnly,
  toDateKey,
} from '@/lib/dates'
import {
  requireSession,
  resolveAthleteId,
  isCoachView,
  isCoach,
  requireCoachOwnsAthlete,
} from '@/lib/session'
import { toTrainingPhaseBlock } from '@/lib/training-phase-context'
import { resolveTrainingPlanSessionMetricsForAthlete, recalculateTrainingPlanSessionMetricsForPreferences } from '@/lib/training-plan-session-metrics'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'
import { syncApproxTagsFromSources } from '@/lib/workout-metric-source'
import { sportSlug } from '@/lib/workout-library/config'
import { parseTrainingPlanAthleteLevel } from '@/lib/training-plan-athlete-level'
import { resolveTrainingPlanEstimationPreferences } from '@/lib/training-plan-estimation-prefs'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import {
  assertNoPlanPhaseOverlap,
  carvePlanPhasesForIncomingRange,
  dateKeyForPlanDay,
  dateKeyForPlanSlot,
  dayOfWeekFromDateKey,
  formatPlanPhaseDayRange,
  planDayCount,
  planDayIndex,
  PLAN_PHASE_DEFAULT_COLORS,
  relativePhasesFromBlocks,
  resizePlanPhaseInGaps,
  resolvePlanPhaseColor,
  shiftPlanPhaseInGaps,
  weekIndexFromDateKey,
  weekStartDayFromPlanDay,
  type TrainingPlanListItem,
} from '@/lib/training-plan'

/** Next sortOrder shared by sessions + race placeholders in a plan day slot. */
async function getNextPlanSlotSortOrder(
  planId: string,
  weekIndex: number,
  dayOfWeek: number,
) {
  const [sessionMax, raceMax] = await Promise.all([
    prisma.trainingPlanSession.aggregate({
      where: { planId, weekIndex, dayOfWeek },
      _max: { sortOrder: true },
    }),
    prisma.trainingPlanRacePlaceholder.aggregate({
      where: { planId, weekIndex, dayOfWeek },
      _max: { sortOrder: true },
    }),
  ])
  return Math.max(
    sessionMax._max.sortOrder ?? -1,
    raceMax._max.sortOrder ?? -1,
  ) + 1
}

async function requireCoachSession() {
  const session = await requireSession()
  // Coach workspace, or plan owner editing an AI / self-coach draft.
  if (isCoachView(session) || isCoach(session) || session.hasAthlete) {
    return session
  }
  throw new Error('Coach only')
}

export async function listTrainingPlans(): Promise<TrainingPlanListItem[]> {
  const session = await requireCoachSession()
  const plans = await prisma.trainingPlan.findMany({
    where: { coachId: session.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { sessions: true, phases: true } },
      forAthlete: { select: { id: true, name: true } },
    },
  })
  return plans.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    sportFocus: p.sportFocus,
    weekCount: p.weekCount,
    level: p.level,
    target: p.target,
    forAthleteId: p.forAthleteId,
    forAthleteName: p.forAthlete?.name ?? null,
    sessionCount: p._count.sessions,
    phaseCount: p._count.phases,
    updatedAt: p.updatedAt.toISOString(),
  }))
}

export type SaveTrainingPlanInput = {
  title: string
  description?: string
  sportFocus?: WorkoutType | null
  startWeekKey: string
  endWeekKey: string
  includeWorkouts: boolean
  includePhases: boolean
  athleteId?: string
}

export async function saveTrainingPlanFromRange(input: SaveTrainingPlanInput) {
  const session = await requireCoachSession()
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')
  if (!input.includeWorkouts && !input.includePhases) {
    throw new Error('Include workouts and/or phase structure')
  }

  const athleteId = input.athleteId ?? (await resolveAthleteId(session))
  if (!athleteId) throw new Error('No athlete selected')
  await requireCoachOwnsAthlete(session.userId, athleteId)

  const startMonday = startOfWeekDateOnly(parseDateOnly(input.startWeekKey))
  const endMonday = startOfWeekDateOnly(parseDateOnly(input.endWeekKey))
  if (endMonday.getTime() < startMonday.getTime()) {
    throw new Error('End week must be on or after start week')
  }
  const weekCount =
    Math.round((endMonday.getTime() - startMonday.getTime()) / (7 * 86400000)) +
    1
  const rangeStartKey = toDateKey(startMonday)
  const rangeEndKey = toDateKey(addDateOnlyDays(endMonday, 6))

  const [workouts, phaseBlocksRaw] = await Promise.all([
    input.includeWorkouts
      ? prisma.workout.findMany({
          where: {
            athleteId,
            date: {
              gte: parseDateOnly(rangeStartKey),
              lte: parseDateOnly(rangeEndKey),
            },
            isRescheduleGhost: false,
          },
          orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
        })
      : Promise.resolve([]),
    input.includePhases
      ? prisma.seasonPhaseBlock.findMany({
          where: { athleteId },
          orderBy: { startDate: 'asc' },
        })
      : Promise.resolve([]),
  ])

  if (input.includeWorkouts && workouts.length === 0) {
    throw new Error('No workouts in the selected weeks')
  }

  const phases = input.includePhases
    ? relativePhasesFromBlocks({
        blocks: phaseBlocksRaw.map(toTrainingPhaseBlock),
        planStartMondayKey: rangeStartKey,
        weekCount,
      })
    : []

  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: session.userId,
      title,
      description: input.description?.trim() || null,
      sportFocus: input.sportFocus ?? null,
      weekCount,
      sessions: input.includeWorkouts
        ? {
            create: workouts.map((w, i) => {
              const dateKey = toDateKey(w.date)
              return {
                weekIndex: weekIndexFromDateKey(dateKey, rangeStartKey),
                dayOfWeek: dayOfWeekFromDateKey(dateKey),
                sortOrder: i,
                type: w.type,
                sessionType: w.sessionType,
                title: w.title,
                description: w.description,
                plannedDistance: w.plannedDistance,
                plannedDuration: w.plannedDuration,
                plannedDistanceSource: w.plannedDistanceSource,
                plannedDurationSource: w.plannedDurationSource,
                coachNotes: w.coachNotes,
                coachNotesPrivate: w.coachNotesPrivate,
                structure: w.structure ?? undefined,
                swimEnvironment: w.swimEnvironment,
                swimStructure: w.swimStructure ?? undefined,
                plannedDistanceMeters: w.plannedDistanceMeters,
                plannedDistanceMetersSource: w.plannedDistanceMetersSource,
                tags: w.tags,
                sourceTemplateId: w.templateId,
              }
            }),
          }
        : undefined,
      phases:
        phases.length > 0
          ? {
              create: phases.map((p) => ({
                phase: p.phase,
                sport: p.sport,
                label: p.label,
                startDay: p.startDay,
                endDay: p.endDay,
              })),
            }
          : undefined,
    },
    select: { id: true, weekCount: true, title: true },
  })

  revalidatePath('/training')
  revalidatePath('/workouts')
  return plan
}

export type ApplyConflictPolicy = 'replace' | 'skip'

export type ApplyTrainingPlanPreview = {
  planId: string
  title: string
  weekCount: number
  startWeekMondayKey: string
  applyScope: 'whole' | 'phase'
  phaseId: string | null
  phaseLabel: string | null
  sessions: Array<{
    sessionId: string
    weekIndex: number
    dayOfWeek: number
    dateKey: string
    title: string
    type: WorkoutType
    conflictWorkoutIds: string[]
    raceNames: string[]
  }>
  races: Array<{
    raceId: string
    weekIndex: number
    dayOfWeek: number
    dateKey: string
    name: string
    type: RaceType
    existingRaceNames: string[]
  }>
  conflictCount: number
  raceConflictCount: number
  racePlaceholderCount: number
  phaseCount: number
  phases: Array<{
    id: string
    label: string
    startDay: number
    endDay: number
  }>
}

function phaseDisplayLabel(phase: {
  phase: SeasonPhase
  label: string | null
  startDay: number
  endDay: number
}): string {
  const name = displaySeasonPhaseName(phase.phase, phase.label)
  return `${name} · ${formatPlanPhaseDayRange(phase.startDay, phase.endDay)}`
}

export async function previewApplyTrainingPlan(args: {
  planId: string
  startWeekKey: string
  athleteId?: string
  /** When set, only sessions/races in this phase are applied; start week is that phase’s Week 1. */
  phaseId?: string | null
}): Promise<ApplyTrainingPlanPreview> {
  const session = await requireCoachSession()
  const athleteId = args.athleteId ?? (await resolveAthleteId(session))
  if (!athleteId) throw new Error('No athlete selected')
  await requireCoachOwnsAthlete(session.userId, athleteId)

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: args.planId, coachId: session.userId },
    include: {
      sessions: {
        orderBy: [
          { weekIndex: 'asc' },
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
      races: {
        orderBy: [
          { weekIndex: 'asc' },
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
      phases: { orderBy: { startDay: 'asc' } },
    },
  })
  if (!plan) throw new Error('Plan not found')

  const phasesSummary = plan.phases.map((p) => ({
    id: p.id,
    label: phaseDisplayLabel(p),
    startDay: p.startDay,
    endDay: p.endDay,
  }))

  let dayOffset = 0
  let spanDays = planDayCount(plan.weekCount)
  let applyScope: 'whole' | 'phase' = 'whole'
  let phaseId: string | null = null
  let phaseLabel: string | null = null
  let selectedPhase: (typeof plan.phases)[number] | null = null

  if (args.phaseId) {
    selectedPhase = plan.phases.find((p) => p.id === args.phaseId) ?? null
    if (!selectedPhase) throw new Error('Phase not found on this plan')
    applyScope = 'phase'
    phaseId = selectedPhase.id
    phaseLabel = phaseDisplayLabel(selectedPhase)
    dayOffset = weekStartDayFromPlanDay(selectedPhase.startDay)
    spanDays = selectedPhase.endDay - dayOffset + 1
  }

  const startMonday = startOfWeekDateOnly(parseDateOnly(args.startWeekKey))
  const startWeekMondayKey = toDateKey(startMonday)
  const rangeEndKey = toDateKey(addDateOnlyDays(startMonday, spanDays - 1))

  const [existing, races] = await Promise.all([
    prisma.workout.findMany({
      where: {
        athleteId,
        date: {
          gte: parseDateOnly(startWeekMondayKey),
          lte: parseDateOnly(rangeEndKey),
        },
        isRescheduleGhost: false,
      },
      select: { id: true, date: true },
    }),
    prisma.race.findMany({
      where: {
        athleteId,
        resultsLogOnly: false,
        date: {
          gte: parseDateOnly(startWeekMondayKey),
          lte: parseDateOnly(rangeEndKey),
        },
      },
      select: { name: true, date: true },
    }),
  ])

  const workoutsByDate = new Map<string, string[]>()
  for (const w of existing) {
    const key = toDateKey(w.date)
    const list = workoutsByDate.get(key) ?? []
    list.push(w.id)
    workoutsByDate.set(key, list)
  }
  const racesByDate = new Map<string, string[]>()
  for (const r of races) {
    const key = toDateKey(r.date)
    const list = racesByDate.get(key) ?? []
    list.push(r.name)
    racesByDate.set(key, list)
  }

  const inScopeDay = (weekIndex: number, dayOfWeek: number) => {
    if (!selectedPhase) return true
    const day = planDayIndex(weekIndex, dayOfWeek)
    return day >= selectedPhase.startDay && day <= selectedPhase.endDay
  }

  const placeholderRaces = plan.races
    .filter((r) => inScopeDay(r.weekIndex, r.dayOfWeek))
    .map((r) => {
      const relativeDay =
        planDayIndex(r.weekIndex, r.dayOfWeek) - dayOffset
      const relativeWeek = Math.floor(relativeDay / 7)
      const relativeDow = relativeDay % 7
      const dateKey = dateKeyForPlanSlot({
        startWeekMondayKey,
        weekIndex: relativeWeek,
        dayOfWeek: relativeDow,
      })
      return {
        raceId: r.id,
        weekIndex: relativeWeek,
        dayOfWeek: relativeDow,
        dateKey,
        name: r.name,
        type: r.type,
        existingRaceNames: racesByDate.get(dateKey) ?? [],
      }
    })
  for (const pr of placeholderRaces) {
    const list = racesByDate.get(pr.dateKey) ?? []
    if (!list.includes(pr.name)) {
      list.push(pr.name)
      racesByDate.set(pr.dateKey, list)
    }
  }

  const sessions = plan.sessions
    .filter((s) => inScopeDay(s.weekIndex, s.dayOfWeek))
    .map((s) => {
      const relativeDay =
        planDayIndex(s.weekIndex, s.dayOfWeek) - dayOffset
      const relativeWeek = Math.floor(relativeDay / 7)
      const relativeDow = relativeDay % 7
      const dateKey = dateKeyForPlanSlot({
        startWeekMondayKey,
        weekIndex: relativeWeek,
        dayOfWeek: relativeDow,
      })
      return {
        sessionId: s.id,
        weekIndex: relativeWeek,
        dayOfWeek: relativeDow,
        dateKey,
        title: s.title,
        type: s.type,
        conflictWorkoutIds: workoutsByDate.get(dateKey) ?? [],
        raceNames: racesByDate.get(dateKey) ?? [],
      }
    })

  return {
    planId: plan.id,
    title: plan.title,
    weekCount: Math.max(1, Math.ceil(spanDays / 7)),
    startWeekMondayKey,
    applyScope,
    phaseId,
    phaseLabel,
    sessions,
    races: placeholderRaces,
    conflictCount: sessions.filter((s) => s.conflictWorkoutIds.length > 0)
      .length,
    raceConflictCount: sessions.filter((s) => s.raceNames.length > 0).length,
    racePlaceholderCount: placeholderRaces.length,
    phaseCount: selectedPhase ? 1 : plan.phases.length,
    phases: phasesSummary,
  }
}

export async function applyTrainingPlan(args: {
  planId: string
  startWeekKey: string
  athleteId?: string
  conflictPolicy: ApplyConflictPolicy
  applyPhases: boolean
  phaseId?: string | null
}) {
  const session = await requireCoachSession()
  const athleteId = args.athleteId ?? (await resolveAthleteId(session))
  if (!athleteId) throw new Error('No athlete selected')
  await requireCoachOwnsAthlete(session.userId, athleteId)

  const preview = await previewApplyTrainingPlan({
    planId: args.planId,
    startWeekKey: args.startWeekKey,
    athleteId,
    phaseId: args.phaseId,
  })

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: args.planId, coachId: session.userId },
    include: { sessions: true, phases: true, races: true },
  })
  if (!plan) throw new Error('Plan not found')

  const preferences = await loadAthletePreferencesForBuilder(athleteId)
  const sessionById = new Map(plan.sessions.map((s) => [s.id, s]))
  let applied = 0
  let appliedRaces = 0

  // Materialize race placeholders first (preserve plan sortOrder for warm-up/cool-down).
  const raceById = new Map(plan.races.map((r) => [r.id, r]))
  for (const slot of preview.races) {
    if (slot.existingRaceNames.length > 0) continue
    const src = raceById.get(slot.raceId)
    if (!src) continue
    await prisma.race.create({
      data: {
        athleteId,
        name: src.name,
        date: parseDateOnly(slot.dateKey),
        location: src.location,
        type: src.type,
        sport: src.sport,
        courseType: src.courseType,
        triathlonDistance: src.triathlonDistance,
        hyroxDivision: src.hyroxDivision,
        customDistanceKm: src.customDistanceKm,
        priority: src.priority,
        intent: RaceIntent.PLANNED,
        goal: src.goal,
        preparationWeeks: src.preparationWeeks,
        daySortOrder: src.sortOrder,
      },
    })
    appliedRaces += 1
  }

  for (const slot of preview.sessions) {
    const hasWorkoutConflict = slot.conflictWorkoutIds.length > 0
    if (hasWorkoutConflict && args.conflictPolicy === 'skip') continue

    if (hasWorkoutConflict && args.conflictPolicy === 'replace') {
      await prisma.workout.deleteMany({
        where: { id: { in: slot.conflictWorkoutIds }, athleteId },
      })
    }

    const src = sessionById.get(slot.sessionId)
    if (!src) continue

    const metrics = resolveTrainingPlanSessionMetricsForAthlete(
      {
        type: src.type,
        sessionType: src.sessionType,
        plannedDistance: src.plannedDistance,
        plannedDuration: src.plannedDuration,
        plannedDistanceMeters: src.plannedDistanceMeters,
        plannedDistanceSource: src.plannedDistanceSource,
        plannedDurationSource: src.plannedDurationSource,
        plannedDistanceMetersSource: src.plannedDistanceMetersSource,
        structure: src.structure,
      },
      preferences,
    )
    const tags = syncApproxTagsFromSources(src.tags, {
      distance: metrics.distanceSource,
      duration: metrics.durationSource,
    })

    const workoutDate = parseDateOnly(slot.dateKey)
    await prisma.workout.create({
      data: {
        athleteId,
        templateId: src.sourceTemplateId,
        planId: plan.id,
        planSessionId: src.id,
        date: workoutDate,
        sortOrder: src.sortOrder,
        type: src.type,
        sessionType: src.sessionType,
        title: src.title,
        description: src.description,
        plannedDistance: metrics.distanceKm,
        plannedDuration: metrics.durationMin,
        plannedDistanceSource: metrics.distanceSource,
        plannedDurationSource: metrics.durationSource,
        coachNotes: src.coachNotes,
        coachNotesPrivate: src.coachNotesPrivate,
        structure: src.structure ?? undefined,
        structureDiagram: structureDiagramPrismaValue(src.structure, {
          durationMinutes: metrics.durationMin,
        }),
        swimEnvironment: src.swimEnvironment,
        swimStructure: src.swimStructure ?? undefined,
        plannedDistanceMeters: metrics.distanceMeters,
        plannedDistanceMetersSource: metrics.distanceMetersSource,
        tags,
      },
    })
    applied += 1
  }

  if (args.applyPhases && plan.phases.length > 0) {
    const phasesToApply = preview.phaseId
      ? plan.phases.filter((p) => p.id === preview.phaseId)
      : plan.phases
    const dayOffset = preview.phaseId
      ? weekStartDayFromPlanDay(
          plan.phases.find((p) => p.id === preview.phaseId)?.startDay ?? 0,
        )
      : 0

    for (const phase of phasesToApply) {
      const startKey = dateKeyForPlanDay({
        startWeekMondayKey: preview.startWeekMondayKey,
        dayIndex: phase.startDay - dayOffset,
      })
      const endKey = dateKeyForPlanDay({
        startWeekMondayKey: preview.startWeekMondayKey,
        dayIndex: phase.endDay - dayOffset,
      })
      await prisma.seasonPhaseBlock.create({
        data: {
          athleteId,
          sport: phase.sport,
          phase: phase.phase,
          label: phase.label,
          startDate: parseDateOnly(startKey),
          endDate: parseDateOnly(endKey),
        },
      })
    }
  }

  revalidatePath('/training')
  revalidatePath('/season')
  revalidatePath('/dashboard')
  return {
    ok: true as const,
    appliedSessions: applied,
    appliedRaces,
  }
}

export async function updateTrainingPlan(args: {
  planId: string
  title: string
  description?: string
  sportFocus?: WorkoutType | null
  level?: string | null
  forAthleteId?: string | null
}) {
  const session = await requireCoachSession()
  const title = args.title.trim()
  if (!title) throw new Error('Title is required')

  const existing = await prisma.trainingPlan.findFirst({
    where: { id: args.planId, coachId: session.userId },
    select: { id: true, level: true, forAthleteId: true },
  })
  if (!existing) throw new Error('Plan not found')

  const level = normalizePlanLevel(args.level)
  const forAthleteId = await resolvePlanForAthleteId(
    session.userId,
    args.forAthleteId,
  )

  const audienceChanged =
    level !== existing.level || forAthleteId !== existing.forAthleteId

  await prisma.trainingPlan.update({
    where: { id: args.planId },
    data: {
      title,
      description: args.description?.trim() || null,
      sportFocus: args.sportFocus ?? null,
      level,
      forAthleteId,
    },
  })

  if (audienceChanged) {
    await recalculateTrainingPlanSessionsForAudience({
      planId: args.planId,
      level,
      forAthleteId,
    })
  }

  revalidatePath('/training')
  revalidatePath('/workouts')
  revalidatePath(`/workouts/plans/${args.planId}`)
}

async function recalculateTrainingPlanSessionsForAudience(args: {
  planId: string
  level: string | null
  forAthleteId: string | null
}) {
  const { preferences } = await resolveTrainingPlanEstimationPreferences({
    forAthleteId: args.forAthleteId,
    level: args.level,
  })

  const sessions = await prisma.trainingPlanSession.findMany({
    where: { planId: args.planId },
    select: {
      id: true,
      type: true,
      sessionType: true,
      plannedDistance: true,
      plannedDuration: true,
      plannedDistanceMeters: true,
      plannedDistanceSource: true,
      plannedDurationSource: true,
      plannedDistanceMetersSource: true,
      structure: true,
      tags: true,
    },
  })
  if (sessions.length === 0) return

  await prisma.$transaction(
    sessions.map((planSession) => {
      const metrics = recalculateTrainingPlanSessionMetricsForPreferences(
        {
          type: planSession.type,
          sessionType: planSession.sessionType,
          plannedDistance: planSession.plannedDistance,
          plannedDuration: planSession.plannedDuration,
          plannedDistanceMeters: planSession.plannedDistanceMeters,
          plannedDistanceSource: planSession.plannedDistanceSource,
          plannedDurationSource: planSession.plannedDurationSource,
          plannedDistanceMetersSource: planSession.plannedDistanceMetersSource,
          structure: planSession.structure,
        },
        preferences,
      )
      const tags = syncApproxTagsFromSources(planSession.tags, {
        distance: metrics.distanceSource,
        duration: metrics.durationSource,
      })
      return prisma.trainingPlanSession.update({
        where: { id: planSession.id },
        data: {
          plannedDistance: metrics.distanceKm,
          plannedDuration: metrics.durationMin,
          plannedDistanceMeters: metrics.distanceMeters,
          plannedDistanceSource: metrics.distanceSource,
          plannedDurationSource: metrics.durationSource,
          plannedDistanceMetersSource: metrics.distanceMetersSource,
          tags,
        },
      })
    }),
  )
}

export async function deleteTrainingPlan(planId: string) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: session.userId },
    select: { id: true },
  })
  if (!existing) throw new Error('Plan not found')
  await prisma.trainingPlan.delete({ where: { id: planId } })
  revalidatePath('/training')
  revalidatePath('/workouts')
}

export async function getTrainingPlanDetail(planId: string) {
  const session = await requireCoachSession()
  return prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: session.userId },
    include: {
      forAthlete: { select: { id: true, name: true } },
      sessions: {
        orderBy: [
          { weekIndex: 'asc' },
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
      races: {
        orderBy: [
          { weekIndex: 'asc' },
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
      phases: { orderBy: { startDay: 'asc' } },
    },
  })
}

async function requireOwnedPlan(coachId: string, planId: string) {
  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId },
  })
  if (!plan) throw new Error('Plan not found')
  return plan
}

/** undefined = leave unchanged; null = use default (store null); hex = custom. */
function normalizeOptionalPhaseColor(
  phase: SeasonPhase,
  color: string | null | undefined,
): string | null | undefined {
  if (color === undefined) return undefined
  if (color == null || color.trim() === '') return null
  const resolved = resolvePlanPhaseColor(phase, color)
  if (resolved === PLAN_PHASE_DEFAULT_COLORS[phase]) return null
  return resolved
}

function clampWeekIndex(weekIndex: number, weekCount: number) {
  if (weekCount < 1) throw new Error('Plan has no weeks')
  if (weekIndex < 0 || weekIndex >= weekCount) {
    throw new Error('Week is outside the plan')
  }
}

function clampDayOfWeek(dayOfWeek: number) {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Day of week must be Monday–Sunday')
  }
}

export type CreateTrainingPlanInput = {
  title: string
  description?: string
  sportFocus?: WorkoutType | null
  weekCount: number
  level?: string | null
  forAthleteId?: string | null
}

function normalizePlanLevel(raw: string | null | undefined): string | null {
  return parseTrainingPlanAthleteLevel(raw)
}

async function resolvePlanForAthleteId(
  coachUserId: string,
  forAthleteId: string | null | undefined,
): Promise<string | null> {
  if (forAthleteId == null) return null
  const id = forAthleteId.trim()
  if (!id || id === 'none') return null
  await requireCoachOwnsAthlete(coachUserId, id)
  return id
}

export async function createTrainingPlan(input: CreateTrainingPlanInput) {
  const session = await requireCoachSession()
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')
  const weekCount = Math.floor(input.weekCount)
  if (!Number.isFinite(weekCount) || weekCount < 1 || weekCount > 52) {
    throw new Error('Week count must be between 1 and 52')
  }

  const level = normalizePlanLevel(input.level)
  const forAthleteId = await resolvePlanForAthleteId(
    session.userId,
    input.forAthleteId,
  )

  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: session.userId,
      title,
      description: input.description?.trim() || null,
      sportFocus: input.sportFocus ?? null,
      weekCount,
      level,
      forAthleteId,
    },
    select: { id: true, title: true, weekCount: true },
  })

  revalidatePath('/workouts')
  revalidatePath('/workouts/plans')
  return plan
}

export async function setTrainingPlanWeekCount(args: {
  planId: string
  weekCount: number
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  const weekCount = Math.floor(args.weekCount)
  if (!Number.isFinite(weekCount) || weekCount < 1 || weekCount > 52) {
    throw new Error('Week count must be between 1 and 52')
  }
  if (weekCount === plan.weekCount) {
    return { id: plan.id, weekCount, removedSessions: 0, removedRaces: 0 }
  }

  const result = await prisma.$transaction(async (tx) => {
    let removedSessions = 0
    let removedRaces = 0
    if (weekCount < plan.weekCount) {
      const deleted = await tx.trainingPlanSession.deleteMany({
        where: { planId: plan.id, weekIndex: { gte: weekCount } },
      })
      removedSessions = deleted.count
      const deletedRaces = await tx.trainingPlanRacePlaceholder.deleteMany({
        where: { planId: plan.id, weekIndex: { gte: weekCount } },
      })
      removedRaces = deletedRaces.count
      // Drop phases that start past the new end; clamp remaining endDay.
      const maxDay = weekCount * 7 - 1
      await tx.trainingPlanPhase.deleteMany({
        where: { planId: plan.id, startDay: { gt: maxDay } },
      })
      const phases = await tx.trainingPlanPhase.findMany({
        where: { planId: plan.id },
      })
      for (const phase of phases) {
        const nextEnd = Math.min(phase.endDay, maxDay)
        if (nextEnd !== phase.endDay) {
          await tx.trainingPlanPhase.update({
            where: { id: phase.id },
            data: { endDay: nextEnd },
          })
        }
      }
    }

    await tx.trainingPlan.update({
      where: { id: plan.id },
      data: { weekCount },
    })
    return { id: plan.id, weekCount, removedSessions, removedRaces }
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/plans/${plan.id}`)
  return result
}

export async function addTrainingPlanSessionFromTemplate(args: {
  planId: string
  templateId: string
  weekIndex: number
  dayOfWeek: number
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  clampWeekIndex(args.weekIndex, plan.weekCount)
  clampDayOfWeek(args.dayOfWeek)

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: args.templateId, coachId: session.userId },
  })
  if (!template) throw new Error('Template not found')

  // Keep prescriptions portable: store template structure + metric sources as-is.
  // Athlete-specific distance/duration/CSS/pace totals are resolved on apply.
  const sortOrder = await getNextPlanSlotSortOrder(
    plan.id,
    args.weekIndex,
    args.dayOfWeek,
  )

  const created = await prisma.trainingPlanSession.create({
    data: {
      planId: plan.id,
      weekIndex: args.weekIndex,
      dayOfWeek: args.dayOfWeek,
      sortOrder,
      type: template.type,
      sessionType: template.sessionType,
      title: template.title,
      description: template.description,
      plannedDistance: template.distanceKm,
      plannedDuration: template.durationMin,
      plannedDistanceSource: template.distanceSource ?? undefined,
      plannedDurationSource: template.durationSource ?? undefined,
      coachNotes: template.notes,
      structure: template.structure ?? undefined,
      swimEnvironment: template.swimEnvironment ?? undefined,
      swimStructure: template.swimStructure ?? undefined,
      plannedDistanceMeters: template.plannedDistanceMeters ?? undefined,
      plannedDistanceMetersSource:
        template.plannedDistanceMetersSource ?? undefined,
      tags: template.tags,
      sourceTemplateId: template.id,
    },
  })

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })

  revalidatePath(`/workouts/plans/${plan.id}`)
  return { id: created.id }
}

export type TrainingPlanSessionModalPayload = {
  planId: string
  weekIndex: number
  dayOfWeek: number
  title: string
  description?: string
  sportType: WorkoutType
  sessionType: SessionType
  plannedDistance?: number | null
  plannedDuration?: number | null
  plannedDistanceSource?: PlannedMetricSource | null
  plannedDurationSource?: PlannedMetricSource | null
  plannedDistanceMeters?: number | null
  plannedDistanceMetersSource?: PlannedMetricSource | null
  coachNotes?: string | null
  coachNotesPrivate?: boolean
  structure?: unknown | null
  swimEnvironment?: SwimEnvironment | null
  swimStructure?: unknown | null
  tags?: string[]
  sourceTemplateId?: string | null
}

export async function createTrainingPlanSession(
  payload: TrainingPlanSessionModalPayload,
) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, payload.planId)
  clampWeekIndex(payload.weekIndex, plan.weekCount)
  clampDayOfWeek(payload.dayOfWeek)

  const sortOrder = await getNextPlanSlotSortOrder(
    plan.id,
    payload.weekIndex,
    payload.dayOfWeek,
  )

  const title = payload.title.trim() || 'Workout'
  const created = await prisma.trainingPlanSession.create({
    data: {
      planId: plan.id,
      weekIndex: payload.weekIndex,
      dayOfWeek: payload.dayOfWeek,
      sortOrder,
      type: payload.sportType,
      sessionType: payload.sessionType,
      title,
      description: payload.description?.trim() || null,
      plannedDistance: payload.plannedDistance ?? null,
      plannedDuration: payload.plannedDuration ?? null,
      plannedDistanceSource: payload.plannedDistanceSource ?? undefined,
      plannedDurationSource: payload.plannedDurationSource ?? undefined,
      plannedDistanceMeters: payload.plannedDistanceMeters ?? null,
      plannedDistanceMetersSource:
        payload.plannedDistanceMetersSource ?? undefined,
      coachNotes: payload.coachNotes?.trim() || null,
      coachNotesPrivate: Boolean(payload.coachNotesPrivate),
      structure:
        payload.structure != null
          ? (payload.structure as Prisma.InputJsonValue)
          : undefined,
      swimEnvironment: payload.swimEnvironment ?? undefined,
      swimStructure:
        payload.swimStructure != null
          ? (payload.swimStructure as Prisma.InputJsonValue)
          : undefined,
      tags: payload.tags ?? [],
      sourceTemplateId: payload.sourceTemplateId ?? undefined,
    },
  })

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${plan.id}`)
  return { id: created.id }
}

export async function updateTrainingPlanSession(
  payload: TrainingPlanSessionModalPayload & { sessionId: string },
) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanSession.findFirst({
    where: { id: payload.sessionId, plan: { coachId: session.userId } },
    include: { plan: { select: { id: true, weekCount: true } } },
  })
  if (!existing) throw new Error('Session not found')
  clampWeekIndex(payload.weekIndex, existing.plan.weekCount)
  clampDayOfWeek(payload.dayOfWeek)

  const title = payload.title.trim() || 'Workout'
  await prisma.trainingPlanSession.update({
    where: { id: existing.id },
    data: {
      weekIndex: payload.weekIndex,
      dayOfWeek: payload.dayOfWeek,
      type: payload.sportType,
      sessionType: payload.sessionType,
      title,
      description: payload.description?.trim() || null,
      plannedDistance: payload.plannedDistance ?? null,
      plannedDuration: payload.plannedDuration ?? null,
      plannedDistanceSource: payload.plannedDistanceSource ?? null,
      plannedDurationSource: payload.plannedDurationSource ?? null,
      plannedDistanceMeters: payload.plannedDistanceMeters ?? null,
      plannedDistanceMetersSource:
        payload.plannedDistanceMetersSource ?? null,
      coachNotes: payload.coachNotes?.trim() || null,
      coachNotesPrivate: Boolean(payload.coachNotesPrivate),
      structure:
        payload.structure != null
          ? (payload.structure as Prisma.InputJsonValue)
          : Prisma.DbNull,
      swimEnvironment: payload.swimEnvironment ?? null,
      swimStructure:
        payload.swimStructure != null
          ? (payload.swimStructure as Prisma.InputJsonValue)
          : Prisma.DbNull,
      tags: payload.tags ?? [],
      sourceTemplateId: payload.sourceTemplateId ?? null,
    },
  })

  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
  return { id: existing.id }
}

export async function moveTrainingPlanSession(args: {
  sessionId: string
  weekIndex: number
  dayOfWeek: number
}) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanSession.findFirst({
    where: { id: args.sessionId, plan: { coachId: session.userId } },
    include: { plan: { select: { id: true, weekCount: true } } },
  })
  if (!existing) throw new Error('Session not found')
  clampWeekIndex(args.weekIndex, existing.plan.weekCount)
  clampDayOfWeek(args.dayOfWeek)

  if (
    existing.weekIndex === args.weekIndex &&
    existing.dayOfWeek === args.dayOfWeek
  ) {
    return { id: existing.id }
  }

  const sortOrder = await getNextPlanSlotSortOrder(
    existing.planId,
    args.weekIndex,
    args.dayOfWeek,
  )

  await prisma.trainingPlanSession.update({
    where: { id: existing.id },
    data: {
      weekIndex: args.weekIndex,
      dayOfWeek: args.dayOfWeek,
      sortOrder,
    },
  })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })

  revalidatePath(`/workouts/plans/${existing.planId}`)
  return { id: existing.id }
}

export async function moveTrainingPlanRacePlaceholder(args: {
  raceId: string
  weekIndex: number
  dayOfWeek: number
}) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanRacePlaceholder.findFirst({
    where: { id: args.raceId, plan: { coachId: session.userId } },
    include: { plan: { select: { id: true, weekCount: true } } },
  })
  if (!existing) throw new Error('Race placeholder not found')
  clampWeekIndex(args.weekIndex, existing.plan.weekCount)
  clampDayOfWeek(args.dayOfWeek)

  if (
    existing.weekIndex === args.weekIndex &&
    existing.dayOfWeek === args.dayOfWeek
  ) {
    return { id: existing.id }
  }

  const sortOrder = await getNextPlanSlotSortOrder(
    existing.planId,
    args.weekIndex,
    args.dayOfWeek,
  )

  await prisma.trainingPlanRacePlaceholder.update({
    where: { id: existing.id },
    data: {
      weekIndex: args.weekIndex,
      dayOfWeek: args.dayOfWeek,
      sortOrder,
    },
  })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })

  revalidatePath(`/workouts/plans/${existing.planId}`)
  return { id: existing.id }
}

/**
 * Same-slot reorder for plan canvas: sessions + race placeholders share sortOrder.
 */
export async function movePlanCanvasItemRelative(args: {
  planId: string
  weekIndex: number
  dayOfWeek: number
  movedId: string
  movedKind: 'session' | 'race'
  targetId: string
  targetKind: 'session' | 'race'
  placement?: 'before' | 'after'
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  clampWeekIndex(args.weekIndex, plan.weekCount)
  clampDayOfWeek(args.dayOfWeek)
  if (
    args.movedKind === args.targetKind &&
    args.movedId === args.targetId
  ) {
    return
  }

  const placement = args.placement ?? 'before'
  const [sessions, races] = await Promise.all([
    prisma.trainingPlanSession.findMany({
      where: {
        planId: plan.id,
        weekIndex: args.weekIndex,
        dayOfWeek: args.dayOfWeek,
      },
      select: { id: true, sortOrder: true, title: true },
    }),
    prisma.trainingPlanRacePlaceholder.findMany({
      where: {
        planId: plan.id,
        weekIndex: args.weekIndex,
        dayOfWeek: args.dayOfWeek,
      },
      select: { id: true, sortOrder: true, name: true },
    }),
  ])

  type Row = {
    kind: 'session' | 'race'
    id: string
    order: number
    title: string
  }
  const rows: Row[] = [
    ...sessions.map((s) => ({
      kind: 'session' as const,
      id: s.id,
      order: s.sortOrder,
      title: s.title,
    })),
    ...races.map((r) => ({
      kind: 'race' as const,
      id: r.id,
      order: r.sortOrder,
      title: r.name,
    })),
  ].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

  const from = rows.findIndex(
    (r) => r.kind === args.movedKind && r.id === args.movedId,
  )
  const targetIndex = rows.findIndex(
    (r) => r.kind === args.targetKind && r.id === args.targetId,
  )
  if (from < 0 || targetIndex < 0) {
    throw new Error('Item not found on this day')
  }

  const next = [...rows]
  const [item] = next.splice(from, 1)
  if (!item) return
  let insertAt = placement === 'after' ? targetIndex + 1 : targetIndex
  if (from < insertAt) insertAt -= 1
  next.splice(insertAt, 0, item)

  await prisma.$transaction(
    next.map((row, index) =>
      row.kind === 'session'
        ? prisma.trainingPlanSession.update({
            where: { id: row.id },
            data: { sortOrder: index },
          })
        : prisma.trainingPlanRacePlaceholder.update({
            where: { id: row.id },
            data: { sortOrder: index },
          }),
    ),
  )

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${plan.id}`)
}

export async function deleteTrainingPlanSession(sessionId: string) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanSession.findFirst({
    where: { id: sessionId, plan: { coachId: session.userId } },
    select: { id: true, planId: true },
  })
  if (!existing) throw new Error('Session not found')
  await prisma.trainingPlanSession.delete({ where: { id: existing.id } })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
}

/** Duplicate a plan session onto the same day (appended after existing items). */
export async function duplicateTrainingPlanSession(sessionId: string) {
  return copyTrainingPlanSessionToSlots({
    sessionId,
    slots: undefined,
  })
}

/**
 * Copy a plan session to one or more plan days.
 * When `slots` is omitted, copies onto the source day only.
 */
export async function copyTrainingPlanSessionToSlots(args: {
  sessionId: string
  slots?: Array<{ weekIndex: number; dayOfWeek: number }>
}) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanSession.findFirst({
    where: { id: args.sessionId, plan: { coachId: session.userId } },
    include: { plan: { select: { id: true, weekCount: true } } },
  })
  if (!existing) throw new Error('Session not found')

  const targets =
    args.slots && args.slots.length > 0
      ? args.slots
      : [{ weekIndex: existing.weekIndex, dayOfWeek: existing.dayOfWeek }]

  const createdIds: string[] = []
  for (const slot of targets) {
    clampWeekIndex(slot.weekIndex, existing.plan.weekCount)
    clampDayOfWeek(slot.dayOfWeek)
    const sortOrder = await getNextPlanSlotSortOrder(
      existing.planId,
      slot.weekIndex,
      slot.dayOfWeek,
    )
    const created = await prisma.trainingPlanSession.create({
      data: {
        planId: existing.planId,
        weekIndex: slot.weekIndex,
        dayOfWeek: slot.dayOfWeek,
        sortOrder,
        type: existing.type,
        sessionType: existing.sessionType,
        title: existing.title,
        description: existing.description,
        plannedDistance: existing.plannedDistance,
        plannedDuration: existing.plannedDuration,
        plannedDistanceSource: existing.plannedDistanceSource,
        plannedDurationSource: existing.plannedDurationSource,
        plannedDistanceMeters: existing.plannedDistanceMeters,
        plannedDistanceMetersSource: existing.plannedDistanceMetersSource,
        coachNotes: existing.coachNotes,
        coachNotesPrivate: existing.coachNotesPrivate,
        structure:
          existing.structure != null
            ? (existing.structure as Prisma.InputJsonValue)
            : undefined,
        swimEnvironment: existing.swimEnvironment,
        swimStructure:
          existing.swimStructure != null
            ? (existing.swimStructure as Prisma.InputJsonValue)
            : undefined,
        tags: existing.tags,
        sourceTemplateId: existing.sourceTemplateId,
      },
    })
    createdIds.push(created.id)
  }

  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
  return { ids: createdIds }
}

export type TrainingPlanRacePlaceholderPayload = {
  planId: string
  weekIndex: number
  dayOfWeek: number
  name: string
  type: RaceType
  sport?: WorkoutType
  priority?: RacePriority
  location?: string | null
  goal?: string | null
  courseType?: RaceCourseType | null
  triathlonDistance?: TriathlonDistance | null
  hyroxDivision?: HyroxDivision | null
  customDistanceKm?: number | null
  preparationWeeks?: number | null
}

function normalizeRacePlaceholderPayload(
  payload: TrainingPlanRacePlaceholderPayload,
) {
  const name = payload.name.trim()
  if (!name) throw new Error('Race name is required')
  return {
    name,
    type: payload.type,
    sport: payload.sport ?? WorkoutType.RUN,
    priority: payload.priority ?? RacePriority.C,
    location: payload.location?.trim() || null,
    goal: payload.goal?.trim() || null,
    courseType: payload.courseType ?? null,
    triathlonDistance: payload.triathlonDistance ?? null,
    hyroxDivision: payload.hyroxDivision ?? null,
    customDistanceKm:
      payload.customDistanceKm != null &&
      Number.isFinite(payload.customDistanceKm) &&
      payload.customDistanceKm > 0
        ? payload.customDistanceKm
        : null,
    preparationWeeks:
      payload.preparationWeeks != null &&
      Number.isFinite(payload.preparationWeeks) &&
      payload.preparationWeeks > 0
        ? Math.floor(payload.preparationWeeks)
        : null,
  }
}

export async function createTrainingPlanRacePlaceholder(
  payload: TrainingPlanRacePlaceholderPayload,
) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, payload.planId)
  clampWeekIndex(payload.weekIndex, plan.weekCount)
  clampDayOfWeek(payload.dayOfWeek)
  const data = normalizeRacePlaceholderPayload(payload)

  const sortOrder = await getNextPlanSlotSortOrder(
    plan.id,
    payload.weekIndex,
    payload.dayOfWeek,
  )

  const created = await prisma.trainingPlanRacePlaceholder.create({
    data: {
      planId: plan.id,
      weekIndex: payload.weekIndex,
      dayOfWeek: payload.dayOfWeek,
      sortOrder,
      ...data,
    },
    select: { id: true },
  })
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${plan.id}`)
  return created
}

export async function updateTrainingPlanRacePlaceholder(args: {
  raceId: string
  name: string
  type: RaceType
  sport?: WorkoutType
  priority?: RacePriority
  location?: string | null
  goal?: string | null
  courseType?: RaceCourseType | null
  triathlonDistance?: TriathlonDistance | null
  hyroxDivision?: HyroxDivision | null
  customDistanceKm?: number | null
  preparationWeeks?: number | null
}) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanRacePlaceholder.findFirst({
    where: { id: args.raceId, plan: { coachId: session.userId } },
    select: { id: true, planId: true, weekIndex: true, dayOfWeek: true },
  })
  if (!existing) throw new Error('Race placeholder not found')

  const data = normalizeRacePlaceholderPayload({
    planId: existing.planId,
    weekIndex: existing.weekIndex,
    dayOfWeek: existing.dayOfWeek,
    name: args.name,
    type: args.type,
    sport: args.sport,
    priority: args.priority,
    location: args.location,
    goal: args.goal,
    courseType: args.courseType,
    triathlonDistance: args.triathlonDistance,
    hyroxDivision: args.hyroxDivision,
    customDistanceKm: args.customDistanceKm,
    preparationWeeks: args.preparationWeeks,
  })

  await prisma.trainingPlanRacePlaceholder.update({
    where: { id: existing.id },
    data,
  })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
  return { id: existing.id }
}

export async function deleteTrainingPlanRacePlaceholder(raceId: string) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanRacePlaceholder.findFirst({
    where: { id: raceId, plan: { coachId: session.userId } },
    select: { id: true, planId: true },
  })
  if (!existing) throw new Error('Race placeholder not found')
  await prisma.trainingPlanRacePlaceholder.delete({ where: { id: existing.id } })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
}

/** Copy a plan-canvas session into the coach workout library as a new template. */
export async function createTemplateFromTrainingPlanSession(args: {
  sessionId: string
  /** Optional folder — must belong to coach and match the session sport. */
  folderId?: string | null
}) {
  const session = await requireCoachSession()
  if (!args.sessionId) throw new Error('Session required')

  const planSession = await prisma.trainingPlanSession.findFirst({
    where: { id: args.sessionId, plan: { coachId: session.userId } },
  })
  if (!planSession) throw new Error('Session not found')

  let folderId: string | null = null
  if (args.folderId) {
    const folder = await prisma.workoutTemplateFolder.findFirst({
      where: {
        id: args.folderId,
        coachId: session.userId,
        sport: planSession.type,
      },
      select: { id: true },
    })
    if (!folder) throw new Error('Folder not found for this sport')
    folderId = folder.id
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      folderId: folderId ?? undefined,
      title: planSession.title,
      type: planSession.type,
      sessionType: planSession.sessionType,
      description: planSession.description,
      distanceKm: planSession.plannedDistance,
      durationMin: planSession.plannedDuration,
      distanceSource: planSession.plannedDistanceSource ?? undefined,
      durationSource: planSession.plannedDurationSource ?? undefined,
      notes: planSession.coachNotes,
      structure: planSession.structure ?? undefined,
      swimEnvironment: planSession.swimEnvironment ?? undefined,
      swimStructure: planSession.swimStructure ?? undefined,
      plannedDistanceMeters: planSession.plannedDistanceMeters ?? undefined,
      plannedDistanceMetersSource:
        planSession.plannedDistanceMetersSource ?? undefined,
      tags: planSession.tags,
    },
    select: {
      id: true,
      title: true,
      type: true,
      folderId: true,
    },
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(template.type)}`)
  revalidatePath(`/workouts/plans/${planSession.planId}`)
  return template
}

function clampPlanDay(day: number, weekCount: number) {
  const dayCount = planDayCount(weekCount)
  if (dayCount < 1) throw new Error('Plan has no weeks')
  if (day < 0 || day >= dayCount) {
    throw new Error('Day is outside the plan')
  }
}

export async function createTrainingPlanPhase(args: {
  planId: string
  phase: SeasonPhase
  sport: WorkoutType
  label?: string | null
  startDay: number
  endDay: number
  color?: string | null
  /** Trim / split / remove overlapping phases so this range can be saved. */
  resolveOverlaps?: boolean
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  clampPlanDay(args.startDay, plan.weekCount)
  clampPlanDay(args.endDay, plan.weekCount)
  if (args.endDay < args.startDay) {
    throw new Error('End day must be on or after start day')
  }

  const existingPhases = await prisma.trainingPlanPhase.findMany({
    where: { planId: plan.id },
    select: {
      id: true,
      startDay: true,
      endDay: true,
      phase: true,
      sport: true,
      label: true,
      color: true,
    },
  })
  if (!args.resolveOverlaps) {
    assertNoPlanPhaseOverlap({
      candidate: { startDay: args.startDay, endDay: args.endDay },
      existing: existingPhases,
    })
  }

  const color = normalizeOptionalPhaseColor(args.phase, args.color ?? null)
  const carve = args.resolveOverlaps
    ? carvePlanPhasesForIncomingRange({
        existing: existingPhases,
        candidate: { startDay: args.startDay, endDay: args.endDay },
      })
    : { updates: [], deletes: [], creates: [] }

  const created = await prisma.$transaction(async (tx) => {
    await applyPhaseCarveInTx(tx, plan.id, existingPhases, carve)
    return tx.trainingPlanPhase.create({
      data: {
        planId: plan.id,
        phase: args.phase,
        sport: args.sport,
        label: args.label?.trim() || null,
        startDay: args.startDay,
        endDay: args.endDay,
        color: color ?? null,
      },
    })
  })
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${plan.id}`)
  return { id: created.id }
}

export async function updateTrainingPlanPhase(args: {
  phaseId: string
  phase: SeasonPhase
  sport: WorkoutType
  label?: string | null
  startDay: number
  endDay: number
  color?: string | null
  /** Trim / split / remove overlapping phases so this range can be saved. */
  resolveOverlaps?: boolean
}) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanPhase.findFirst({
    where: { id: args.phaseId, plan: { coachId: session.userId } },
    include: { plan: { select: { id: true, weekCount: true } } },
  })
  if (!existing) throw new Error('Phase not found')
  clampPlanDay(args.startDay, existing.plan.weekCount)
  clampPlanDay(args.endDay, existing.plan.weekCount)
  if (args.endDay < args.startDay) {
    throw new Error('End day must be on or after start day')
  }

  const siblings = await prisma.trainingPlanPhase.findMany({
    where: { planId: existing.planId },
    select: {
      id: true,
      startDay: true,
      endDay: true,
      phase: true,
      sport: true,
      label: true,
      color: true,
    },
  })
  if (!args.resolveOverlaps) {
    assertNoPlanPhaseOverlap({
      candidate: { startDay: args.startDay, endDay: args.endDay },
      existing: siblings,
      excludeId: existing.id,
    })
  }

  const color = normalizeOptionalPhaseColor(args.phase, args.color)
  const carve = args.resolveOverlaps
    ? carvePlanPhasesForIncomingRange({
        existing: siblings,
        candidate: { startDay: args.startDay, endDay: args.endDay },
        excludeId: existing.id,
      })
    : { updates: [], deletes: [], creates: [] }

  await prisma.$transaction(async (tx) => {
    await applyPhaseCarveInTx(tx, existing.planId, siblings, carve)
    await tx.trainingPlanPhase.update({
      where: { id: existing.id },
      data: {
        phase: args.phase,
        sport: args.sport,
        label: args.label?.trim() || null,
        startDay: args.startDay,
        endDay: args.endDay,
        ...(color !== undefined ? { color } : {}),
      },
    })
  })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
}

type PhaseCarveSource = {
  id: string
  phase: SeasonPhase
  sport: WorkoutType
  label: string | null
  color: string | null
}

async function applyPhaseCarveInTx(
  tx: Prisma.TransactionClient,
  planId: string,
  sources: PhaseCarveSource[],
  carve: ReturnType<typeof carvePlanPhasesForIncomingRange>,
) {
  if (
    carve.deletes.length === 0 &&
    carve.updates.length === 0 &&
    carve.creates.length === 0
  ) {
    return
  }
  const byId = new Map(sources.map((p) => [p.id, p]))
  if (carve.deletes.length > 0) {
    await tx.trainingPlanPhase.deleteMany({
      where: { planId, id: { in: carve.deletes } },
    })
  }
  for (const update of carve.updates) {
    await tx.trainingPlanPhase.update({
      where: { id: update.id },
      data: { startDay: update.startDay, endDay: update.endDay },
    })
  }
  for (const create of carve.creates) {
    const src = byId.get(create.cloneFromId)
    if (!src) continue
    await tx.trainingPlanPhase.create({
      data: {
        planId,
        phase: src.phase,
        sport: src.sport,
        label: src.label,
        color: src.color,
        startDay: create.startDay,
        endDay: create.endDay,
      },
    })
  }
}

/** Persist day ranges after timeline resize/move. */
export async function applyTrainingPlanPhaseRanges(args: {
  planId: string
  ranges: Array<{ id: string; startDay: number; endDay: number }>
}) {
  const session = await requireCoachSession()
  await applyPhaseRangesForCoach(session.userId, args.planId, args.ranges)
}

async function applyPhaseRangesForCoach(
  coachId: string,
  planId: string,
  ranges: Array<{ id: string; startDay: number; endDay: number }>,
) {
  const plan = await requireOwnedPlan(coachId, planId)
  const existing = await prisma.trainingPlanPhase.findMany({
    where: { planId: plan.id },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((p) => p.id))
  for (const range of ranges) {
    if (!existingIds.has(range.id)) throw new Error('Phase not found')
    clampPlanDay(range.startDay, plan.weekCount)
    clampPlanDay(range.endDay, plan.weekCount)
    if (range.endDay < range.startDay) {
      throw new Error('End day must be on or after start day')
    }
  }
  for (let i = 0; i < ranges.length; i++) {
    assertNoPlanPhaseOverlap({
      candidate: ranges[i]!,
      existing: ranges,
      excludeId: ranges[i]!.id,
    })
  }

  await prisma.$transaction(
    ranges.map((range) =>
      prisma.trainingPlanPhase.update({
        where: { id: range.id },
        data: { startDay: range.startDay, endDay: range.endDay },
      }),
    ),
  )
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${plan.id}`)
}

export async function resizeTrainingPlanPhaseEdge(args: {
  planId: string
  phaseId: string
  edge: 'start' | 'end'
  toDay: number
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  const phases = await prisma.trainingPlanPhase.findMany({
    where: { planId: plan.id },
    select: { id: true, startDay: true, endDay: true },
  })
  const next = resizePlanPhaseInGaps({
    phases,
    phaseId: args.phaseId,
    edge: args.edge,
    toDay: args.toDay,
    dayCount: planDayCount(plan.weekCount),
  })
  await applyPhaseRangesForCoach(session.userId, plan.id, next)
}

export async function moveTrainingPlanPhase(args: {
  planId: string
  phaseId: string
  deltaDays: number
}) {
  const session = await requireCoachSession()
  const plan = await requireOwnedPlan(session.userId, args.planId)
  const phases = await prisma.trainingPlanPhase.findMany({
    where: { planId: plan.id },
    select: { id: true, startDay: true, endDay: true },
  })
  const next = shiftPlanPhaseInGaps({
    phases,
    phaseId: args.phaseId,
    deltaDays: args.deltaDays,
    dayCount: planDayCount(plan.weekCount),
  })
  await applyPhaseRangesForCoach(session.userId, plan.id, next)
}

export async function deleteTrainingPlanPhase(phaseId: string) {
  const session = await requireCoachSession()
  const existing = await prisma.trainingPlanPhase.findFirst({
    where: { id: phaseId, plan: { coachId: session.userId } },
    select: { id: true, planId: true },
  })
  if (!existing) throw new Error('Phase not found')
  await prisma.trainingPlanPhase.delete({ where: { id: existing.id } })
  await prisma.trainingPlan.update({
    where: { id: existing.planId },
    data: { updatedAt: new Date() },
  })
  revalidatePath(`/workouts/plans/${existing.planId}`)
}
