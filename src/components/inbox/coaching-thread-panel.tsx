'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CoachingAuthorRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { markCoachingThreadRead, replyToCoachingThread } from '@/app/actions/coaching-inbox'
import { COACHING_THREAD_MESSAGE_CAP } from '@/lib/coaching-inbox-shared'
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'

export type CoachingThreadMessageView = {
  id: string
  authorRole: CoachingAuthorRole
  body: string
  createdAt: string
}

export type CoachingThreadView = {
  id: string
  status: string
  kind: string
  messages: CoachingThreadMessageView[]
}

type CoachingThreadPanelProps = {
  thread: CoachingThreadView
  role: 'athlete' | 'coach'
  className?: string
  compact?: boolean
  /** Skip marking read on open (Inbox holds unread after “Mark unread”). */
  skipAutoRead?: boolean
  /** Extra control rendered just under the composer (e.g. Mark unread). */
  composerFooter?: ReactNode
  onUpdated?: () => void
  /** Called with message body right after a successful send (for optimistic Inbox updates). */
  onMessageSent?: (body: string) => void
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CoachingThreadPanel({
  thread,
  role,
  className,
  compact = false,
  skipAutoRead = false,
  composerFooter,
  onUpdated,
  onMessageSent,
}: CoachingThreadPanelProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState('')
  const [localMessages, setLocalMessages] = useState(thread.messages)
  const [isPending, startTransition] = useTransition()
  const isOptimistic = thread.id.startsWith('optimistic-')
  const atCap = localMessages.length >= COACHING_THREAD_MESSAGE_CAP

  useEffect(() => {
    setLocalMessages(thread.messages)
  }, [
    thread.id,
    thread.messages.length,
    thread.messages[thread.messages.length - 1]?.id,
    thread.messages[thread.messages.length - 1]?.body,
  ])

  useEffect(() => {
    if (isOptimistic || skipAutoRead) return
    const formData = new FormData()
    formData.set('threadId', thread.id)
    void markCoachingThreadRead(formData).then(() => {
      router.refresh()
    })
  }, [thread.id, router, isOptimistic, skipAutoRead])

  function refresh() {
    router.refresh()
    onUpdated?.()
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    if (isOptimistic) return
    const trimmed = body.trim()
    if (!trimmed || atCap) return
    const formData = new FormData()
    formData.set('threadId', thread.id)
    formData.set('body', trimmed)
    const authorRole =
      role === 'coach' ? CoachingAuthorRole.COACH : CoachingAuthorRole.ATHLETE
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      authorRole,
      body: trimmed,
      createdAt: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, optimistic])
    setBody('')
    onMessageSent?.(trimmed)
    startTransition(async () => {
      try {
        await replyToCoachingThread(formData)
        refresh()
      } catch {
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      }
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('space-y-2', compact ? 'max-h-40 overflow-y-auto' : 'max-h-72 overflow-y-auto')}>
        {localMessages.map((m) => {
          const mine =
            (role === 'athlete' && m.authorRole === CoachingAuthorRole.ATHLETE) ||
            (role === 'coach' && m.authorRole === CoachingAuthorRole.COACH)
          return (
            <div
              key={m.id}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-[10px] px-3 py-2 text-sm',
                  mine
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    mine ? 'text-background/70' : 'text-muted-foreground',
                  )}
                >
                  {m.authorRole === CoachingAuthorRole.COACH ? 'Coach' : 'Athlete'}
                  {' · '}
                  {formatMsgTime(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {isOptimistic ? (
        <p className="text-xs text-muted-foreground">Sending…</p>
      ) : atCap ? (
        <p className="text-xs text-muted-foreground">
          Message limit reached ({COACHING_THREAD_MESSAGE_CAP}).
        </p>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder={role === 'coach' ? 'Reply…' : 'Write a follow-up…'}
            disabled={isPending}
          />
          <div className="flex items-center justify-between gap-2">
            <EmojiPickerButton
              disabled={isPending}
              onSelect={(emoji) =>
                setBody((prev) => insertEmojiAtCursor(textareaRef.current, prev, emoji))
              }
            />
            <Button type="submit" size="sm" variant="secondary" disabled={isPending || !body.trim()}>
              {isPending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      )}

      {composerFooter ? <div className="flex justify-end">{composerFooter}</div> : null}
    </div>
  )
}
