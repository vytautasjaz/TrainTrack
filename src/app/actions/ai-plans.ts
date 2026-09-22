'use server'

import { revalidatePath } from 'next/cache'
import { AiUsageKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  isCoach,
  requireCoachOwnsAthlete,
} from '@/lib/session'
import {
  AiPaywallError,
  assertAiEntitlement,
  getAiQuotaSnapshot,
  logAiUsageEvent,
} from '@/lib/ai/entitlements'
import { generateStructuredObject } from '@/lib/ai/openai'
import { requireSkill, listSkills } from '@/lib/ai/skills/registry'
import { buildAthleteContextPack } from '@/lib/ai/skills/context'
import {
  adaptPlanOutputSchema,
  briefValuesToPrompt,
  planDraftOutputSchema,
  type AdaptPlanOutput,
} from '@/lib/ai/skills/types'
import { materializePlanDraft } from '@/lib/ai/materialize-plan-draft'

export type AiSkillListItem = {
  slug: string
  title: string
  description: string
  audience: string
  kind: 'draft' | 'adapt'
  briefFields: {
    key: string
    label: string
    kind: 'text' | 'textarea' | 'number' | 'select'
    required?: boolean
    placeholder?: string
    options?: { value: string; label: string }[]
    min?: number
    max?: number
    defaultValue?: string | number
  }[]
  unlocked: boolean
}

export async function getAiSkillsForUser(opts?: {
  audience?: 'coach' | 'athlete'
}): Promise<{
  skills: AiSkillListItem[]
  quota: Awaited<ReturnType<typeof getAiQuotaSnapshot>>
}> {
  const session = await requireSession()
  const quota = await getAiQuotaSnapshot(session.userId)
  const audience = opts?.audience ?? (isCoach(session) ? 'coach' : 'athlete')
  const skills = listSkills({ audience }).map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    audience: s.audience,
    kind: s.kind,
    briefFields: s.briefFields,
    unlocked: quota.enabledSkillSlugs.includes(s.slug),
  }))
  return { skills, quota }
}

export async function getMyAiQuota() {
  const session = await requireSession()
  return getAiQuotaSnapshot(session.userId)
}

async function resolveDraftAthleteAccess(args: {
  userId: string
  athleteId: string
  isCoachUser: boolean
}) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: args.athleteId },
    select: { id: true, userId: true },
  })
  if (!athlete) throw new Error('Athlete not found')

  if (athlete.userId === args.userId) return athlete.id
  if (args.isCoachUser) {
    await requireCoachOwnsAthlete(args.userId, athlete.id)
    return athlete.id
  }
  throw new Error('You do not have access to this athlete')
}

export type DraftAiPlanResult =
  | { ok: true; planId: string }
  | {
      ok: false
      error: string
      paywall?: boolean
      reason?: string
    }

export async function draftAiTrainingPlan(input: {
  skillSlug: string
  athleteId: string
  brief: Record<string, unknown>
}): Promise<DraftAiPlanResult> {
  try {
    const session = await requireSession()
    const skill = requireSkill(input.skillSlug)
    if (skill.kind !== 'draft') {
      return { ok: false, error: 'This skill is not a draft skill.' }
    }

    const athleteId = await resolveDraftAthleteAccess({
      userId: session.userId,
      athleteId: input.athleteId,
      isCoachUser: isCoach(session),
    })

    const brief = skill.briefSchema.parse(input.brief) as Record<
      string,
      unknown
    >
    const weekCount =
      typeof brief.weekCount === 'number' ? brief.weekCount : undefined

    await assertAiEntitlement({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.DRAFT,
      weekCount,
    })

    const context = await buildAthleteContextPack(athleteId)
    const prompt = [
      'Athlete context:',
      context.textSummary,
      '',
      'User brief:',
      briefValuesToPrompt(brief),
      '',
      'Produce a complete relative training plan matching the schema.',
    ].join('\n')

    const { object, tokensIn, tokensOut } = await generateStructuredObject({
      system: skill.systemPrompt,
      prompt,
      schema: planDraftOutputSchema,
    })

    // Clamp weeks to brief / entitlement
    if (weekCount && object.weekCount !== weekCount) {
      object.weekCount = weekCount
      object.sessions = object.sessions.filter((s) => s.weekIndex < weekCount)
    }

    const { planId } = await materializePlanDraft({
      coachUserId: session.userId,
      forAthleteId: athleteId,
      draft: object,
      skillSlug: skill.slug,
    })

    await logAiUsageEvent({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.DRAFT,
      tokensIn,
      tokensOut,
      athleteId,
      planId,
    })

    revalidatePath('/workouts/plans')
    revalidatePath(`/workouts/plans/${planId}`)
    return { ok: true, planId }
  } catch (err) {
    if (err instanceof AiPaywallError) {
      return {
        ok: false,
        error: err.message,
        paywall: true,
        reason: err.reason,
      }
    }
    const message = err instanceof Error ? err.message : 'Draft failed'
    return { ok: false, error: message }
  }
}

export type AdaptAiPlanResult =
  | { ok: true; summary: string; editsApplied: number; planId: string }
  | { ok: false; error: string; paywall?: boolean; reason?: string }

