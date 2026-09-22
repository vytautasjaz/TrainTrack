import {
  Prisma,
  SessionType,
  type SeasonPhase,
  type WorkoutType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PlanDraftOutput } from '@/lib/ai/skills/types'

/** Persist an AI draft as TrainingPlan + sessions + phases (relative indices). */
export async function materializePlanDraft(args: {
  coachUserId: string
  forAthleteId: string | null
  draft: PlanDraftOutput
  skillSlug: string
}): Promise<{ planId: string }> {
  const draft = args.draft
  const weekCount = Math.min(52, Math.max(1, Math.floor(draft.weekCount)))
  const guidelines = draft.guidelines?.trim()
  const descriptionParts = [
    draft.description?.trim() || null,
    guidelines ? `Guidelines:\n${guidelines}` : null,
    `Drafted with AI skill “${args.skillSlug}”. Review before applying.`,
  ].filter(Boolean)

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingPlan.create({
      data: {
        coachId: args.coachUserId,
        title: draft.title.trim().slice(0, 120) || 'AI draft plan',
        description: descriptionParts.join('\n\n').slice(0, 4000) || null,
        sportFocus: draft.sportFocus ?? null,
        weekCount,
        level: draft.level ?? null,
        target: draft.target?.trim().slice(0, 80) || null,
        forAthleteId: args.forAthleteId,
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

    // Stable sortOrder within each slot
    const slotCounts = new Map<string, number>()
    const sessionRows: Prisma.TrainingPlanSessionCreateManyInput[] = []
    for (const s of sessions) {
      const key = `${s.weekIndex}:${s.dayOfWeek}`
      const sortOrder = slotCounts.get(key) ?? 0
      slotCounts.set(key, sortOrder + 1)
      sessionRows.push({
        planId: created.id,
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        sortOrder,
        type: s.type as WorkoutType,
        sessionType: (s.sessionType ?? SessionType.CUSTOM) as SessionType,
        title: s.title.trim().slice(0, 120) || 'Workout',
        description: s.description?.trim()?.slice(0, 2000) || null,
        plannedDistance: s.plannedDistance ?? null,
        plannedDuration: s.plannedDuration ?? null,
        coachNotes: s.coachNotes?.trim()?.slice(0, 2000) || null,
        tags: (s.tags ?? []).slice(0, 8),
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
