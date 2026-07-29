'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AthleteLogTypeValues } from '@/lib/athlete-log-type'
import type { AthleteLogType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AthleteLogStatusPicker } from '@/components/plan/athlete-log-status-picker'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { resolveAthleteLogType } from '@/lib/plan-workout'
import {
  completeWorkout,
  rescheduleWorkout,
  unlogWorkout,
  updateStravaWorkoutComment,
} from '@/app/actions/workouts'
import {
  StravaDetachButton,
  StravaLinkPicker,
} from '@/components/plan/strava-activity-picker'

type HomeWorkoutCompleteSectionProps = {
  workout: PlanWorkoutDetail
  onClose: () => void
}

function AdjustedWorkoutFields({ workout }: { workout: PlanWorkoutDetail }) {
  const result = workout.result

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Distance (km)">
          <Input
            name="actualDistance"
            type="number"
            step="0.1"
            defaultValue={result?.actualDistance ?? workout.plannedDistance ?? undefined}
            placeholder={workout.plannedDistance != null ? String(workout.plannedDistance) : undefined}
          />
        </FormField>
        <FormField label="Duration (min)">
          <Input
            name="actualDuration"
            type="number"
            defaultValue={result?.actualDuration ?? workout.plannedDuration ?? undefined}
            placeholder={workout.plannedDuration != null ? String(workout.plannedDuration) : undefined}
          />
        </FormField>
      </div>
      <FormField label="Date">
        <Input name="rescheduledDate" type="date" defaultValue={workout.dateKey} required />
      </FormField>
    </>
  )
}

function LogWorkoutForm({
  workout,
  logType,
  onClose,
}: {
  workout: PlanWorkoutDetail
  logType: typeof AthleteLogTypeValues[keyof typeof AthleteLogTypeValues]
  onClose: () => void
}) {
  const [isSaving, startSave] = useTransition()
  const router = useRouter()
  const skipped = logType === AthleteLogTypeValues.SKIPPED
  const adjusted = logType === AthleteLogTypeValues.ADJUSTED

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('workoutId', workout.id)
    formData.set('logType', logType)

    const rescheduledDate = (formData.get('rescheduledDate') as string | null)?.trim()
    const dateChanged = adjusted && Boolean(rescheduledDate && rescheduledDate !== workout.dateKey)

    startSave(async () => {
      if (dateChanged) {
        await rescheduleWorkout(formData)
      } else {
        await completeWorkout(formData)
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <form key={logType} onSubmit={handleSaveDetails} className="space-y-4 border-t border-border/50 pb-4 pt-4">
      {skipped ? (
        <FormField label="Comment for coach">
          <Textarea
            name="athleteNotes"
            defaultValue={workout.result?.athleteNotes ?? ''}
            rows={3}
            placeholder="Why are you skipping this workout?"
          />
        </FormField>
      ) : adjusted ? (
        <>
          <Caption>
            Update distance or duration, or pick a new date to move this workout.
          </Caption>
          <AdjustedWorkoutFields workout={workout} />
          <FormField label="Comment for coach">
            <Textarea
              name="athleteNotes"
              defaultValue={workout.result?.athleteNotes ?? ''}
              rows={3}
              placeholder="What did you change?"
            />
          </FormField>
        </>
      ) : (
        <FormField label="Comments">
          <Textarea
            name="athleteNotes"
            defaultValue={workout.result?.athleteNotes ?? ''}
            rows={3}
            placeholder="How did it feel?"
          />
        </FormField>
      )}
      <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
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

      <div className="border-t border-border/40 pt-3">
        <StravaDetachButton workoutId={workout.id} onDetached={onClose} />
      </div>
    </form>
  )
}

export function HomeWorkoutCompleteSection({ workout, onClose }: HomeWorkoutCompleteSectionProps) {
  const router = useRouter()
  const stravaUrl = workout.result?.stravaActivityUrl ?? null
  const stravaLocked = Boolean(stravaUrl)
  const savedLogType = resolveAthleteLogType(workout)

  const [selectedLogType, setSelectedLogType] = useState<AthleteLogType | null>(savedLogType)
  const [showForm, setShowForm] = useState(savedLogType !== null)
  const [isUnlogging, startUnlog] = useTransition()

  useEffect(() => {
    const saved = resolveAthleteLogType(workout)
    setSelectedLogType(saved)
    setShowForm(saved !== null)
  }, [workout.id, workout.status, workout.result?.logType, workout.rescheduledFromDateKey])

  function handleSelect(type: AthleteLogType) {
    if (selectedLogType === type) {
      const shouldUnlog = savedLogType === type && !stravaLocked
      setSelectedLogType(null)
      setShowForm(false)
      if (shouldUnlog) {
        const formData = new FormData()
        formData.set('workoutId', workout.id)
        startUnlog(async () => {
          await unlogWorkout(formData)
          router.refresh()
        })
      }
      return
    }

    setSelectedLogType(type)
    setShowForm(true)
  }

  return (
    <div className="shrink-0 border-t border-border/50 bg-card pt-2">
      <AthleteLogStatusPicker
        value={selectedLogType}
        onChange={handleSelect}
        disabled={stravaLocked || isUnlogging}
        stravaUrl={stravaUrl}
      />

      {stravaLocked ? <StravaCommentForm workout={workout} onClose={onClose} /> : null}

      {!stravaLocked ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-0 pb-2 pt-3">
          <StravaLinkPicker
            workoutId={workout.id}
            onLinked={() => {
              router.refresh()
              onClose()
            }}
          />
        </div>
      ) : null}

      {showForm && selectedLogType && !stravaLocked ? (
        <LogWorkoutForm workout={workout} logType={selectedLogType} onClose={onClose} />
      ) : null}
    </div>
  )
}
