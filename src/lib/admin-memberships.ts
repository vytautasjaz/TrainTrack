import { MembershipStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AdminPlanRow = {
  id: string
  slug: string
  name: string
  description: string | null
  priceCents: number
  interval: string
  aiDraftsPerMonth: number
  aiAdaptsPerMonth: number
  maxPlanWeeks: number
  enabledSkillSlugs: string[]
  isActive: boolean
  sortOrder: number
  memberCount: number
}

export type AdminMembershipRow = {
  id: string
  status: MembershipStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  user: { id: string; name: string; email: string }
  plan: { id: string; slug: string; name: string }
}

export async function listSubscriptionPlans(): Promise<AdminPlanRow[]> {
  const rows = await prisma.subscriptionPlan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { memberships: true } } },
  })
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    interval: p.interval,
    aiDraftsPerMonth: p.aiDraftsPerMonth,
    aiAdaptsPerMonth: p.aiAdaptsPerMonth,
    maxPlanWeeks: p.maxPlanWeeks,
    enabledSkillSlugs: p.enabledSkillSlugs,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    memberCount: p._count.memberships,
  }))
}

export async function listRecentMemberships(
  limit = 40,
): Promise<AdminMembershipRow[]> {
  const rows = await prisma.userMembership.findMany({
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, slug: true, name: true } },
    },
  })
  return rows.map((m) => ({
    id: m.id,
    status: m.status,
    currentPeriodStart: m.currentPeriodStart,
    currentPeriodEnd: m.currentPeriodEnd,
    user: m.user,
    plan: m.plan,
  }))
}

export async function getUserActiveMembershipSummary(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { planName: string; status: MembershipStatus }>()
  const now = new Date()
  const rows = await prisma.userMembership.findMany({
    where: {
      userId: { in: userIds },
      status: {
        in: [MembershipStatus.ACTIVE, MembershipStatus.TRIALING],
      },
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
    },
    include: { plan: { select: { name: true } } },
    orderBy: { currentPeriodEnd: 'desc' },
  })
  const map = new Map<string, { planName: string; status: MembershipStatus }>()
  for (const row of rows) {
    if (!map.has(row.userId)) {
      map.set(row.userId, { planName: row.plan.name, status: row.status })
    }
  }
  return map
}

export type { Prisma }
