import { MessageSquare } from 'lucide-react'
import {
  workoutFeelingLabel,
  workoutFeelingTone,
  WORKOUT_FEELING_META_CLASS,
} from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'

function ActivityFeedNotes({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  return (
    <div className="space-y-1">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)] md:text-[13px]"
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export function ActivityFeedFeedbackLabel({
  skipped = false,
  feeling,
}: {
  skipped?: boolean
  feeling?: number | null
}) {
  const tone = feeling != null ? workoutFeelingTone(feeling) : null
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] md:text-[13px]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--tt-ink)]">
        <MessageSquare
          className="h-3.5 w-3.5 text-[var(--tt-ink-soft,#6b6b6b)]"
          strokeWidth={1.75}
          aria-hidden
        />
        {skipped ? 'Reason' : 'Feedback'}
      </span>
      {!skipped && feeling != null && tone ? (
        <span
          className={cn(
            'font-semibold tabular-nums',
            WORKOUT_FEELING_META_CLASS[tone],
          )}
        >
          {feeling}/10 · {workoutFeelingLabel(feeling)}
        </span>
      ) : null}
    </p>
  )
}

export function ActivityFeedFeedbackReadout({
  notes,
  feeling,
  skipped = false,
}: {
  notes: string | null
  feeling: number | null
  skipped?: boolean
}) {
  const trimmed = notes?.trim() || ''
  if (skipped) {
    if (!trimmed) return null
    return (
      <div className="space-y-1.5 rounded-[8px] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgb(0_0_0_/0.06),0_1px_2px_rgb(0_0_0_/0.04)]">
        <ActivityFeedFeedbackLabel skipped />
        <ActivityFeedNotes text={trimmed} />
      </div>
    )
  }

  if (!trimmed && feeling == null) return null

  return (
    <div className="space-y-1.5 rounded-[8px] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgb(0_0_0_/0.06),0_1px_2px_rgb(0_0_0_/0.04)]">
      <ActivityFeedFeedbackLabel feeling={feeling} />
      {trimmed ? <ActivityFeedNotes text={trimmed} /> : null}
    </div>
  )
}
