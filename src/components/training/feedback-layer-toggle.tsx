'use client'

import { MessageSquare } from 'lucide-react'
import { ToolbarTextToggle } from '@/components/training/plan-sport-filter-bar'
import { useShowFeedback } from '@/components/training/show-feedback-context'

export function FeedbackLayerToggle() {
  const { showFeedback, toggleShowFeedback } = useShowFeedback()

  return (
    <ToolbarTextToggle
      pressed={showFeedback}
      onClick={toggleShowFeedback}
      title={
        showFeedback
          ? 'Hide workout feedback on cards'
          : 'Show workout feedback on cards'
      }
    >
      <MessageSquare className="h-3 w-3" aria-hidden />
      Feedback
    </ToolbarTextToggle>
  )
}
