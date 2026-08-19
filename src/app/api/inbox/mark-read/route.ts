import { NextResponse } from 'next/server'
import { markCoachingThreadRead } from '@/app/actions/coaching-inbox'

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
  } catch {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 400 })
  }
}
