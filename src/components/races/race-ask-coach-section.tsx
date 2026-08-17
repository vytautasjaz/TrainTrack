'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
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
import { EmojiPickerButton, insertEmojiAtCursor } from '@/components/inbox/emoji-picker-button'

type RaceAskCoachSectionProps = {
  raceId: string
  /** Compact embed under race cards */
  className?: string
}

export function RaceAskCoachSection({ raceId, className }: RaceAskCoachSectionProps) {
  const router = useRouter()
  const [hasCoach, setHasCoach] = useState(false)
  const [thread, setThread] = useState<CoachingThreadView | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    void Promise.all([checkAthleteHasConnectedCoach(), loadRaceCoachingThread(raceId)])
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
  }, [raceId])

  if (!loaded) return null
  if (!hasCoach && !thread) return null

  function reload() {
    void loadRaceCoachingThread(raceId).then(setThread)
    router.refresh()
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    const formData = new FormData()
    formData.set('raceId', raceId)
    formData.set('body', body)
    startTransition(async () => {
      await askOrCommentOnRace(formData)
      setBody('')
      reload()
    })
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        Ask coach about this race
      </div>
      {thread ? (
        <CoachingThreadPanel thread={thread} role="athlete" compact onUpdated={reload} />
      ) : hasCoach ? (
        <form onSubmit={send} className="space-y-2">
          <FormField label="Question or note for your coach">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Ask about taper, goal, logistics…"
              disabled={isPending}
            />
          </FormField>
          <div className="flex items-center justify-between gap-2">
            <EmojiPickerButton
              disabled={isPending}
              onSelect={(emoji) =>
                setBody((prev) => insertEmojiAtCursor(textareaRef.current, prev, emoji))
              }
            />
            <Button type="submit" size="sm" variant="secondary" disabled={isPending || !body.trim()}>
              {isPending ? 'Sending…' : 'Send to coach'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
