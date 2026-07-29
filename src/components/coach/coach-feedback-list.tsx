'use client'

import { useState, useTransition } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { dismissAthleteFeedback, replyToAthleteFeedback } from '@/app/actions/feedback'
import {
  WorkoutFeedbackContextCard,
  type WorkoutFeedbackContext,
} from '@/components/plan/workout-feedback-context'

export type CoachFeedbackItem = {
  id: string
  athleteNotes: string
  completedAt: string
  workout: WorkoutFeedbackContext & {
    athlete: { name: string }
  }
}

export function CoachFeedbackList({ feedback }: { feedback: CoachFeedbackItem[] }) {
  if (feedback.length === 0) {
    return <p className="text-sm text-muted-foreground">No new feedback.</p>
  }

  return (
    <div className="space-y-3">
      {feedback.map((item) => (
        <CoachFeedbackCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function CoachFeedbackCard({ item }: { item: CoachFeedbackItem }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [isDismissing, startDismiss] = useTransition()
  const [isReplying, startReply] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDismiss() {
    const formData = new FormData()
    formData.set('resultId', item.id)
    startDismiss(async () => {
      await dismissAthleteFeedback(formData)
    })
  }

  function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('resultId', item.id)
    startReply(async () => {
      try {
        await replyToAthleteFeedback(formData)
        setReplyOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send reply.')
      }
    })
  }

  return (
    <>
      <div className="rounded-2xl bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <WorkoutFeedbackContextCard
              workout={item.workout}
              athleteName={item.workout.athlete.name}
              completedAt={item.completedAt}
              variant="feedback"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge className="bg-brand-soft text-brand">New</Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={isDismissing}
              onClick={handleDismiss}
              aria-label="Dismiss feedback"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">&ldquo;{item.athleteNotes}&rdquo;</p>
        <div className="mt-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplyOpen(true)}>
            <MessageSquare className="h-3.5 w-3.5" />
            Reply
          </Button>
        </div>
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to {item.workout.athlete.name}</DialogTitle>
            <DialogDescription>
              Your reply will appear on the workout. The feedback will be marked as handled.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReply} className="space-y-3">
            <WorkoutFeedbackContextCard
              workout={item.workout}
              athleteName={item.workout.athlete.name}
              completedAt={item.completedAt}
              variant="feedback"
            />
            <blockquote className="rounded-xl bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
              &ldquo;{item.athleteNotes}&rdquo;
            </blockquote>
            <FormField label="Your reply">
              <Textarea
                name="coachReply"
                required
                rows={4}
                autoFocus
                placeholder="Write a response…"
              />
            </FormField>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setReplyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" size="sm" disabled={isReplying}>
                {isReplying ? 'Sending…' : 'Send reply'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
