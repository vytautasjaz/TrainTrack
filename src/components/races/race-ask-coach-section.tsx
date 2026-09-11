/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, MessageSquare, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  CoachingThreadPanel,
  type CoachingThreadView,
} from '@/components/inbox/coaching-thread-panel'
import {
  askOrCommentOnRace,
  checkAthleteHasConnectedCoach,
  loadRaceCoachingThread,
} from '@/app/actions/coaching-inbox'
import { updateRaceFeedback } from '@/app/actions/races'
import { threadHasChatConversation } from '@/lib/coaching-inbox-shared'
import { athleteCanLeaveRaceFeedback, type SeasonRace } from '@/lib/season-races'
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'
import { CoachingThreadSkeleton } from '@/components/inbox/coaching-thread-skeleton'
import { ExpandShell } from '@/components/ui/expand-shell'
import { cn } from '@/lib/utils'

type FooterPanel = 'feedback' | 'chat'

type RaceAskCoachSectionProps = {
  race: Pick<SeasonRace, 'id' | 'date' | 'resultNotes'>
  /** Coach viewing athlete race — reply-only when a thread exists. */
  isCoach?: boolean
  className?: string
  onFeedbackSaved?: () => void
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
        'flex min-w-0 items-start gap-3 bg-muted/45 px-4 py-3.5 text-left transition hover:bg-muted/60 sm:px-5',
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronDown
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
          expanded && 'rotate-180',
        )}
        strokeWidth={1.75}
      />
    </button>
  )
}

/**
 * Race footer: Message coach anytime (prep questions); Feedback after race day
 * (same dual-footer pattern as workout AskCoachSection).
 */
