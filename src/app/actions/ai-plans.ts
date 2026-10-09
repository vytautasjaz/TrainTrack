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
import { requireSkill, listSkills } from '@/lib/ai/skills/registry'
import { materializePlanDraft } from '@/lib/ai/materialize-plan-draft'
import {
  CoachEngineValidationError,
  CoachEngineSafetyError,
  runCoachEngineDraft,
} from '@/lib/coach-engine'
import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState } from '@/lib/coach-engine/state'
import { adaptExistingTrainingPlan } from '@/lib/coach-engine/adapt-existing-plan'

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
  const { refreshSkillOverridesFromDb } = await import(
    '@/lib/ai/skills/skill-store'
  )
  await refreshSkillOverridesFromDb()
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

export type AiAthleteDraftContext = {
  athleteId: string
  name: string
  paces: {
    easy: number | null
    tempo: number | null
    threshold: number | null
    vo2: number | null
  }
  bikeFtpWatts: number | null
  swimCssSecPer100m: number | null
  hr: { max: number | null; resting: number | null }
  races: {
    name: string
    date: string
    type: string
    priority: string
    goal: string | null
  }[]
  recentVolumeKm: number
  recentSessionsPerWeek: number
  consistencyPct: number
  weekCountLookback: number
  sessionCountLookback: number
  dataGaps: string[]
  /** Last N weeks of completed running km (newest first). */
  weeklyKm: number[]
  recentLongestRunKm: number | null
  volumeTrendPct: number | null
  suggestedLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite'
}

function suggestLevelFromVolume(args: {
  weeklyKm: number
  sessionsPerWeek: number
  longestKm: number | null
}): AiAthleteDraftContext['suggestedLevel'] {
  const km = args.weeklyKm
  const long = args.longestKm ?? 0
  if (km >= 90 && long >= 28) return 'elite'
  if (km >= 65 || long >= 24) return 'advanced'
  if (km >= 35 || args.sessionsPerWeek >= 4) return 'intermediate'
  return 'beginner'
}

