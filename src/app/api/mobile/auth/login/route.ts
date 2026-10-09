import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { normalizeAuthEmail } from '@/lib/auth-form-validation'
import {
  mobileJsonError,
  resolveMobileAthleteForUser,
  signMobileToken,
} from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown }
  } catch {
    return mobileJsonError('Invalid JSON body.', 400)
  }

  const email = normalizeAuthEmail(String(body.email ?? ''))
  const password = String(body.password ?? '')
  if (!email || !password) {
    return mobileJsonError('Email and password are required.', 400)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      disabledAt: true,
    },
  })
  if (!user?.passwordHash || user.disabledAt) {
    return mobileJsonError('Invalid email or password.', 401)
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return mobileJsonError('Invalid email or password.', 401)
  }

  const resolved = await resolveMobileAthleteForUser(user.id)
  if (!resolved.ok) {
    return mobileJsonError(resolved.error, resolved.status)
  }

  const token = await signMobileToken({
    userId: resolved.session.userId,
    athleteId: resolved.session.athleteId,
  })

  return NextResponse.json({
    token,
    user: {
      id: resolved.session.userId,
      name: resolved.session.name,
      email: resolved.session.email,
      athleteId: resolved.session.athleteId,
    },
  })
}
