import { UserRole, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin, type SessionContext } from '@/lib/session'

export type AdminUserRow = {
  id: string
  name: string
  email: string
  roles: UserRole[]
  disabledAt: Date | null
  disabledReason: string | null
  createdAt: Date
  hasAthlete: boolean
  hasCoach: boolean
}

export const ADMIN_USER_SORT_FIELDS = [
  'name',
  'email',
  'created',
  'status',
] as const

export type AdminUserSortField = (typeof ADMIN_USER_SORT_FIELDS)[number]
export type AdminUserSortDir = 'asc' | 'desc'

const PAGE_SIZE = 40

export function parseAdminUserSort(
  sort?: string | null,
  dir?: string | null,
): { sort: AdminUserSortField; dir: AdminUserSortDir } {
  const field = ADMIN_USER_SORT_FIELDS.includes(sort as AdminUserSortField)
    ? (sort as AdminUserSortField)
    : 'created'
  const direction: AdminUserSortDir = dir === 'asc' ? 'asc' : 'desc'
  return { sort: field, dir: direction }
}

function orderByForSort(
  sort: AdminUserSortField,
  dir: AdminUserSortDir,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ name: dir }, { id: dir }]
    case 'email':
      return [{ email: dir }, { id: dir }]
    case 'status':
      // Active (null) vs disabled — nulls sort first on asc in Postgres
      return [{ disabledAt: dir }, { id: dir }]
    case 'created':
    default:
      return [{ createdAt: dir }, { id: dir }]
  }
}

export async function countAdmins(): Promise<number> {
  return prisma.user.count({
    where: { roles: { has: UserRole.ADMIN } },
  })
}

export async function listAdminUsers(opts: {
  q?: string | null
  cursor?: string | null
  sort?: AdminUserSortField
  dir?: AdminUserSortDir
}): Promise<{ users: AdminUserRow[]; nextCursor: string | null }> {
  const q = opts.q?.trim()
  const { sort, dir } = parseAdminUserSort(opts.sort, opts.dir)
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const rows = await prisma.user.findMany({
    where,
    take: PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    orderBy: orderByForSort(sort, dir),
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      disabledAt: true,
      disabledReason: true,
      createdAt: true,
      athleteProfile: { select: { id: true } },
      coachProfile: { select: { id: true } },
    },
  })

  const page = rows.slice(0, PAGE_SIZE)
  const nextCursor = rows.length > PAGE_SIZE ? page[page.length - 1]!.id : null

  return {
    users: page.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      disabledAt: u.disabledAt,
      disabledReason: u.disabledReason,
      createdAt: u.createdAt,
      hasAthlete: Boolean(u.athleteProfile),
      hasCoach: Boolean(u.coachProfile),
    })),
    nextCursor,
  }
}

export async function assertCanMutateTarget(
  admin: SessionContext,
  targetUserId: string,
): Promise<{
  id: string
  roles: UserRole[]
  email: string
}> {
  if (targetUserId === admin.userId) {
    throw new Error('You cannot perform this action on your own account')
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, roles: true, email: true },
  })
  if (!target) throw new Error('User not found')

  if (target.roles.includes(UserRole.ADMIN)) {
    throw new Error('Cannot modify another admin account')
  }

  return target
}

export async function assertCanDeleteTarget(
  admin: SessionContext,
  targetUserId: string,
): Promise<void> {
  await assertCanMutateTarget(admin, targetUserId)
}

/** Guard used by admin pages. */
export async function requireAdminSession() {
  return requireAdmin()
}
