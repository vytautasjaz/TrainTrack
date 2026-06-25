'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markCoachReplyRead } from '@/app/actions/feedback'
import {
  WorkoutFeedbackContextCard,
  type WorkoutFeedbackContext,
} from '@/components/plan/workout-feedback-context'

export type AthleteCoachReplyItem = {
  id: string
  coachReply: string
  coachRepliedAt: string
  athleteNotes: string | null
  workout: WorkoutFeedbackContext
}

export function AthleteCoachReplyList({ replies }: { replies: AthleteCoachReplyItem[] }) {
  if (replies.length === 0) {
    return <p className="text-sm text-muted-foreground">No new replies from your coach.</p>
  }

  return (
    <div className="space-y-3">
      {replies.map((item) => (
        <AthleteCoachReplyCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function AthleteCoachReplyCard({ item }: { item: AthleteCoachReplyItem }) {
  const [isDismissing, startDismiss] = useTransition()

  function handleDismiss() {
    const formData = new FormData()
    formData.set('resultId', item.id)
    startDismiss(async () => {
      await markCoachReplyRead(formData)
    })
  }

  return (
    <div className="rounded-2xl bg-brand-soft/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <WorkoutFeedbackContextCard
            workout={item.workout}
            repliedAt={item.coachRepliedAt}
            variant="reply"
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
            aria-label="Dismiss reply"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {item.athleteNotes && (
        <p className="mt-3 text-xs italic text-muted-foreground">
          Your note: &ldquo;{item.athleteNotes}&rdquo;
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed">&ldquo;{item.coachReply}&rdquo;</p>
    </div>
  )
}
