import { NextResponse } from 'next/server'
import { markCoachingThreadRead } from '@/app/actions/coaching-inbox'
import { jsonError, jsonUnauthorized } from '@/lib/api-response'
import { ActionError } from '@/lib/action-error'

export async function POST(request: Request) {
  let threadId = ''
  try {
    const body = (await request.json()) as { threadId?: unknown }
    threadId = typeof body.threadId === 'string' ? body.threadId : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!threadId) {
    return NextResponse.json({ error: 'Thread required' }, { status: 400 })
  }

  try {
    const formData = new FormData()
    formData.set('threadId', threadId)
    await markCoachingThreadRead(formData)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ActionError && error.code === 'UNAUTHORIZED') {
      return jsonUnauthorized()
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return jsonUnauthorized()
    }
    return jsonError(error, 400, 'Failed to mark read')
  }
}
