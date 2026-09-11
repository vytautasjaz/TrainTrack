import { NextResponse } from 'next/server'
import { getRaceCoverFile } from '@/lib/race-cover-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ filename: string }>
}

function sanitizeFilename(raw: string) {
  const decoded = decodeURIComponent(raw)
  const base = decoded.split(/[?#]/)[0]
  return base.split('/').pop() ?? ''
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename: raw } = await context.params
  const filename = sanitizeFilename(raw)
  const file = await getRaceCoverFile(filename)
  if (!file) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
