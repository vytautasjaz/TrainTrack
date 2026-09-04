'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { customAlphabet } from '@/lib/coaching-code-alphabet'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import {
  assertCanDeleteTarget,
  assertCanMutateTarget,
  countAdmins,
} from '@/lib/admin'
import { UserRole } from '@prisma/client'

const generateTempPassword = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$',
  16,
)

function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string,
  detail?: string,
) {
  console.info(
    `[admin] ${action} admin=${adminId} target=${targetUserId}${detail ? ` ${detail}` : ''}`,
  )
}

export async function adminSetUserDisabled(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const disabled = String(formData.get('disabled') ?? '') === '1'
  const reason = String(formData.get('reason') ?? '').trim() || null

  await assertCanMutateTarget(admin, userId)

  await prisma.user.update({
    where: { id: userId },
    data: disabled
      ? { disabledAt: new Date(), disabledReason: reason }
      : { disabledAt: null, disabledReason: null },
  })

  if (disabled) {
    await prisma.session.deleteMany({ where: { userId } })
  }

  logAdminAction(
    admin.userId,
    disabled ? 'USER_DISABLED' : 'USER_ENABLED',
    userId,
    reason ?? undefined,
  )
  revalidatePath('/admin')
}

export async function adminResetPassword(
  formData: FormData,
): Promise<{ temporaryPassword: string }> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  await assertCanMutateTarget(admin, userId)

  const temporaryPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })
  await prisma.session.deleteMany({ where: { userId } })

  logAdminAction(admin.userId, 'PASSWORD_RESET', userId)
  revalidatePath('/admin')
  return { temporaryPassword }
}

export async function adminDeleteUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  await assertCanDeleteTarget(admin, userId)

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  })
  if (!target) throw new Error('User not found')

  if (target.roles.includes(UserRole.ADMIN)) {
    const admins = await countAdmins()
    if (admins <= 1) {
      throw new Error('Cannot delete the last admin account')
    }
  }

  await prisma.user.delete({ where: { id: userId } })
  logAdminAction(admin.userId, 'USER_DELETED', userId)
  revalidatePath('/admin')
}
