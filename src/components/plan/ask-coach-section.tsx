/* eslint-disable react-hooks/refs */
'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type MutableRefObject, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, MessageSquare, StickyNote } from 'lucide-react'
import { CoachingAuthorRole, CoachingThreadStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import {
  askCoachAboutWorkout,
  checkAthleteHasConnectedCoach,
  coachMessageAboutWorkout,
  replyToCoachingThread,
} from '@/app/actions/coaching-inbox'
import { CoachingThreadSkeleton } from '@/components/inbox/coaching-thread-skeleton'
import { useWorkoutCoachingThread } from '@/hooks/use-workout-coaching-thread'
import {
  invalidateWorkoutCoachingThreadCache,
  prefetchWorkoutCoachingThread,
} from '@/lib/coaching-thread-prefetch'
import { updateAthleteWorkoutComment } from '@/app/actions/workouts'
import { athleteCanAskCoachAboutWorkout, threadHasChatConversation } from '@/lib/coaching-inbox-shared'
import {
  athleteCanLeaveWorkoutComment,
  workoutHasCoachingChat,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { parseWorkoutFeeling, workoutFeelingLabel } from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'
import { WorkoutFeelingPicker } from '@/components/plan/workout-feeling-picker'

type CoachMessageSectionProps = {
  workout: PlanWorkoutDetail
  onClose?: () => void
  onDirtyChange?: (dirty: boolean) => void
  saveRef?: MutableRefObject<(() => Promise<void>) | null>
}

type FooterPanel = 'ask' | 'feedback' | 'chat'

function initialAskCoachPanel(workout: PlanWorkoutDetail): FooterPanel | null {
  const canAsk = athleteCanAskCoachAboutWorkout(workout)
  const canFeedback = athleteCanLeaveWorkoutComment(workout, false)
  if (workoutHasCoachingChat(workout)) {
    return canFeedback && !canAsk ? 'chat' : 'ask'
  }
  return canFeedback ? 'feedback' : null
}

function FooterCell({
  icon,
  title,
  hint,
  expanded,
  onClick,
  className,
}: {
  icon: ReactNode
  title: string
  hint: string
  expanded: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        'flex min-w-0 items-center gap-2 px-2 py-2 text-left transition',
        'text-foreground hover:bg-muted/50',
        expanded && 'bg-muted/40',
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-muted/70 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {!expanded ? (
          <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
          expanded && 'rotate-180',
        )}
      />
    </button>
  )
}

/** Unified Feedback / Message coach footer (collapsed until tapped). */
export function AskCoachSection({ workout, onClose, onDirtyChange, saveRef }: CoachMessageSectionProps) {
  return (
    <AskCoachSectionInner
      key={workout.id}
      workout={workout}
      onClose={onClose}
      onDirtyChange={onDirtyChange}
      saveRef={saveRef}
    />
  )
}

function AskCoachSectionInner({ workout, onClose, onDirtyChange, saveRef }: CoachMessageSectionProps) {
  const router = useRouter()
  const [hasCoach, setHasCoach] = useState(false)
  const { thread, ready: threadReady, reload: reloadThread, setThread } =
    useWorkoutCoachingThread(workout.id)
  const [coachCheckDone, setCoachCheckDone] = useState(false)
  const [panel, setPanel] = useState<FooterPanel | null>(() => initialAskCoachPanel(workout))
  const initialNotes = workout.result?.athleteNotes?.trim() || ''
  const initialFeeling = parseWorkoutFeeling(workout.result?.feeling)
  const [feedbackBody, setFeedbackBody] = useState(() => initialNotes)
  const [feeling, setFeeling] = useState<number | null>(() => initialFeeling)
  const [committedNotes, setCommittedNotes] = useState(() => initialNotes)
  const [committedFeeling, setCommittedFeeling] = useState<number | null>(
    () => initialFeeling,
  )
  const [hasSavedFeedback, setHasSavedFeedback] = useState(
    () => initialFeeling != null || Boolean(initialNotes),
  )
  const [editingFeedback, setEditingFeedback] = useState(
    () => !(initialFeeling != null || Boolean(initialNotes)),
  )
  const [chatBody, setChatBody] = useState('')
  const feedbackRef = useRef<HTMLTextAreaElement>(null)
  const chatRef = useRef<HTMLTextAreaElement>(null)
  const autoExpandedChatRef = useRef(false)
  const [isPending, startTransition] = useTransition()
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const feedbackBodyRef = useRef(feedbackBody)
  const feelingRef = useRef(feeling)
  const onDirtyChangeRef = useRef(onDirtyChange)
  feedbackBodyRef.current = feedbackBody
  feelingRef.current = feeling
  onDirtyChangeRef.current = onDirtyChange

  const canAsk = athleteCanAskCoachAboutWorkout(workout)
  const canFeedback = athleteCanLeaveWorkoutComment(workout, false)

  const stravaDescription = workout.result?.stravaActivityDescription?.trim() || ''
  const savedNotes = committedNotes
  const savedFeeling = hasSavedFeedback ? committedFeeling : null
  const feedbackDirty =
    editingFeedback &&
    (feedbackBody.trim() !== committedNotes || feeling !== committedFeeling)

  useEffect(() => {
    let cancelled = false
    void checkAthleteHasConnectedCoach()
      .then((coach) => {
        if (!cancelled) {
          setHasCoach(coach)
          setCoachCheckDone(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasCoach(false)
          setCoachCheckDone(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [workout.id])

  const splitCompleted = canFeedback && !canAsk
  const chatPanel: FooterPanel = splitCompleted ? 'chat' : 'ask'

  useEffect(() => {
    if (autoExpandedChatRef.current) return
    if (workoutHasCoachingChat(workout)) {
      autoExpandedChatRef.current = true
      setPanel(chatPanel)
      return
    }
    if (thread && threadHasChatConversation(thread.messages)) {
      autoExpandedChatRef.current = true
      setPanel(chatPanel)
    }
  }, [thread, chatPanel, workout])

  // Refresh committed values from server without interrupting an in-progress edit.
  useEffect(() => {
    const notes = workout.result?.athleteNotes?.trim() || ''
    const nextFeeling = parseWorkoutFeeling(workout.result?.feeling)
    if (nextFeeling == null && !notes) return
    setCommittedNotes(notes)
    if (nextFeeling != null) setCommittedFeeling(nextFeeling)
    setHasSavedFeedback(true)
  }, [workout.id, workout.result?.feeling, workout.result?.athleteNotes])

  const persistFeedback = useCallback(async () => {
    const trimmed = feedbackBodyRef.current.trim()
    const nextFeeling = feelingRef.current
    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('athleteNotes', trimmed)
    if (nextFeeling != null) {
      formData.set('feeling', String(nextFeeling))
    }
    await updateAthleteWorkoutComment(formData)
    setCommittedNotes(trimmed)
    setCommittedFeeling(nextFeeling)
    setHasSavedFeedback(true)
    setEditingFeedback(false)
    onDirtyChangeRef.current?.(false)
    setFeedbackError(null)
    void reloadThread()
    router.refresh()
  }, [reloadThread, router, workout.id])

  const runFeedbackSave = useCallback(async () => {
    setFeedbackSaving(true)
    setFeedbackError(null)
    try {
      await persistFeedback()
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Could not save feedback')
      throw err
    } finally {
      setFeedbackSaving(false)
    }
  }, [persistFeedback])

  useEffect(() => {
    onDirtyChangeRef.current?.(feedbackDirty)
  }, [feedbackDirty])

  useEffect(() => {
    return () => onDirtyChangeRef.current?.(false)
  }, [])

  useEffect(() => {
    if (!saveRef) return
    saveRef.current = runFeedbackSave
    return () => {
      saveRef.current = null
    }
  }, [runFeedbackSave, saveRef])

  const hasCoachReady = coachCheckDone ? hasCoach : canAsk || canFeedback
  const showChat = Boolean(thread) || hasCoachReady || workoutHasCoachingChat(workout)
  const visible =
    canAsk || canFeedback || Boolean(thread) || workoutHasCoachingChat(workout)

  if (!visible) return null

  function toggle(next: FooterPanel) {
    setPanel((prev) => (prev === next ? null : next))
  }

  function reload() {
    void reloadThread()
    router.refresh()
  }

  function beginEditFeedback() {
    setFeedbackBody(committedNotes)
    setFeeling(committedFeeling)
    setFeedbackError(null)
    setEditingFeedback(true)
  }

  function cancelEditFeedback() {
    setFeedbackBody(committedNotes)
    setFeeling(committedFeeling)
    setFeedbackError(null)
    setEditingFeedback(false)
    onDirtyChangeRef.current?.(false)
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = chatBody.trim()
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
          kind: 'CHAT',
          body: trimmed,
          createdAt: new Date().toISOString(),
        },
      ],
    })
    setChatBody('')
    startTransition(async () => {
      try {
        await askCoachAboutWorkout(formData)
        reload()
      } catch {
        setThread(null)
        setChatBody(trimmed)
      }
    })
  }

  function saveFeedback(e: React.FormEvent) {
    e.preventDefault()
    void runFeedbackSave().catch(() => {
      /* error shown on the form */
    })
  }

  const hasChatConversation = thread
    ? threadHasChatConversation(thread.messages)
    : workoutHasCoachingChat(workout)
  const messageCount = thread && threadHasChatConversation(thread.messages)
    ? thread.messages.length
    : (workout.coachingChat?.messageCount ?? 0)
  const chatHint =
    hasChatConversation && messageCount > 0
      ? `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`
      : 'Message your coach about this workout'
  const feedbackHint = savedNotes
    ? savedFeeling != null
      ? `${workoutFeelingLabel(savedFeeling)} · ${savedFeeling}/10`
      : 'Note saved'
    : savedFeeling != null
      ? `${workoutFeelingLabel(savedFeeling)} · ${savedFeeling}/10`
      : 'How did this workout go?'

  const showLockedFeedback =
    canFeedback && hasSavedFeedback && !editingFeedback
  const lockedFeeling = savedFeeling

  return (
    <div className="shrink-0 border-t border-border/40 px-3 pb-3 pt-1">
      {splitCompleted ? (
        <div
          className={cn(
            'grid',
            showChat ? 'grid-cols-2 divide-x divide-border/50' : 'grid-cols-1',
          )}
        >
          <FooterCell
            icon={<StickyNote className="h-4 w-4" strokeWidth={2} />}
            title="Feedback"
            hint={feedbackHint}
            expanded={panel === 'feedback'}
            onClick={() => toggle('feedback')}
          />
          {showChat ? (
            <FooterCell
              icon={<MessageSquare className="h-4 w-4" strokeWidth={2} />}
              title="Message coach"
              hint={chatHint}
              expanded={panel === 'chat'}
              onClick={() => toggle('chat')}
            />
          ) : null}
        </div>
      ) : (
        <FooterCell
          icon={<MessageSquare className="h-4 w-4" strokeWidth={2} />}
          title="Message coach"
          hint={chatHint}
          expanded={panel === 'ask'}
          onClick={() => toggle('ask')}
          className="w-full px-2"
        />
      )}

      {panel === 'feedback' ? (
        <div className="mt-1 space-y-3 border-t border-border/30 px-2 pt-3">
          {showLockedFeedback ? (
            <div className="space-y-3">
              <div className="rounded-[8px] border border-border/60 bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  How you felt
                </p>
                {lockedFeeling != null ? (
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {lockedFeeling}/10 · {workoutFeelingLabel(lockedFeeling)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No effort rating</p>
                )}
                {savedNotes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {savedNotes}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No note added.</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={beginEditFeedback}
                >
                  Edit feedback
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={saveFeedback} className="space-y-3">
              <WorkoutFeelingPicker
                value={feeling}
                onChange={setFeeling}
                disabled={feedbackSaving}
              />
              <Textarea
                ref={feedbackRef}
                value={feedbackBody}
                onChange={(e) => setFeedbackBody(e.target.value)}
                rows={3}
                placeholder="How did your session go?"
                disabled={feedbackSaving}
              />
              {feedbackError ? (
                <p className="text-sm text-destructive">{feedbackError}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <EmojiPickerButton
                  disabled={feedbackSaving}
                  onSelect={(emoji) =>
                    setFeedbackBody((prev) =>
                      insertEmojiAtCursor(feedbackRef.current, prev, emoji),
                    )
                  }
                />
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  {hasSavedFeedback ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={feedbackSaving}
                      onClick={cancelEditFeedback}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  {stravaDescription && feedbackBody !== stravaDescription ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={feedbackSaving}
                      onClick={() => setFeedbackBody(stravaDescription)}
                    >
                      Use Strava description
                    </Button>
                  ) : null}
                  <Button type="submit" size="sm" variant="secondary" disabled={feedbackSaving}>
                    {feedbackSaving ? 'Saving…' : 'Save feedback'}
                  </Button>
                  {onClose ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={feedbackSaving}
                      onClick={() => {
                        void runFeedbackSave()
                          .then(() => onClose())
                          .catch(() => {
                            /* keep draft */
                          })
                      }}
                    >
                      {feedbackSaving ? 'Saving…' : 'Save and close'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {panel === 'ask' || panel === 'chat' ? (
        <div className="mt-1 space-y-3 border-t border-border/30 px-2 pt-3">
          {!threadReady ? (
            <CoachingThreadSkeleton compact />
          ) : thread ? (
            <CoachingThreadPanel thread={thread} role="athlete" compact onUpdated={reload} />
          ) : (
            <form onSubmit={sendChat} className="space-y-2">
              <FormField label="Message about this workout">
                <Textarea
                  ref={chatRef}
                  value={chatBody}
                  onChange={(e) => setChatBody(e.target.value)}
                  rows={3}
                  placeholder="Ask about pacing, equipment, swaps…"
                  disabled={isPending}
                  autoFocus
                />
              </FormField>
              <div className="flex flex-wrap items-center gap-2">
                <EmojiPickerButton
                  disabled={isPending}
                  onSelect={(emoji) =>
                    setChatBody((prev) => insertEmojiAtCursor(chatRef.current, prev, emoji))
                  }
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isPending || !chatBody.trim()}
                >
                  {isPending ? 'Sending…' : 'Send to coach'}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Coach chat body — editor tab or workout detail footer. */
function CoachWorkoutChatStarter({
  workoutId,
  threadId,
  onSent,
  className,
}: {
  workoutId: string
  threadId?: string
  onSent: () => void
  className?: string
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function send(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || isPending) return
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('body', trimmed)
        if (threadId) {
          formData.set('threadId', threadId)
          await replyToCoachingThread(formData)
        } else {
          formData.set('workoutId', workoutId)
          await coachMessageAboutWorkout(formData)
        }
        setBody('')
        onSent()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send message')
      }
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm text-muted-foreground">
        No messages yet. Start the conversation with your athlete.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form onSubmit={send} className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write about pacing, swaps, reminders…"
          disabled={isPending}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2">
          <EmojiPickerButton
            disabled={isPending}
            onSelect={(emoji) =>
              setBody((prev) => insertEmojiAtCursor(textareaRef.current, prev, emoji))
            }
          />
          <Button type="submit" size="sm" variant="secondary" disabled={isPending || !body.trim()}>
            {isPending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function CoachWorkoutChatPanel({
  workoutId,
  thread,
  fetchDone,
  onThreadChange,
  className,
}: {
  workoutId: string
  thread: CoachingThreadView | null
  fetchDone: boolean
  onThreadChange: (thread: CoachingThreadView | null) => void
  className?: string
}) {
  const router = useRouter()

  function reload() {
    invalidateWorkoutCoachingThreadCache(workoutId)
    void prefetchWorkoutCoachingThread(workoutId).then(onThreadChange)
    router.refresh()
  }

  if (!fetchDone) {
    return <CoachingThreadSkeleton compact className={className} />
  }

  if (!thread || thread.messages.length === 0) {
    return (
      <CoachWorkoutChatStarter
        workoutId={workoutId}
        threadId={thread?.id}
        onSent={reload}
        className={className}
      />
    )
  }

  return (
    <CoachingThreadPanel
      thread={thread}
      role="coach"
      compact
      onUpdated={reload}
      className={className}
    />
  )
}

/** Coach-side workout modal thread — always available (start or continue chat). */
export function CoachWorkoutThreadSection({ workout }: { workout: PlanWorkoutDetail }) {
  const expectedChat = workoutHasCoachingChat(workout)
  const { thread, ready, setThread } = useWorkoutCoachingThread(workout.id)
  const [expanded, setExpanded] = useState(() => expectedChat)

  useEffect(() => {
    if (expectedChat || (ready && thread && threadHasChatConversation(thread.messages))) {
      setExpanded(true)
    }
  }, [expectedChat, ready, thread])

  const hasConversation =
    expectedChat || (ready && Boolean(thread && threadHasChatConversation(thread.messages)))
  const chatHint = !ready
    ? 'Loading…'
    : hasConversation
      ? `${thread?.messages.length ?? 0} message${(thread?.messages.length ?? 0) === 1 ? '' : 's'}`
      : 'Ask about pacing, swaps, reminders…'

  return (
    <div className="shrink-0 border-t border-border/40 px-3 pb-3 pt-1">
      <FooterCell
        icon={<MessageSquare className="h-4 w-4" strokeWidth={2} />}
        title="Message athlete"
        hint={chatHint}
        expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="w-full px-2"
      />
      {expanded ? (
        <div className="mt-1 border-t border-border/30 px-2 pt-3">
          <CoachWorkoutChatPanel
            workoutId={workout.id}
            thread={thread}
            fetchDone={ready}
            onThreadChange={setThread}
          />
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
