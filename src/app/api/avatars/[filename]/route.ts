import { NextResponse } from 'next/server'
import { getAvatarFile } from '@/lib/avatar-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ filename: string }>
}

function sanitizeAvatarFilename(raw: string) {
  const decoded = decodeURIComponent(raw)
  const base = decoded.split(/[?#]/)[0]
  return base.split('/').pop() ?? ''
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename: raw } = await context.params
  const filename = sanitizeAvatarFilename(raw)
  const file = await getAvatarFile(filename)
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