/** Load collected athlete snapshot for the pre-generate guide (editable in UI). */
export async function getAiAthleteDraftContext(
  athleteId: string,
): Promise<AiAthleteDraftContext> {
  const session = await requireSession()
  const id = await resolveDraftAthleteAccess({
    userId: session.userId,
    athleteId,
    isCoachUser: isCoach(session),
  })
  const data = await collectAthleteData(id)
  const state = buildAthleteState(data, 'intermediate')
  const dataGaps: string[] = []
  if (data.paces.easy == null) dataGaps.push('Easy pace')
  if (data.paces.threshold == null) dataGaps.push('Threshold pace')
  if (data.weekSummaries.length < 2) dataGaps.push('Recent training history')
  if (data.races.length === 0) dataGaps.push('Upcoming race')
  if (data.hr.max == null) dataGaps.push('Max HR')

  const weeklyKm = data.weekSummaries.slice(0, 8).map((w) => {
    const done = w.completedDistanceKm
    const planned = w.plannedDistanceKm
    return Math.round(done > 0 ? done : planned)
  })
  const recentLongestRunKm = (() => {
    let max = 0
    for (const s of data.recentSessions) {
      const km = s.actualDistanceKm ?? s.plannedDistanceKm ?? 0
      if (km > max) max = km
    }
    return max > 0 ? Math.round(max * 10) / 10 : null
  })()
  const volumeTrendPct = (() => {
    if (weeklyKm.length < 4) return null
    const recent = weeklyKm.slice(0, 3)
    const earlier = weeklyKm.slice(3, 6)
    const avg = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
    const a = avg(recent)
    const b = avg(earlier)
    if (b <= 0) return null
    return Math.round(((a - b) / b) * 100)
  })()
  const recentVolumeKm = state.recentVolume.runningKmPerWeek
  const recentSessionsPerWeek = state.recentVolume.sessionsPerWeek

  return {
    athleteId: data.athleteId,
    name: data.name,
    paces: data.paces,
    bikeFtpWatts: data.bikeFtpWatts,
    swimCssSecPer100m: data.swimCssSecPer100m,
    hr: data.hr,
    races: data.races.map((r) => ({
      name: r.name,
      date: r.date,
      type: r.type,
      priority: r.priority,
      goal: r.goal,
    })),
    recentVolumeKm,
    recentSessionsPerWeek,
    consistencyPct: Math.round(state.consistency * 100),
    weekCountLookback: data.weekSummaries.length,
    sessionCountLookback: data.recentSessions.length,
    dataGaps,
    weeklyKm,
    recentLongestRunKm,
    volumeTrendPct,
    suggestedLevel: suggestLevelFromVolume({
      weeklyKm: recentVolumeKm,
      sessionsPerWeek: recentSessionsPerWeek,
      longestKm: recentLongestRunKm,
    }),
  }
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
  | {
      ok: true
      planId: string
      decisionTrace: import('@/lib/coach-engine/decision-trace').CoachEngineDecisionTrace
    }
  | {
      ok: false
      error: string
      paywall?: boolean
      reason?: string
      /** Generation refused to save — week still invalid after repair. */
      requiresReview?: boolean
      weekIndex?: number | null
      validationErrors?: import('@/lib/coach-engine/types').ValidationError[]
      /** Safety intake blocked generation before planning. */
      safetyBlocked?: boolean
      safetyFlags?: import('@/lib/coach-engine/types').SafetyFlag[]
      safetyConstraints?: import('@/lib/coach-engine/types').SafetyPlanningConstraint[]
    }

export async function draftAiTrainingPlan(input: {
  skillSlug: string
  /**
   * Real athlete, or omit / empty for a general library plan built from
   * brief-entered athlete data only.
   */
  athleteId?: string | null
  brief: Record<string, unknown>
  /** Optional coach override for methodology selection. */
  lockedModel?: import('@/lib/coach-engine/types').TrainingModelId | null
}): Promise<DraftAiPlanResult> {
  try {
    const session = await requireSession()
    const { refreshSkillOverridesFromDb } = await import(
      '@/lib/ai/skills/skill-store'
    )
    await refreshSkillOverridesFromDb()
    const skill = requireSkill(input.skillSlug)
    if (skill.kind !== 'draft') {
      return { ok: false, error: 'This skill is not a draft skill.' }
    }

    const requestedAthleteId = input.athleteId?.trim() || null
    const athleteId = requestedAthleteId
      ? await resolveDraftAthleteAccess({
          userId: session.userId,
          athleteId: requestedAthleteId,
          isCoachUser: isCoach(session),
        })
      : null

    const profileName =
      typeof input.brief.athleteName === 'string'
        ? input.brief.athleteName.trim()
        : ''
    const brief = skill.briefSchema.parse(input.brief) as Record<
      string,
      unknown
    >
    if (profileName) brief.athleteName = profileName
    const weekCount =
      typeof brief.weekCount === 'number' ? brief.weekCount : undefined

    await assertAiEntitlement({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.DRAFT,
      weekCount,
    })

    // Deterministic coach engine builds state → gaps → methodology → dose;
    // AI only adapts candidate workouts (with validation + library fallback).
    const engine = await runCoachEngineDraft({
      athleteId,
      skillSlug: skill.slug,
      brief,
      allowAi: true,
      lockedModel: input.lockedModel,
    })

    const draft = engine.draft
    if (weekCount && draft.weekCount !== weekCount) {
      draft.weekCount = weekCount
      draft.sessions = draft.sessions.filter((s) => s.weekIndex < weekCount)
    }

    const { planId } = await materializePlanDraft({
      coachUserId: session.userId,
      forAthleteId: athleteId,
      draft,
      skillSlug: skill.slug,
      coachEngineAudit: engine.audit,
    })

    await logAiUsageEvent({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.DRAFT,
      tokensIn: engine.tokensIn,
      tokensOut: engine.tokensOut,
      athleteId,
      planId,
    })

    revalidatePath('/workouts/plans')
    revalidatePath(`/workouts/plans/${planId}`)
    return { ok: true, planId, decisionTrace: engine.decisionTrace }
  } catch (err) {
    if (err instanceof AiPaywallError) {
      return {
        ok: false,
        error: err.message,
        paywall: true,
        reason: err.reason,
      }
    }
    if (err instanceof CoachEngineValidationError) {
      return {
        ok: false,
        error: err.message,
        requiresReview: true,
        weekIndex: err.weekIndex,
        validationErrors: err.errors,
      }
    }
    if (err instanceof CoachEngineSafetyError) {
      return {
        ok: false,
        error: err.message,
        requiresReview: true,
        safetyBlocked: true,
        safetyFlags: err.gate.flags,
        safetyConstraints: err.gate.constraints,
      }
    }
    const message = err instanceof Error ? err.message : 'Draft failed'
    return { ok: false, error: message }
  }
}

export type AdaptAiPlanResult =
  | { ok: true; summary: string; editsApplied: number; planId: string }
  | {
      ok: false
      error: string
      paywall?: boolean
      reason?: string
      safetyBlocked?: boolean
    }

/** Adapt an owned plan via coach-engine (deterministic; no free-form plan rewrite). */
export async function adaptAiTrainingPlan(input: {
  skillSlug?: string
  planId: string
  athleteId: string
  brief: Record<string, unknown>
  lockedModel?: import('@/lib/coach-engine/types').TrainingModelId | null
}): Promise<AdaptAiPlanResult> {
  try {
    const session = await requireSession()
    const { refreshSkillOverridesFromDb } = await import(
      '@/lib/ai/skills/skill-store'
    )
    await refreshSkillOverridesFromDb()
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
      select: { id: true },
    })
    if (!plan) throw new Error('Plan not found')

    const brief = skill.briefSchema.parse(input.brief) as Record<
      string,
      unknown
    >

    await assertAiEntitlement({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.ADAPT,
    })

    const result = await adaptExistingTrainingPlan({
      planId: plan.id,
      athleteId,
      brief,
      lockedModel: input.lockedModel,
    })

    await logAiUsageEvent({
      userId: session.userId,
      skillSlug: skill.slug,
      kind: AiUsageKind.ADAPT,
      tokensIn: null,
      tokensOut: null,
      athleteId,
      planId: plan.id,
    })

    revalidatePath(`/workouts/plans/${plan.id}`)
    return {
      ok: true,
      summary: result.summary,
      editsApplied: result.editsApplied,
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
    if (err instanceof CoachEngineSafetyError) {
      return {
        ok: false,
        error: err.message,
        safetyBlocked: true,
      }
    }
    const message = err instanceof Error ? err.message : 'Adapt failed'
    return { ok: false, error: message }
  }
}
