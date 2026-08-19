'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Frown, Meh, Smile } from 'lucide-react'
import { CoachingAuthorRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toUserMessage } from '@/lib/action-error'
import { replyToCoachingThread } from '@/app/actions/coaching-inbox'
import { COACHING_THREAD_MESSAGE_CAP } from '@/lib/coaching-inbox-shared'
import { refreshInboxUnreadBadge } from '@/components/layout/inbox-nav-badge'
import {
  parseWorkoutFeeling,
  WORKOUT_FEELING_BUBBLE_CLASS,
  WORKOUT_FEELING_META_CLASS,
  workoutFeelingLabel,
  workoutFeelingTone,
} from '@/lib/workout-feeling'
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'

export type CoachingThreadMessageView = {
  id: string
  authorRole: CoachingAuthorRole
  kind?: 'CHAT' | 'FEEDBACK'
  body: string
  feeling?: number | null
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
  const [sendError, setSendError] = useState<string | null>(null)
  const [localMessages, setLocalMessages] = useState(thread.messages)
  const [isPending, startTransition] = useTransition()
  const isOptimistic = thread.id.startsWith('optimistic-')
  const atCap = localMessages.length >= COACHING_THREAD_MESSAGE_CAP

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalMessages(thread.messages)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [
    thread.id,
    thread.messages.length,
    thread.messages[thread.messages.length - 1]?.id,
    thread.messages[thread.messages.length - 1]?.body,
    thread.messages[thread.messages.length - 1]?.feeling,
  ])

  useEffect(() => {
    if (isOptimistic || skipAutoRead) return
    let cancelled = false
    void fetch('/api/inbox/mark-read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id }),
    })
      .then((res) => {
        if (cancelled || !res.ok) return
        void refreshInboxUnreadBadge()
        router.refresh()
      })
      .catch(() => {
        // Ignore network / stale-tab failures; unread can be marked on next open.
      })
    return () => {
      cancelled = true
    }
  }, [thread.id, isOptimistic, skipAutoRead, router])

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
      kind: 'CHAT' as const,
      body: trimmed,
      createdAt: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, optimistic])
    setBody('')
    setSendError(null)
    onMessageSent?.(trimmed)
    startTransition(async () => {
      try {
        await replyToCoachingThread(formData)
        refresh()
        void refreshInboxUnreadBadge()
      } catch (error) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setBody(trimmed)
        setSendError(toUserMessage(error, 'Could not send message'))
      }
    })
  }

  return (
    <div className={cn('min-w-0 max-w-full space-y-3', className)}>
      <FormError message={sendError} />
      <div className={cn('min-w-0 space-y-2', compact ? 'max-h-40 overflow-y-auto' : 'max-h-72 overflow-y-auto')}>
        {localMessages.map((m) => {
          const mine =
            (role === 'athlete' && m.authorRole === CoachingAuthorRole.ATHLETE) ||
            (role === 'coach' && m.authorRole === CoachingAuthorRole.COACH)
          const feeling = parseWorkoutFeeling(m.feeling)
          const isFeedback = m.kind === 'FEEDBACK' || feeling != null
          const feelingTone = feeling ? workoutFeelingTone(feeling) : null
          const FeelingIcon =
            feelingTone === 'bad' ? Frown : feelingTone === 'ok' ? Meh : Smile
          return (
            <div
              key={m.id}
              className={cn('flex min-w-0', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'min-w-0 max-w-[min(85%,100%)] rounded-[10px] px-3 py-2 text-sm [overflow-wrap:anywhere]',
                  isFeedback && feelingTone
                    ? WORKOUT_FEELING_BUBBLE_CLASS[feelingTone]
                    : isFeedback
                      ? mine
                        ? 'border border-sky-200 bg-sky-50 text-sky-950'
                        : 'border border-sky-200/80 bg-sky-50/80 text-foreground'
                      : mine
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground',
                )}
              >
                {isFeedback ? (
                  <p
                    className={cn(
                      'mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                      feelingTone
                        ? WORKOUT_FEELING_META_CLASS[feelingTone]
                        : 'text-sky-800/70',
                    )}
                  >
                    <span>Feedback</span>
                    {feeling ? (
                      <span className="inline-flex items-center gap-0.5 font-semibold normal-case tracking-normal">
                        <FeelingIcon className="h-3 w-3" strokeWidth={2.25} />
                        {feeling}/10 · {workoutFeelingLabel(feeling)}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {m.body.trim() ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">
                    {m.body}
                  </p>
                ) : null}
                <p
                  className={cn(
                    'mt-1 text-[10px] [overflow-wrap:anywhere]',
                    feelingTone
                      ? WORKOUT_FEELING_META_CLASS[feelingTone]
                      : isFeedback
                        ? 'text-sky-800/70'
                        : mine
                          ? 'text-background/70'
                          : 'text-muted-foreground',
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
        <form onSubmit={send} className="min-w-0 space-y-2">
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
