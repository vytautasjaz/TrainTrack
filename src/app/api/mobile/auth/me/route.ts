import { NextResponse } from 'next/server'
import { requireMobileAthlete } from '@/lib/mobile-auth'

export async function GET(request: Request) {
  const auth = await requireMobileAthlete(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    user: {
      id: auth.session.userId,
      name: auth.session.name,
      email: auth.session.email,
      athleteId: auth.session.athleteId,
    },
  })
}
