import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Cheap keep-warm + uptime probe — no auth, no DB. */
export async function GET() {
  return NextResponse.json(
    { ok: true, t: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