export function RaceAskCoachSection({
  race,
  isCoach = false,
  className,
  onFeedbackSaved,
}: RaceAskCoachSectionProps) {
  const router = useRouter()
  const raceId = race.id
  const canFeedback = athleteCanLeaveRaceFeedback(race, isCoach)
  const initialNotes = race.resultNotes?.trim() || ''

  const [hasCoach, setHasCoach] = useState(false)
  const [thread, setThread] = useState<CoachingThreadView | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [panel, setPanel] = useState<FooterPanel | null>(() =>
    initialNotes && (canFeedback || isCoach) ? 'feedback' : null,
  )
  const [chatBody, setChatBody] = useState('')
  const [feedbackBody, setFeedbackBody] = useState(initialNotes)
  const [committedNotes, setCommittedNotes] = useState(initialNotes)
  const [hasSavedFeedback, setHasSavedFeedback] = useState(Boolean(initialNotes))
  const [editingFeedback, setEditingFeedback] = useState(!initialNotes)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const chatRef = useRef<HTMLTextAreaElement>(null)
  const feedbackRef = useRef<HTMLTextAreaElement>(null)
  const autoExpandedChatRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    const notes = race.resultNotes?.trim() || ''
    const preferFeedback =
      Boolean(notes) && (athleteCanLeaveRaceFeedback(race, isCoach) || isCoach)
    setPanel(preferFeedback ? 'feedback' : null)
    autoExpandedChatRef.current = preferFeedback
    setFeedbackBody(notes)
    setCommittedNotes(notes)
    setHasSavedFeedback(Boolean(notes))
    setEditingFeedback(!notes)
    setFeedbackError(null)
    setChatBody('')

    const load = isCoach
      ? loadRaceCoachingThread(raceId).then((t) => ({ coach: true, t }))
      : Promise.all([checkAthleteHasConnectedCoach(), loadRaceCoachingThread(raceId)]).then(
          ([coach, t]) => ({ coach, t }),
        )

    void load
      .then(({ coach, t }) => {
        if (cancelled) return
        setHasCoach(Boolean(coach))
        setThread(t)
        setLoaded(true)
        if (preferFeedback) return
        if (t && threadHasChatConversation(t.messages)) {
          autoExpandedChatRef.current = true
          setPanel('chat')
        }
      })
      .catch(() => {
        if (cancelled) return
        setHasCoach(false)
        setThread(null)
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
    // Reset chat/feedback state when switching races — not on every notes refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- raceId/isCoach only
  }, [raceId, isCoach])

  useEffect(() => {
    const notes = race.resultNotes?.trim() || ''
    setCommittedNotes(notes)
    setHasSavedFeedback(Boolean(notes))
    if (!editingFeedback) {
      setFeedbackBody(notes)
    }
  }, [race.resultNotes, editingFeedback])

  useEffect(() => {
    if (autoExpandedChatRef.current) return
    if (canFeedback && (hasSavedFeedback || Boolean(race.resultNotes?.trim()))) {
      autoExpandedChatRef.current = true
      return
    }
    if (thread && threadHasChatConversation(thread.messages)) {
      autoExpandedChatRef.current = true
      setPanel('chat')
    }
  }, [thread, canFeedback, hasSavedFeedback, race.resultNotes])

  function reload() {
    void loadRaceCoachingThread(raceId).then((t) => {
      setThread(t)
      // Don't steal focus from Feedback after a send/save.
      if (panel === 'feedback') return
      if (t && threadHasChatConversation(t.messages)) {
        autoExpandedChatRef.current = true
        setPanel('chat')
      }
    })
    router.refresh()
  }

  function toggle(next: FooterPanel) {
    setPanel((prev) => (prev === next ? null : next))
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatBody.trim() || isCoach) return
    const formData = new FormData()
    formData.set('raceId', raceId)
    formData.set('body', chatBody)
    startTransition(async () => {
      await askOrCommentOnRace(formData)
      setChatBody('')
      reload()
    })
  }

  async function persistFeedback() {
    const trimmed = feedbackBody.trim()
    const formData = new FormData()
    formData.set('raceId', raceId)
    formData.set('resultNotes', trimmed)
    await updateRaceFeedback(formData)
    setCommittedNotes(trimmed)
    setHasSavedFeedback(Boolean(trimmed))
    setEditingFeedback(false)
    setFeedbackError(null)
    void loadRaceCoachingThread(raceId).then(setThread)
    onFeedbackSaved?.()
    router.refresh()
  }

  function saveFeedback(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackSaving(true)
    setFeedbackError(null)
    void persistFeedback()
      .catch((err) => {
        setFeedbackError(err instanceof Error ? err.message : 'Could not save feedback')
      })
      .finally(() => setFeedbackSaving(false))
  }

  // Show footer immediately (workout AskCoachSection pattern) — don't wait on network.
  const hasCoachReady = loaded ? hasCoach : !isCoach
  const showChat = isCoach
    ? Boolean(thread)
    : Boolean(thread) || hasCoachReady
  const showFeedback = canFeedback || (isCoach && Boolean(committedNotes))
  if (!showChat && !showFeedback) return null

  const messageCount = thread?.messages.length ?? 0
  const hasConversation = Boolean(thread && threadHasChatConversation(thread.messages))
  const chatTitle = isCoach ? 'Message athlete' : 'Message coach'
  const chatHint = !loaded
    ? 'Loading…'
    : hasConversation
      ? `${messageCount} message${messageCount === 1 ? '' : 's'}`
      : isCoach
        ? 'Race conversation'
        : 'Ask about taper, goal, logistics…'
  const feedbackHint = committedNotes ? 'Feedback saved' : 'How did the race go?'
  const showLockedFeedback =
    showFeedback && hasSavedFeedback && !editingFeedback && !isCoach
  const showCoachFeedbackReadOnly = isCoach && Boolean(committedNotes)
  const splitFooter = showFeedback && showChat

  return (
    <div className={cn('border-t-2 border-border', className)}>
      {splitFooter ? (
        <div className="grid grid-cols-2 divide-x divide-border/60">
          <FooterCell
            icon={<StickyNote className="h-4 w-4" strokeWidth={1.75} />}
            title="Feedback"
            hint={feedbackHint}
            expanded={panel === 'feedback'}
            onClick={() => toggle('feedback')}
          />
          <FooterCell
            icon={<MessageSquare className="h-4 w-4" strokeWidth={1.75} />}
            title={chatTitle}
            hint={chatHint}
            expanded={panel === 'chat'}
            onClick={() => toggle('chat')}
          />
        </div>
      ) : showFeedback ? (
        <FooterCell
          icon={<StickyNote className="h-4 w-4" strokeWidth={1.75} />}
          title="Feedback"
          hint={feedbackHint}
          expanded={panel === 'feedback'}
          onClick={() => toggle('feedback')}
          className="w-full"
        />
      ) : (
        <FooterCell
          icon={<MessageSquare className="h-4 w-4" strokeWidth={1.75} />}
          title={chatTitle}
          hint={chatHint}
          expanded={panel === 'chat'}
          onClick={() => toggle('chat')}
          className="w-full"
        />
      )}

      {showFeedback ? (
        <ExpandShell open={panel === 'feedback'}>
          <div className="space-y-3 border-t border-border/60 bg-background px-4 py-3.5 sm:px-5">
            {showCoachFeedbackReadOnly || showLockedFeedback ? (
              <div className="space-y-3">
                <div className="rounded-[8px] border border-border/60 bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Feedback
                  </p>
                  {committedNotes ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {committedNotes}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No feedback yet.</p>
                  )}
                </div>
                {!isCoach ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setFeedbackBody(committedNotes)
                        setFeedbackError(null)
                        setEditingFeedback(true)
                      }}
                    >
                      Edit feedback
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : !isCoach ? (
              <form onSubmit={saveFeedback} className="space-y-3">
                <Textarea
                  ref={feedbackRef}
                  value={feedbackBody}
                  onChange={(e) => setFeedbackBody(e.target.value)}
                  rows={3}
                  placeholder="How did the race go?"
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
                        onClick={() => {
                          setFeedbackBody(committedNotes)
                          setFeedbackError(null)
                          setEditingFeedback(false)
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button type="submit" size="sm" variant="secondary" disabled={feedbackSaving}>
                      {feedbackSaving ? 'Saving…' : 'Save feedback'}
                    </Button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </ExpandShell>
      ) : null}

      {showChat ? (
        <ExpandShell open={panel === 'chat'}>
          <div className="border-t border-border/60 bg-background px-4 py-3.5 sm:px-5">
            {!loaded ? (
              <CoachingThreadSkeleton compact />
            ) : thread ? (
              <CoachingThreadPanel
                thread={thread}
                role={isCoach ? 'coach' : 'athlete'}
                compact
                onUpdated={reload}
              />
            ) : hasCoach && !isCoach ? (
              <form onSubmit={sendChat} className="space-y-2">
                <FormField label="Question or note for your coach">
                  <Textarea
                    ref={chatRef}
                    value={chatBody}
                    onChange={(e) => setChatBody(e.target.value)}
                    rows={2}
                    placeholder="Ask about taper, goal, logistics…"
                    disabled={isPending}
                  />
                </FormField>
                <div className="flex items-center justify-between gap-2">
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
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
          </div>
        </ExpandShell>
      ) : null}
    </div>
  )
}
