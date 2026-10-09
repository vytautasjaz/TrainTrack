import {
  PlannedMetricSource,
  Prisma,
  SessionType,
  type SeasonPhase,
  type WorkoutType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PlanDraftWithStructure } from '@/lib/ai/skills/types'
import type { CoachEngineAuditRecord } from '@/lib/coach-engine/types'
import { listSeedWorkoutLibrary } from '@/lib/coach-engine/library'
import {
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import type { WorkoutStructure } from '@/lib/workout-builder/types'

/** Persist an AI draft as TrainingPlan + sessions + phases (relative indices). */
export async function materializePlanDraft(args: {
  coachUserId: string
  forAthleteId: string | null
  draft: PlanDraftWithStructure
  skillSlug: string
  /** Coach-engine audit snapshot (inputs, versions, constraints, validation). */
  coachEngineAudit?: CoachEngineAuditRecord | null
}): Promise<{ planId: string }> {
  const draft = args.draft
  const weekCount = Math.min(52, Math.max(1, Math.floor(draft.weekCount)))
  const guidelines = draft.guidelines?.trim()
  const descriptionParts = [
    draft.description?.trim() || null,
    guidelines ? `Guidelines:\n${guidelines}` : null,
    `Drafted with AI skill “${args.skillSlug}”. Review before applying.`,
  ].filter(Boolean)

  const candidateIds = [
    ...new Set(
      draft.sessions
        .map((s) => s.candidateId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const libraryRows =
    candidateIds.length > 0
      ? await prisma.coachEngineWorkout.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, structure: true, swimStructure: true },
        })
      : []
  const libraryById = new Map(libraryRows.map((r) => [r.id, r]))
  // Fallback to code seed if a candidate is missing from DB or has empty structure.
  const seedById = new Map(
    listSeedWorkoutLibrary().map((w) => [w.id, w] as const),
  )

  function hasJsonContent(value: unknown): boolean {
    if (value == null) return false
    if (typeof value !== 'object') return false
    const o = value as { warmup?: unknown[]; mainSet?: unknown[]; cooldown?: unknown[] }
    return Boolean(
      (o.warmup && o.warmup.length) ||
        (o.mainSet && o.mainSet.length) ||
        (o.cooldown && o.cooldown.length),
    )
  }

  function resolveStructures(s: PlanDraftWithStructure['sessions'][number]): {
    structure?: Prisma.InputJsonValue
    swimStructure?: Prisma.InputJsonValue
  } {
    // Prefer adapted structure already attached by coach-engine.
    if (hasJsonContent(s.structure)) {
      return {
        structure: s.structure as Prisma.InputJsonValue,
        swimStructure: hasJsonContent(s.swimStructure)
          ? (s.swimStructure as Prisma.InputJsonValue)
          : undefined,
      }
    }
    const id = s.candidateId?.trim()
    if (!id) return {}
    const db = libraryById.get(id)
    if (db?.structure) {
      return {
        structure: db.structure as Prisma.InputJsonValue,
        swimStructure: (db.swimStructure as Prisma.InputJsonValue) ?? undefined,
      }
    }
    const seed = seedById.get(id)
    if (seed?.structure) {
      return {
        structure: seed.structure as Prisma.InputJsonValue,
        swimStructure: (seed.swimStructure as Prisma.InputJsonValue) ?? undefined,
      }
    }
    return {}
  }

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingPlan.create({
      data: {
        coachId: args.coachUserId,
        title: draft.title.trim().slice(0, 120) || 'AI draft plan',
        description: descriptionParts.join('\n\n').slice(0, 16000) || null,
        sportFocus: draft.sportFocus ?? null,
        weekCount,
        level: draft.level ?? null,
        target: draft.target?.trim().slice(0, 80) || null,
        forAthleteId: args.forAthleteId,
        coachEngineAudit: args.coachEngineAudit
          ? (args.coachEngineAudit as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true },
    })

    const sessions = draft.sessions
      .filter(
        (s) =>
          s.weekIndex >= 0 &&
          s.weekIndex < weekCount &&
          s.dayOfWeek >= 0 &&
          s.dayOfWeek <= 6,
      )
      .slice(0, 400)

    const slotCounts = new Map<string, number>()
    const sessionRows: Prisma.TrainingPlanSessionCreateManyInput[] = []
    for (const s of sessions) {
      const key = `${s.weekIndex}:${s.dayOfWeek}`
      const sortOrder = slotCounts.get(key) ?? 0
      slotCounts.set(key, sortOrder + 1)
      const structures = resolveStructures(s)
      const structureObj = structures.structure as WorkoutStructure | undefined
      let plannedDistance = s.plannedDistance ?? null
      let plannedDuration = s.plannedDuration ?? null
      let distanceSource: PlannedMetricSource | null = null
      let durationSource: PlannedMetricSource | null = null
      const isRaceDay = (s.tags ?? []).some((t) => /race-day/i.test(t))
      if (isRaceDay && plannedDistance != null && plannedDistance > 0) {
        // Official race distance only (e.g. 21.1) — do not sum WU/CD from structure.
        distanceSource = PlannedMetricSource.MANUAL
        if (plannedDuration != null && plannedDuration > 0) {
          durationSource = PlannedMetricSource.MANUAL
        }
      } else if (structureObj && hasJsonContent(structureObj)) {
        const estDist = estimateStructureDistanceKm(
          structureObj,
          null,
          s.type as WorkoutType,
        )
        const estDur = estimateStructureDurationMinutes(
          structureObj,
          null,
          s.type as WorkoutType,
        )
        // Structure is source of truth — never persist a conflicting "Manual" total.
        if (estDist != null && estDist > 0) {
          plannedDistance = estDist
          distanceSource = PlannedMetricSource.STRUCTURE
        }
        if (estDur > 0) {
          plannedDuration = estDur
          durationSource = PlannedMetricSource.STRUCTURE
        }
      } else {
        if (plannedDistance != null && plannedDistance > 0) {
          distanceSource = PlannedMetricSource.MANUAL
        }
        if (plannedDuration != null && plannedDuration > 0) {
          durationSource = PlannedMetricSource.MANUAL
        }
      }
      sessionRows.push({
        planId: created.id,
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        sortOrder,
        type: s.type as WorkoutType,
        sessionType: (s.sessionType ?? SessionType.CUSTOM) as SessionType,
        title: s.title.trim().slice(0, 120) || 'Workout',
        description: s.description?.trim()?.slice(0, 2000) || null,
        plannedDistance,
        plannedDuration,
        plannedDistanceSource: distanceSource,
        plannedDurationSource: durationSource,
        coachNotes: s.coachNotes?.trim()?.slice(0, 2000) || null,
        tags: (s.tags ?? []).slice(0, 8),
        structure: structures.structure,
        swimStructure: structures.swimStructure,
      })
    }
    if (sessionRows.length) {
      await tx.trainingPlanSession.createMany({ data: sessionRows })
    }

    const maxDay = weekCount * 7 - 1
    const phases = (draft.phases ?? [])
      .filter((p) => p.startDay <= p.endDay && p.startDay <= maxDay)
      .slice(0, 20)
      .map((p) => ({
        planId: created.id,
        phase: p.phase as SeasonPhase,
        sport: p.sport as WorkoutType,
        label: p.label?.trim()?.slice(0, 80) || null,
        startDay: Math.max(0, p.startDay),
        endDay: Math.min(maxDay, p.endDay),
      }))
    if (phases.length) {
      await tx.trainingPlanPhase.createMany({ data: phases })
    }

    return created
  })

  return { planId: plan.id }
}
