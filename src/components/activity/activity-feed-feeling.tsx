'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { PreserveNewlines } from '@/components/ui/preserve-newlines'
import {
  workoutFeelingLabel,
  workoutFeelingTone,
  WORKOUT_FEELING_META_CLASS,
} from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'

const FEED_NOTES_PREVIEW_LINES = 3

function notesLikelyOverflow(text: string): boolean {
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0)
  if (lines.length > FEED_NOTES_PREVIEW_LINES) return true
  // Long single paragraphs also need a clamp in the narrow feed column.
  return text.length > FEED_NOTES_PREVIEW_LINES * 42
}

export function ActivityFeedNotes({ text }: { text: string }) {
  const trimmed = text.trim()
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [measuredOverflow, setMeasuredOverflow] = useState(false)
  const heuristicOverflow = notesLikelyOverflow(trimmed)
  const canExpand = heuristicOverflow || measuredOverflow

  useEffect(() => {
    setExpanded(false)
    setMeasuredOverflow(false)
  }, [trimmed])

  useEffect(() => {
    if (!trimmed || expanded) return

    const el = ref.current
    if (!el) return

    const check = () => {
      setMeasuredOverflow(el.scrollHeight > el.clientHeight + 1)
    }

    check()
    const raf = requestAnimationFrame(check)
    const t = window.setTimeout(check, 50)
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      observer.disconnect()
    }
  }, [trimmed, expanded])

  if (!trimmed) return null

  return (
    <div className="space-y-1">
      <p
        ref={ref}
        className={cn(
          'text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)] md:text-[13px]',
          !expanded && 'line-clamp-3',
        )}
      >
        <PreserveNewlines text={trimmed} />
      </p>
      {canExpand ? (
        <button
          type="button"
          className="text-[11px] font-semibold text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink)]"
          onClick={(event) => {
            event.stopPropagation()
            setExpanded((value) => !value)
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
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
      <div className="space-y-1.5">
        <ActivityFeedFeedbackLabel skipped />
        <ActivityFeedNotes text={trimmed} />
      </div>
    )
  }

  if (!trimmed && feeling == null) return null

  return (
    <div className="space-y-1.5">
      <ActivityFeedFeedbackLabel feeling={feeling} />
      {trimmed ? <ActivityFeedNotes text={trimmed} /> : null}
    </div>
  )
}
