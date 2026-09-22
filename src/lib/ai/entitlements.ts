import {
  AiUsageKind,
  MembershipStatus,
  type SubscriptionPlan,
  type UserMembership,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'

export class AiPaywallError extends Error {
  readonly code = 'AI_PAYWALL' as const
  constructor(
    message: string,
    public readonly reason:
      | 'no_membership'
      | 'inactive'
      | 'quota_exhausted'
      | 'skill_locked'
      | 'weeks_exceeded',
  ) {
    super(message)
    this.name = 'AiPaywallError'
  }
}

const ACTIVE_STATUSES: MembershipStatus[] = [
  MembershipStatus.ACTIVE,
  MembershipStatus.TRIALING,
]

export type MembershipWithPlan = UserMembership & {
  plan: SubscriptionPlan
}

export type AiQuotaSnapshot = {
  membership: MembershipWithPlan | null
  draftsUsed: number
  adaptsUsed: number
  draftsLimit: number
  adaptsLimit: number
  draftsRemaining: number
  adaptsRemaining: number
  maxPlanWeeks: number
  enabledSkillSlugs: string[]
  periodStart: Date | null
  periodEnd: Date | null
}

export async function getActiveMembership(
  userId: string,
  at: Date = new Date(),
): Promise<MembershipWithPlan | null> {
  return prisma.userMembership.findFirst({
    where: {
      userId,
      status: { in: ACTIVE_STATUSES },
      currentPeriodStart: { lte: at },
      currentPeriodEnd: { gt: at },
      plan: { isActive: true },
    },
    include: { plan: true },
    orderBy: { currentPeriodEnd: 'desc' },
  })
}

async function countUsageInPeriod(
  userId: string,
  kind: AiUsageKind,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  return prisma.aiUsageEvent.count({
    where: {
      userId,
      kind,
      createdAt: { gte: periodStart, lt: periodEnd },
    },
  })
}

export async function getAiQuotaSnapshot(
  userId: string,
  at: Date = new Date(),
): Promise<AiQuotaSnapshot> {
  const membership = await getActiveMembership(userId, at)
  if (!membership) {
    return {
      membership: null,
      draftsUsed: 0,
      adaptsUsed: 0,
      draftsLimit: 0,
      adaptsLimit: 0,
      draftsRemaining: 0,
      adaptsRemaining: 0,
      maxPlanWeeks: 0,
      enabledSkillSlugs: [],
      periodStart: null,
      periodEnd: null,
    }
  }

  const [draftsUsed, adaptsUsed] = await Promise.all([
    countUsageInPeriod(
      userId,
      AiUsageKind.DRAFT,
      membership.currentPeriodStart,
      membership.currentPeriodEnd,
    ),
    countUsageInPeriod(
      userId,
      AiUsageKind.ADAPT,
      membership.currentPeriodStart,
      membership.currentPeriodEnd,
    ),
  ])

  const draftsLimit = membership.plan.aiDraftsPerMonth
  const adaptsLimit = membership.plan.aiAdaptsPerMonth

  return {
    membership,
    draftsUsed,
    adaptsUsed,
    draftsLimit,
    adaptsLimit,
    draftsRemaining: Math.max(0, draftsLimit - draftsUsed),
    adaptsRemaining: Math.max(0, adaptsLimit - adaptsUsed),
    maxPlanWeeks: membership.plan.maxPlanWeeks,
    enabledSkillSlugs: membership.plan.enabledSkillSlugs,
    periodStart: membership.currentPeriodStart,
    periodEnd: membership.currentPeriodEnd,
  }
}

export type AssertAiEntitlementArgs = {
  userId: string
  skillSlug: string
  kind: AiUsageKind
  weekCount?: number
}

/** Throws AiPaywallError when the user cannot run this AI skill. */
export async function assertAiEntitlement(
  args: AssertAiEntitlementArgs,
): Promise<AiQuotaSnapshot> {
  const quota = await getAiQuotaSnapshot(args.userId)
  if (!quota.membership) {
    throw new AiPaywallError(
      'An active AI membership is required to use this skill.',
      'no_membership',
    )
  }
  if (!quota.enabledSkillSlugs.includes(args.skillSlug)) {
    throw new AiPaywallError(
      'This skill is not included in your current plan.',
      'skill_locked',
    )
  }
  if (
    args.weekCount != null &&
    Number.isFinite(args.weekCount) &&
    args.weekCount > quota.maxPlanWeeks
  ) {
    throw new AiPaywallError(
      `Your plan allows plans up to ${quota.maxPlanWeeks} weeks.`,
      'weeks_exceeded',
    )
  }

  const remaining =
    args.kind === AiUsageKind.DRAFT
      ? quota.draftsRemaining
      : quota.adaptsRemaining
  if (remaining <= 0) {
    throw new AiPaywallError(
      args.kind === AiUsageKind.DRAFT
        ? 'You have used all AI drafts for this billing period.'
        : 'You have used all AI adapts for this billing period.',
      'quota_exhausted',
    )
  }

  return quota
}

export async function logAiUsageEvent(args: {
  userId: string
  skillSlug: string
  kind: AiUsageKind
  tokensIn?: number | null
  tokensOut?: number | null
  athleteId?: string | null
  planId?: string | null
}) {
  return prisma.aiUsageEvent.create({
    data: {
      userId: args.userId,
      skillSlug: args.skillSlug,
      kind: args.kind,
      tokensIn: args.tokensIn ?? null,
      tokensOut: args.tokensOut ?? null,
      athleteId: args.athleteId ?? null,
      planId: args.planId ?? null,
    },
  })
}
