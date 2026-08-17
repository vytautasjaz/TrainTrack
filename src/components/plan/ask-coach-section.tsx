'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { CoachingAuthorRole, CoachingThreadStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import {
  askCoachAboutWorkout,
  checkAthleteHasConnectedCoach,
  loadWorkoutCoachingThread,
} from '@/app/actions/coaching-inbox'
import { updateAthleteWorkoutComment } from '@/app/actions/workouts'
import { athleteCanAskCoachAboutWorkout } from '@/lib/coaching-inbox-shared'
import {
  athleteCanLeaveWorkoutComment,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { cn } from '@/lib/utils'
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'

type CoachMessageSectionProps = {
  workout: PlanWorkoutDetail
  onClose?: () => void
}

/** Unified Ask coach + Comment for coach footer (collapsed until tapped). */
export function AskCoachSection({ workout, onClose }: CoachMessageSectionProps) {
  const router = useRouter()
  const [hasCoach, setHasCoach] = useState(false)
  const [thread, setThread] = useState<CoachingThreadView | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [notesPrivate, setNotesPrivate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canAsk = athleteCanAskCoachAboutWorkout(workout)
  const canComment = athleteCanLeaveWorkoutComment(workout, false)
  const mode: 'ask' | 'comment' | null = canAsk ? 'ask' : canComment ? 'comment' : null

  const stravaDescription = workout.result?.stravaActivityDescription?.trim() || ''
  const savedNotes = workout.result?.athleteNotes?.trim() || ''
  const savedPrivate = Boolean(workout.result?.athleteNotesPrivate)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setExpanded(false)
    void Promise.all([
      checkAthleteHasConnectedCoach(),
      loadWorkoutCoachingThread(workout.id),
    ])
      .then(([coach, t]) => {
        if (!cancelled) {
          setHasCoach(coach)
          setThread(t)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasCoach(false)
          setThread(null)
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [workout.id])

  useEffect(() => {
    if (mode === 'comment') {
      setBody(savedNotes)
      setNotesPrivate(savedPrivate)
    } else {
      setBody('')
      setNotesPrivate(false)
    }
  }, [workout.id, mode, savedNotes, savedPrivate])

  // Show the collapsed bar on first paint so the modal does not jump when the
  // coach check / thread fetch finishes.
  const hasCoachReady = loaded ? hasCoach : mode === 'ask'
  const askAllowed = mode === 'ask' && hasCoachReady
  const commentAllowed = mode === 'comment'
  const visible = Boolean(thread) || askAllowed || commentAllowed

  if (!visible) return null

  function reload() {
    void loadWorkoutCoachingThread(workout.id).then(setThread)
    router.refresh()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()

    if (mode === 'ask') {
      if (!trimmed) return
      const formData = new FormData()
      formData.set('workoutId', workout.id)
      formData.set('body', trimmed)
      setThread({
        id: `optimistic-${workout.id}`,
        status: CoachingThreadStatus.OPEN,
        kind: 'ASK',
        messages: [
          {
            id: `optimistic-msg-${Date.now()}`,
            authorRole: CoachingAuthorRole.ATHLETE,
            body: trimmed,
            createdAt: new Date().toISOString(),
          },
        ],
      })
      setBody('')
      startTransition(async () => {
        try {
          await askCoachAboutWorkout(formData)
          reload()
        } catch {
          setThread(null)
          setBody(trimmed)
        }
      })
      return
    }

    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('athleteNotes', trimmed)
    if (notesPrivate) formData.set('athleteNotesPrivate', 'true')

    startTransition(async () => {
      try {
        await updateAthleteWorkoutComment(formData)
        reload()
        if (!trimmed) onClose?.()
      } catch {
        /* keep draft */
      }
    })
  }

  const messageCount = thread?.messages.length ?? 0
  const title = mode === 'ask' ? 'Ask coach' : 'Message coach'
  const collapsedHint =
    messageCount > 0
      ? `${messageCount} ${messageCount === 1 ? 'message' : 'messages'} · tap to open`
      : mode === 'ask'
        ? 'Ask a question about this workout'
        : savedNotes
          ? 'Edit your comment for coach'
          : 'Share how it went with your coach'

  // Conversation thread when it exists (ask always; comment when shared publicly).
  const useThreadUi =
    Boolean(thread) && (mode === 'ask' || (mode === 'comment' && hasCoach && !notesPrivate))
  const useComposerUi = !useThreadUi && (askAllowed || commentAllowed)

  return (
    <div className="shrink-0 border-t border-border/40 px-5 pb-3 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 rounded-[8px] px-1 py-2 text-left transition',
          'text-foreground hover:bg-muted/50',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-muted/70 text-muted-foreground">
          <MessageSquare className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {!expanded ? (
            <span className="block text-[11px] text-muted-foreground">{collapsedHint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="mt-2 space-y-3 border-t border-border/30 pt-3">
          {!loaded ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">Loading conversation…</p>
          ) : (
            <>
              {useThreadUi && thread ? (
                <CoachingThreadPanel thread={thread} role="athlete" compact onUpdated={reload} />
              ) : null}

              {useComposerUi ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              <FormField
                label={
                  mode === 'ask' ? 'Question about this workout' : 'Comment for coach (optional)'
                }
              >
                <Textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder={
                    mode === 'ask'
                      ? 'Ask about pacing, equipment, swaps…'
                      : 'How did it feel?'
                  }
                  disabled={isPending}
                  autoFocus
                />
              </FormField>

              {mode === 'comment' ? (
                <PrivateNoteToggle
                  hideFrom="coach"
                  checked={notesPrivate}
                  onCheckedChange={setNotesPrivate}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <EmojiPickerButton
                  disabled={isPending}
                  onSelect={(emoji) =>
                    setBody((prev) => insertEmojiAtCursor(textareaRef.current, prev, emoji))
                  }
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isPending || (mode === 'ask' && !body.trim())}
                >
                  {isPending
                    ? 'Saving…'
                    : mode === 'ask'
                      ? 'Send to coach'
                      : body.trim()
                        ? notesPrivate
                          ? 'Save private note'
                          : 'Share with coach'
                        : 'Clear comment'}
                </Button>
                {mode === 'comment' && savedNotes && body.trim() !== savedNotes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setBody(savedNotes)
                      setNotesPrivate(savedPrivate)
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
                {mode === 'comment' &&
                stravaDescription &&
                body !== stravaDescription ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setBody(stravaDescription)}
                  >
                    Use Strava description
                  </Button>
                ) : null}
              </div>
            </form>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Prefer AskCoachSection — kept for older imports. */
export function HomeWorkoutCompleteSection({
  workout,
  onClose,
}: {
  workout: PlanWorkoutDetail
  onClose: () => void
}) {
  return <AskCoachSection workout={workout} onClose={onClose} />
}
