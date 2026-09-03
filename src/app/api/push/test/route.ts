import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { sendTestPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

/**
 * Dev/staging helper to verify Web Push + badge sync.
 * Enabled when NODE_ENV !== 'production' or ALLOW_PUSH_TEST=1.
 */
export async function POST(request: Request) {
  const allow =
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_PUSH_TEST === '1'
  if (!allow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let threadId: string | undefined
  try {
    const body = (await request.json()) as { threadId?: string }
    if (typeof body.threadId === 'string' && /^[a-zA-Z0-9_-]+$/.test(body.threadId)) {
      threadId = body.threadId
    }
  } catch {
    // empty body is fine
  }

  try {
    const result = await sendTestPushNotification(session.userId, threadId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send test push'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