/** Phase 2: propose + apply session edits onto an owned plan. */
export async function adaptAiTrainingPlan(input: {
  skillSlug?: string
  planId: string
  athleteId: string
  brief: Record<string, unknown>
}): Promise<AdaptAiPlanResult> {
  try {
    const session = await requireSession()
    const skill = requireSkill(input.skillSlug ?? 'adapt-plan')
    if (skill.kind !== 'adapt') {
      return { ok: false, error: 'This skill is not an adapt skill.' }
    }

    const athleteId = await resolveDraftAthleteAccess({
      userId: session.userId,
      athleteId: input.athleteId,
      isCoachUser: isCoach(session),
    })

    const plan = await prisma.trainingPlan.findFirst({
      where: { id: input.planId, coachId: session.userId },
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
    if (!plan) throw new Error('Plan not found')

    const brief = skill.briefSchema.parse(input.brief) as Record<
      string,
      unknown
    >
    const lookbackWeeks =
      typeof brief.lookbackWeeks === 'number' ? brief.lookbackWeeks : 2

    await assertAiEntitlement({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.ADAPT,
    })

    const context = await buildAthleteContextPack(athleteId, {
      lookbackWeeks: Math.max(4, lookbackWeeks + 2),
    })

    const planSnapshot = {
      title: plan.title,
      weekCount: plan.weekCount,
      sessions: plan.sessions.map((s) => ({
        id: s.id,
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        sessionType: s.sessionType,
        title: s.title,
        description: s.description,
        plannedDistance: s.plannedDistance,
        plannedDuration: s.plannedDuration,
      })),
    }

    const prompt = [
      'Athlete context:',
      context.textSummary,
      '',
      'Current plan:',
      JSON.stringify(planSnapshot),
      '',
      'Adaptation brief:',
      briefValuesToPrompt(brief),
      '',
      'Propose sessionEdits to improve the plan.',
    ].join('\n')

    const { object, tokensIn, tokensOut } =
      await generateStructuredObject<typeof adaptPlanOutputSchema>({
        system: skill.systemPrompt,
        prompt,
        schema: adaptPlanOutputSchema,
      })

    const editsApplied = await applyAdaptEdits(plan.id, plan.weekCount, object)

    await logAiUsageEvent({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.ADAPT,
      tokensIn,
      tokensOut,
      athleteId,
      planId: plan.id,
    })

    revalidatePath(`/workouts/plans/${plan.id}`)
    return {
      ok: true,
      summary: object.summary,
      editsApplied,
      planId: plan.id,
    }
  } catch (err) {
    if (err instanceof AiPaywallError) {
      return {
        ok: false,
        error: err.message,
        paywall: true,
        reason: err.reason,
      }
    }
    const message = err instanceof Error ? err.message : 'Adapt failed'
    return { ok: false, error: message }
  }
}

async function applyAdaptEdits(
  planId: string,
  weekCount: number,
  adapt: AdaptPlanOutput,
): Promise<number> {
  let applied = 0
  for (const edit of adapt.sessionEdits) {
    if (
      edit.weekIndex < 0 ||
      edit.weekIndex >= weekCount ||
      edit.dayOfWeek < 0 ||
      edit.dayOfWeek > 6
    ) {
      continue
    }

    if (edit.action === 'add') {
      if (!edit.title || !edit.type) continue
      const maxSort = await prisma.trainingPlanSession.aggregate({
        where: {
          planId,
          weekIndex: edit.weekIndex,
          dayOfWeek: edit.dayOfWeek,
        },
        _max: { sortOrder: true },
      })
      await prisma.trainingPlanSession.create({
        data: {
          planId,
          weekIndex: edit.weekIndex,
          dayOfWeek: edit.dayOfWeek,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          type: edit.type,
          sessionType: edit.sessionType ?? 'CUSTOM',
          title: edit.title.slice(0, 120),
          description: edit.description ?? null,
          plannedDistance: edit.plannedDistance ?? null,
          plannedDuration: edit.plannedDuration ?? null,
          coachNotes: edit.coachNotes ?? null,
        },
      })
      applied += 1
      continue
    }

    const candidates = await prisma.trainingPlanSession.findMany({
      where: {
        planId,
        weekIndex: edit.weekIndex,
        dayOfWeek: edit.dayOfWeek,
        ...(edit.matchTitle
          ? { title: { equals: edit.matchTitle, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    })
    const target = candidates[0]
    if (!target) continue

    if (edit.action === 'remove') {
      await prisma.trainingPlanSession.delete({ where: { id: target.id } })
      applied += 1
      continue
    }

    await prisma.trainingPlanSession.update({
      where: { id: target.id },
      data: {
        ...(edit.type ? { type: edit.type } : {}),
        ...(edit.sessionType ? { sessionType: edit.sessionType } : {}),
        ...(edit.title ? { title: edit.title.slice(0, 120) } : {}),
        ...(edit.description !== undefined
          ? { description: edit.description }
          : {}),
        ...(edit.plannedDistance !== undefined
          ? { plannedDistance: edit.plannedDistance }
          : {}),
        ...(edit.plannedDuration !== undefined
          ? { plannedDuration: edit.plannedDuration }
          : {}),
        ...(edit.coachNotes !== undefined
          ? { coachNotes: edit.coachNotes }
          : {}),
      },
    })
    applied += 1
  }

  if (adapt.guidelines?.trim()) {
    const existing = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: { description: true },
    })
    const note = `Adapt notes:\n${adapt.guidelines.trim()}`
    await prisma.trainingPlan.update({
      where: { id: planId },
      data: {
        description: existing?.description
          ? `${existing.description}\n\n${note}`.slice(0, 4000)
          : note.slice(0, 4000),
        updatedAt: new Date(),
      },
    })
  } else {
    await prisma.trainingPlan.update({
      where: { id: planId },
      data: { updatedAt: new Date() },
    })
  }

  return applied
}
