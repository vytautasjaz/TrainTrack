'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { useOptionalShowFeedback } from '@/components/training/show-feedback-context'
import { isWorkoutCardCompleted } from '@/lib/workout-card'
import type { PlanColorMode } from '@/lib/plan-sport-filter'
import {
  parseWorkoutFeeling,
  workoutFeelingTone,
  WORKOUT_FEELING_META_CLASS,
} from '@/lib/workout-feeling'
import { PreserveNewlines } from '@/components/ui/preserve-newlines'
import { cn } from '@/lib/utils'

const FEEDBACK_PREVIEW_LINES = 3
const WEEK_FEEDBACK_PREVIEW_LINES = 2

export type WorkoutFeedbackPreview = {
  feeling: number | null
  notes: string | null
  reply: string | null
}

export function getWorkoutFeedbackPreview(
  workout: PlanWorkoutDetail,
  isCoach: boolean,
): WorkoutFeedbackPreview | null {
  const result = workout.result
  if (!result) return null

  const feeling = parseWorkoutFeeling(result.feeling)
  const notesRaw = result.athleteNotes?.trim() || null
  const notes =
    notesRaw && (!isCoach || !result.athleteNotesPrivate) ? notesRaw : null
  const reply = result.coachReply?.trim() || null

  if (!feeling && !notes && !reply) return null
  return { feeling, notes, reply }
}

function sportAccentVar(type: WorkoutType): string {
  switch (type) {
    case 'BIKE':
      return 'var(--color-sport-bike)'
    case 'SWIM':
      return 'var(--color-sport-swim)'
    case 'STRENGTH':
    case 'RECOVERY':
      return 'var(--color-sport-strength)'
    case 'HYROX':
      return 'var(--color-sport-hyrox)'
    case 'TRIATHLON':
      return 'var(--color-sport-tri)'
    case 'REST':
      return 'var(--color-sport-rest)'
    default:
      return 'var(--color-sport-run)'
  }
}

function FeelingHint({
  feeling,
  className,
}: {
  feeling: number
  className?: string
}) {
  const tone = workoutFeelingTone(feeling)
  return (
    <span
      className={cn(
        'shrink-0 tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]',
        WORKOUT_FEELING_META_CLASS[tone],
        className,
      )}
    >
      {feeling}/10
    </span>
  )
}

export function WorkoutResultFeedbackSummary({
  workout,
  isCoach,
  className,
}: {
  workout: PlanWorkoutDetail
  isCoach: boolean
  className?: string
}) {
  const preview = getWorkoutFeedbackPreview(workout, isCoach)
  if (!preview?.feeling && !preview?.notes) return null

  const showHeader = Boolean(preview.feeling || preview.notes)

  return (
    <section className={cn('px-5 pb-4 pt-1 text-sm', className)}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Feedback
          </p>
          {preview.feeling ? (
            <FeelingHint feeling={preview.feeling} className="text-xs" />
          ) : null}
        </div>
      ) : null}
      {preview.notes ? (
        <p
          className={cn(
            'leading-relaxed whitespace-pre-wrap text-foreground/90',
            showHeader ? 'mt-1.5' : undefined,
          )}
        >
          <PreserveNewlines text={preview.notes} />
        </p>
      ) : null}
    </section>
  )
}

function clampClassForLines(lines: number) {
  return lines <= 2 ? 'line-clamp-2' : 'line-clamp-3'
}

function notesLikelyOverflow(
  text: string | null | undefined,
  lines: number,
  narrow = false,
): boolean {
  const trimmed = text?.trim()
  if (!trimmed) return false
  const nonempty = trimmed.split(/\n/).filter((line) => line.trim().length > 0)
  if (nonempty.length > lines) return true
  // Week columns are narrow (~90–120px) — wrap much earlier than feed.
  const charsPerLine = narrow ? 28 : 42
  return trimmed.length > lines * charsPerLine
}

function useClampedOverflow(
  text: string | null | undefined,
  expanded: boolean,
  lines: number,
  narrow = false,
) {
  const ref = useRef<HTMLParagraphElement>(null)
  /** Sticky while expanded so “Show less” stays available. */
  const [measuredOverflow, setMeasuredOverflow] = useState(false)
  const clampClass = clampClassForLines(lines)
  const heuristic = notesLikelyOverflow(text, lines, narrow)
  const canExpand = heuristic || measuredOverflow

  useEffect(() => {
    setMeasuredOverflow(false)
  }, [text])

  useEffect(() => {
    const trimmed = text?.trim()
    if (!trimmed) {
      setMeasuredOverflow(false)
      return
    }

    // While expanded, keep the control — don’t re-measure as “fits”.
    if (expanded) return

    const el = ref.current
    if (!el) return

    const check = () => {
      // While clamped: scrollHeight is full content, clientHeight is visible.
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
  }, [text, expanded, lines, clampClass])

  return { ref, canExpand, clampClass }
}

type WorkoutInlineFeedbackProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  /** Week grid cards — note only, no header. */
  weekView?: boolean
  /** Training list rows — roomier type + header. */
  listView?: boolean
  onOpenWorkout?: () => void
  className?: string
  /** Full-width card section separated by a top rule (not a nested box). */
  section?: boolean
}

