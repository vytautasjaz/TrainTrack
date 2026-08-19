import { NextResponse } from 'next/server'
import { toUserMessage } from '@/lib/action-error'

export function jsonError(
  error: unknown,
  status: number,
  fallback = 'Request failed',
) {
  return NextResponse.json({ error: toUserMessage(error, fallback) }, { status })
}

export function jsonUnauthorized(fallback = 'Unauthorized') {
  return NextResponse.json({ error: fallback }, { status: 401 })
}
