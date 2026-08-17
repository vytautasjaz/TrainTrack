import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { searchYrLocations } from '@/lib/weather/yr'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ places: [] })
  }

  try {
    const places = await searchYrLocations(q)
    return NextResponse.json({ places })
  } catch {
    return NextResponse.json({ error: 'Location search failed' }, { status: 502 })
  }
}