export function WorkoutInlineFeedback({
  workout,
  isCoach,
  compact = false,
  weekView = false,
  listView = false,
  onOpenWorkout,
  className,
  section = true,
}: WorkoutInlineFeedbackProps) {
  const feedbackCtx = useOptionalShowFeedback()
  const filter = useOptionalPlanSportFilter()
  const colorMode: PlanColorMode = filter?.colorMode ?? 'sport'
  const showCompletionLayer = filter?.showCompletionLayer ?? true
  const [expanded, setExpanded] = useState(false)

  const preview = useMemo(
    () => getWorkoutFeedbackPreview(workout, isCoach),
    [workout, isCoach],
  )

  useEffect(() => {
    setExpanded(false)
  }, [workout.id])

  const previewLines = weekView ? WEEK_FEEDBACK_PREVIEW_LINES : FEEDBACK_PREVIEW_LINES
  const notesOverflow = useClampedOverflow(
    preview?.notes,
    expanded,
    previewLines,
    weekView,
  )
  const replyOverflow = useClampedOverflow(
    preview?.reply,
    expanded,
    previewLines,
    weekView,
  )

  if (!feedbackCtx?.showFeedback || !preview) return null

  const completed = isWorkoutCardCompleted(workout.status)
  const canExpand = notesOverflow.canExpand || replyOverflow.canExpand
  const clampClass = notesOverflow.clampClass
  const bodyTextClass = listView
    ? 'whitespace-pre-wrap text-xs font-normal leading-snug tracking-[0.004em] text-[var(--tt-ink-soft,#6b6b6b)]'
    : weekView
      ? 'whitespace-pre-wrap text-xs leading-snug text-foreground/90'
      : 'whitespace-pre-wrap text-[10px] leading-snug text-foreground/90'

  const tintStyle =
    colorMode === 'sport'
      ? ({
          '--tt-sport-color': sportAccentVar(workout.type),
        } as CSSProperties)
      : undefined

  const weekNoteOnly =
    weekView && preview.notes && !preview.feeling && !preview.reply

  return (
    <div
      className={cn(
        listView ? 'space-y-0.5' : 'space-y-1',
        section
          ? cn(
              'tt-workout-feedback-section border-t pt-1.5',
              compact ? 'mt-1' : 'mt-1.5',
            )
          : 'mt-1',
        className,
      )}
      data-feedback-tint={
        showCompletionLayer ? 'completion' : colorMode
      }
      data-card-status={completed ? 'completed' : 'planned'}
      style={tintStyle}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {listView ? (
        <>
          {preview.notes || preview.feeling ? (
            <p
              ref={preview.notes ? notesOverflow.ref : undefined}
              className={cn(bodyTextClass, !expanded && preview.notes && clampClass)}
            >
              {preview.feeling ? (
                <FeelingHint feeling={preview.feeling} className="text-xs" />
              ) : null}
              {preview.feeling && preview.notes ? ' · ' : null}
              {preview.notes ? (
                <span className="font-normal">
                  <PreserveNewlines text={preview.notes} />
                </span>
              ) : null}
            </p>
          ) : null}
          {preview.reply ? (
            <p
              ref={replyOverflow.ref}
              className={cn(bodyTextClass, !expanded && clampClass)}
            >
              <span className="font-semibold text-[var(--tt-ink,#111)]">Coach</span>
              {' · '}
              <span className="font-normal">
                <PreserveNewlines text={preview.reply} />
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          {preview.notes ? (
            <p
              ref={notesOverflow.ref}
              className={cn(bodyTextClass, !expanded && clampClass)}
            >
              <PreserveNewlines text={preview.notes} />
            </p>
          ) : weekView && preview.feeling && !preview.notes ? (
            <FeelingHint feeling={preview.feeling} className="text-xs" />
          ) : null}

          {preview.reply ? (
            <div className={preview.notes || weekNoteOnly ? 'pt-0.5' : undefined}>
              <p
                ref={replyOverflow.ref}
                className={cn(
                  bodyTextClass,
                  'text-[var(--tt-ink-soft,#6b6b6b)]',
                  !expanded && clampClass,
                )}
              >
                <span className="text-[var(--tt-ink-faint,#9a9a9a)]">Coach · </span>
                <PreserveNewlines text={preview.reply} />
              </p>
            </div>
          ) : null}
        </>
      )}

      {canExpand ? (
        <button
          type="button"
          className={cn(
            'font-semibold text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink)]',
            weekView || listView ? 'text-[11px]' : 'text-[10px]',
          )}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}
