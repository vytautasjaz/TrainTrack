'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateAthleteWorkoutComment } from '@/app/actions/workouts'
import { athleteCanLeaveWorkoutComment } from '@/lib/plan-workout'
import type { CoachHomeWorkoutActivityRow } from '@/lib/coach-home'
import {
  parseWorkoutFeeling,
  workoutFeelingLabel,
  workoutFeelingTone,
  WORKOUT_FEELING_MAX,
  WORKOUT_FEELING_MIN,
  WORKOUT_FEELING_SWATCH_CLASS,
} from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'

const FEELING_VALUES = Array.from(
  { length: WORKOUT_FEELING_MAX - WORKOUT_FEELING_MIN + 1 },
  (_, i) => i + WORKOUT_FEELING_MIN,
)

type ActivityFeedInlineFeedbackProps = {
  row: CoachHomeWorkoutActivityRow
  skipped?: boolean
}

export function ActivityFeedInlineFeedback({ row, skipped = false }: ActivityFeedInlineFeedbackProps) {
  const workout = row.workout
  const router = useRouter()
  const canFeedback = athleteCanLeaveWorkoutComment(workout, false)
  const initialNotes = row.feedbackNotes?.trim() || ''
  const initialFeeling =
    row.feedbackFeeling ?? parseWorkoutFeeling(workout.result?.feeling) ?? null

  const [notes, setNotes] = useState(initialNotes)
  const [feeling, setFeeling] = useState<number | null>(initialFeeling)
  const [committedNotes, setCommittedNotes] = useState(initialNotes)
  const [committedFeeling, setCommittedFeeling] = useState<number | null>(initialFeeling)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty =
    notes.trim() !== committedNotes || feeling !== committedFeeling

  if (!canFeedback) return null

  function saveFeedback() {
    if (!dirty && !isPending) return
    setError(null)
    const trimmed = notes.trim()
    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('athleteNotes', trimmed)
    if (feeling != null) formData.set('feeling', String(feeling))

    startTransition(async () => {
      try {
        await updateAthleteWorkoutComment(formData)
        setCommittedNotes(trimmed)
        setCommittedFeeling(feeling)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save feedback')
      }
    })
  }

  return (
    <div
      className="space-y-1"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
        <MessageSquare className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        {skipped ? 'Reason' : 'Feedback'}
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder={skipped ? 'Why did you skip?' : 'How did it go?'}
        disabled={isPending}
        className={cn(
          'min-h-[4.5rem] w-full resize-none rounded-[6px] border border-[var(--tt-line)] bg-white px-2.5 py-2',
          'text-[12px] leading-snug text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-faint)]',
          'outline-none focus:border-[var(--tt-ink-soft)] focus:ring-1 focus:ring-[var(--tt-line-strong,#ddd)]',
        )}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            saveFeedback()
          }
        }}
      />
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      {!skipped ? (
        <div className="space-y-1 pt-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            How did you feel
          </p>
          <div
            className="grid grid-cols-10 gap-0.5"
            role="group"
            aria-label="How did you feel"
          >
            {FEELING_VALUES.map((value) => {
              const selected = feeling === value
              const tone = workoutFeelingTone(value)
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isPending}
                  aria-pressed={selected}
                  aria-label={`${value} of 10, ${workoutFeelingLabel(value)}`}
                  onClick={() => setFeeling(selected ? null : value)}
                  className={cn(
                    'flex h-6 min-w-0 items-center justify-center rounded-[5px] border text-[11px] font-semibold tabular-nums transition',
                    selected
                      ? WORKOUT_FEELING_SWATCH_CLASS[tone]
                      : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] hover:border-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]',
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="flex justify-end pt-0.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending || !dirty}
          onClick={saveFeedback}
          className="h-7 px-3 text-[11px]"
        >
          {isPending ? 'Saving…' : 'Save feedback'}
        </Button>
      </div>
    </div>
  )
}
