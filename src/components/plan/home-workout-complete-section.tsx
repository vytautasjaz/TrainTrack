'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { updateStravaWorkoutComment } from '@/app/actions/workouts'

type HomeWorkoutCompleteSectionProps = {
  workout: PlanWorkoutDetail
  onClose: () => void
}

function StravaCommentForm({
  workout,
  onClose,
}: {
  workout: PlanWorkoutDetail
  onClose: () => void
}) {
  const router = useRouter()
  const [isSaving, startSave] = useTransition()
  const stravaDescription = workout.result?.stravaActivityDescription?.trim() || ''
  const savedNotes = workout.result?.athleteNotes?.trim() || ''
  const [notes, setNotes] = useState(savedNotes)

  useEffect(() => {
    setNotes(workout.result?.athleteNotes?.trim() || '')
  }, [workout.id, workout.result?.athleteNotes])

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('workoutId', workout.id)
    formData.set('athleteNotes', notes)
    startSave(async () => {
      await updateStravaWorkoutComment(formData)
      router.refresh()
      onClose()
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 border-t border-border/50 pb-4 pt-4">
      <FormField label="Comment for coach (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Write your own comment, or leave empty"
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : notes.trim() ? 'Share comment' : 'Clear comment'}
        </Button>
        {savedNotes && notes.trim() !== savedNotes ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => setNotes(savedNotes)}
          >
            Reset
          </Button>
        ) : null}
        {stravaDescription && notes !== stravaDescription ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => setNotes(stravaDescription)}
          >
            Use Strava description
          </Button>
        ) : null}
      </div>
    </form>
  )
}

/** Athlete footer: Strava comment only (status logging moved off this surface). */
export function HomeWorkoutCompleteSection({ workout, onClose }: HomeWorkoutCompleteSectionProps) {
  const stravaLocked = Boolean(workout.result?.stravaActivityUrl)
  if (!stravaLocked) return null

  return (
    <div className="shrink-0 border-t border-border/50 bg-card pt-2">
      <StravaCommentForm workout={workout} onClose={onClose} />
    </div>
  )
}
