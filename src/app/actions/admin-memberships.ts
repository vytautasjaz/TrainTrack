'use server'

import { revalidatePath } from 'next/cache'
import {
  MembershipStatus,
  type Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { addMonths } from 'date-fns'

function parseSkillSlugs(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function parseIntField(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.floor(n))
}

export async function adminUpsertSubscriptionPlan(input: {
  id?: string
  slug: string
  name: string
  description?: string | null
  priceCents?: number
  interval?: string
  aiDraftsPerMonth?: number
  aiAdaptsPerMonth?: number
  maxPlanWeeks?: number
  enabledSkillSlugs?: string[] | string
  isActive?: boolean
  sortOrder?: number
}) {
  await requireAdmin()
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-')
  const name = input.name.trim()
  if (!slug) throw new Error('Slug is required')
  if (!name) throw new Error('Name is required')

  const data = {
    slug,
    name,
    description: input.description?.trim() || null,
    priceCents: parseIntField(input.priceCents, 0),
    interval: (input.interval?.trim() || 'month').toLowerCase(),
    aiDraftsPerMonth: parseIntField(input.aiDraftsPerMonth, 0),
    aiAdaptsPerMonth: parseIntField(input.aiAdaptsPerMonth, 0),
    maxPlanWeeks: Math.max(1, parseIntField(input.maxPlanWeeks, 16)),
    enabledSkillSlugs: parseSkillSlugs(input.enabledSkillSlugs),
    isActive: input.isActive !== false,
    sortOrder: parseIntField(input.sortOrder, 0),
  }

  if (input.id) {
    await prisma.subscriptionPlan.update({
      where: { id: input.id },
      data,
    })
  } else {
    await prisma.subscriptionPlan.create({ data })
  }

  revalidatePath('/admin/memberships')
  revalidatePath('/admin')
}

export async function adminDeleteSubscriptionPlan(planId: string) {
  await requireAdmin()
  const members = await prisma.userMembership.count({ where: { planId } })
  if (members > 0) {
    throw new Error('Cannot delete a plan that still has memberships')
  }
  await prisma.subscriptionPlan.delete({ where: { id: planId } })
  revalidatePath('/admin/memberships')
}

export async function adminAssignUserMembership(input: {
  userId: string
  planId: string
  status?: MembershipStatus
  /** Months from now for period end; default 1. */
  periodMonths?: number
  currentPeriodStart?: Date | string | null
  currentPeriodEnd?: Date | string | null
}) {
  await requireAdmin()
  // Membership grants allowed on any user (including self) for beta.
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  })
  if (!target) throw new Error('User not found')

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: input.planId },
    select: { id: true, isActive: true },
  })
  if (!plan) throw new Error('Plan not found')

  const now = new Date()
  const start = input.currentPeriodStart
    ? new Date(input.currentPeriodStart)
    : now
  const end = input.currentPeriodEnd
    ? new Date(input.currentPeriodEnd)
    : addMonths(start, Math.max(1, input.periodMonths ?? 1))

  if (!(start < end)) {
    throw new Error('Period end must be after period start')
  }

  const status = input.status ?? MembershipStatus.ACTIVE

  // Cancel overlapping active memberships so entitlement resolves cleanly.
  await prisma.userMembership.updateMany({
    where: {
      userId: input.userId,
      status: {
        in: [MembershipStatus.ACTIVE, MembershipStatus.TRIALING],
      },
    },
    data: { status: MembershipStatus.CANCELED },
  })

  await prisma.userMembership.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      status,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/memberships')
}

export async function adminUpdateUserMembership(input: {
  membershipId: string
  planId?: string
  status?: MembershipStatus
  currentPeriodStart?: Date | string
  currentPeriodEnd?: Date | string
}) {
  await requireAdmin()
  const existing = await prisma.userMembership.findUnique({
    where: { id: input.membershipId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new Error('Membership not found')

  const data: Prisma.UserMembershipUpdateInput = {}
  if (input.planId) {
    data.plan = { connect: { id: input.planId } }
  }
  if (input.status) data.status = input.status
  if (input.currentPeriodStart) {
    data.currentPeriodStart = new Date(input.currentPeriodStart)
  }
  if (input.currentPeriodEnd) {
    data.currentPeriodEnd = new Date(input.currentPeriodEnd)
  }

  await prisma.userMembership.update({
    where: { id: existing.id },
    data,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/memberships')
}

export async function adminCancelUserMembership(membershipId: string) {
  await requireAdmin()
  const existing = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new Error('Membership not found')

  await prisma.userMembership.update({
    where: { id: existing.id },
    data: { status: MembershipStatus.CANCELED },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/memberships')
}
