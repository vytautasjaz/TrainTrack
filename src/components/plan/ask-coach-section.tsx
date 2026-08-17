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
  loadWorkoutCoachingThread,
} from '@/app/actions/coaching-inbox'
import { updateAthleteWorkoutComment } from '@/app/actions/workouts'
import { athleteCanAskCoachAboutWorkout } from '@/lib/coaching-inbox-shared'
import {
  athleteCanLeaveWorkoutComment,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { parseWorkoutFeeling, WORKOUT_FEELING_DEFAULT, workoutFeelingLabel } from '@/lib/workout-feeling'
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
  const [thread, setThread] = useState<CoachingThreadView | null>(null)
  const [fetchDone, setFetchDone] = useState(false)
  const [panel, setPanel] = useState<FooterPanel | null>(() =>
    athleteCanLeaveWorkoutComment(workout, false) ? 'feedback' : null,
  )
  const [feedbackBody, setFeedbackBody] = useState(
    () => workout.result?.athleteNotes?.trim() || '',
  )
  const [feeling, setFeeling] = useState(
    () => parseWorkoutFeeling(workout.result?.feeling) ?? WORKOUT_FEELING_DEFAULT,
  )
  const [committedNotes, setCommittedNotes] = useState(
    () => workout.result?.athleteNotes?.trim() || '',
  )
  const [committedFeeling, setCommittedFeeling] = useState(
    () => parseWorkoutFeeling(workout.result?.feeling) ?? WORKOUT_FEELING_DEFAULT,
  )
  const [chatBody, setChatBody] = useState('')
  const feedbackRef = useRef<HTMLTextAreaElement>(null)
  const chatRef = useRef<HTMLTextAreaElement>(null)
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
  const savedFeeling = parseWorkoutFeeling(workout.result?.feeling)
  const feedbackDirty =
    feedbackBody.trim() !== committedNotes || feeling !== committedFeeling

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      checkAthleteHasConnectedCoach(),
      loadWorkoutCoachingThread(workout.id),
    ])
      .then(([coach, t]) => {
        if (!cancelled) {
          setHasCoach(coach)
          setThread(t)
          setFetchDone(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasCoach(false)
          setThread(null)
          setFetchDone(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [workout.id])

  const persistFeedback = useCallback(async () => {
    const trimmed = feedbackBodyRef.current.trim()
    const nextFeeling = feelingRef.current
    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('athleteNotes', trimmed)
    formData.set('feeling', String(nextFeeling))
    await updateAthleteWorkoutComment(formData)
    setCommittedNotes(trimmed)
    setCommittedFeeling(nextFeeling)
    onDirtyChangeRef.current?.(false)
    setFeedbackError(null)
    void loadWorkoutCoachingThread(workout.id).then(setThread)
    router.refresh()
  }, [router, workout.id])

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

  const hasCoachReady = fetchDone ? hasCoach : canAsk || canFeedback
  const showChat = Boolean(thread) || hasCoachReady
  const visible = canAsk || canFeedback || Boolean(thread)

  if (!visible) return null

  function toggle(next: FooterPanel) {
    setPanel((prev) => (prev === next ? null : next))
  }

  function reload() {
    void loadWorkoutCoachingThread(workout.id).then(setThread)
    router.refresh()
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

  const messageCount = thread?.messages.length ?? 0
  const chatHint =
    messageCount > 0
      ? `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`
      : 'Message your coach about this workout'
  const feedbackHint = savedNotes
    ? savedFeeling
      ? `${workoutFeelingLabel(savedFeeling)} · ${savedFeeling}/10`
      : 'Note saved'
    : savedFeeling
      ? `${workoutFeelingLabel(savedFeeling)} · ${savedFeeling}/10`
      : 'How did this workout go?'

  const splitCompleted = canFeedback && !canAsk

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
        </div>
      ) : null}

      {panel === 'ask' || panel === 'chat' ? (
        <div className="mt-1 space-y-3 border-t border-border/30 px-2 pt-3">
          {!fetchDone ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">Loading conversation…</p>
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
