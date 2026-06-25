'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CoachReplyBlock } from '@/components/plan/coach-reply-block'
import { MarkCoachReplyReadOnView } from '@/components/athlete/mark-coach-reply-read-on-view'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ItemActions } from '@/components/ui/item-actions'
import { StructuredWorkoutView } from '@/components/workout-builder/structured-workout-view'
import {
  WORKOUT_STATUS_LABELS,
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { CompletionSourceBadge } from '@/components/history/completion-source-badge'
import { getWorkoutCompletionSource } from '@/lib/workout-history'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn, formatDistance, formatDuration } from '@/lib/utils'
import { saveRecoveryDay } from '@/app/actions/workout-builder'
import { deleteWorkout, updateWorkout } from '@/app/actions/workouts'
import { HomeWorkoutCompleteSection } from '@/components/plan/home-workout-complete-section'
import { parseDateOnly } from '@/lib/dates'

const WORKOUT_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type WorkoutDetailModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function WorkoutDetailModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: WorkoutDetailModalProps) {
  const result = workout.result
  const [logOnlyMode, setLogOnlyMode] = useState(false)
  const athleteLogFlow = !isCoach

  useEffect(() => {
    if (!open) setLogOnlyMode(false)
  }, [open])

  const showWorkoutDetails = isCoach || !logOnlyMode
  const canEditStatus =
    athleteLogFlow &&
    (workout.status === WorkoutStatus.COMPLETED || workout.status === WorkoutStatus.SKIPPED) &&
    !result?.stravaActivityUrl
  const completionSource =
    workout.status === 'COMPLETED' && result
      ? getWorkoutCompletionSource({ selfLogged: workout.selfLogged ?? false, result })
      : null

  if (workout.type === WorkoutType.RECOVERY) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle>Recovery day</DialogTitle>
                <DialogDescription>{formatWorkoutDate(workout.dateKey)}</DialogDescription>
                <div className="mt-2">
                  <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
                    {WORKOUT_TYPE_LABELS[workout.type]}
                  </Badge>
                </div>
              </div>
              {isCoach && (
                <ItemActions
                  deleteAction={deleteWorkout}
                  deleteId={workout.id}
                  deleteIdField="workoutId"
                  deleteConfirmMessage="Remove recovery day from the plan?"
                />
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {workout.coachNotes ? (
              <section className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm">
                <p className="font-semibold text-violet-800 dark:text-violet-300">Coach comment</p>
                <p className="mt-1 text-muted-foreground">{workout.coachNotes}</p>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">No coach comment for this recovery day.</p>
            )}

            {isCoach && (
              <section className="space-y-3 rounded-xl border border-border/60 p-3">
                <p className="text-sm font-semibold">Edit comment</p>
                <form
                  action={async (formData) => {
                    await saveRecoveryDay({
                      date: workout.dateKey,
                      coachNotes: String(formData.get('coachNotes') ?? '').trim() || undefined,
                      workoutId: workout.id,
                    })
                    onOpenChange(false)
                  }}
                  className="space-y-3"
                >
                  <textarea
                    name="coachNotes"
                    defaultValue={workout.coachNotes ?? ''}
                    rows={4}
                    placeholder="Optional guidance for the athlete"
                    className="input-field"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <MarkCoachReplyReadOnView
        workoutId={workout.id}
        shouldMark={
          open && !isCoach && Boolean(result?.coachReply && !result?.coachReplyReadAt)
        }
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle>
                {athleteLogFlow && logOnlyMode
                  ? workout.status === WorkoutStatus.PLANNED
                    ? 'Log workout'
                    : 'Edit workout'
                  : workout.title}
              </DialogTitle>
              <DialogDescription>
                {athleteLogFlow && logOnlyMode
                  ? workout.title
                  : formatWorkoutDate(workout.dateKey)}
              </DialogDescription>
              {showWorkoutDetails && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
                    {WORKOUT_TYPE_LABELS[workout.type]}
                  </Badge>
                  <Badge variant="outline" className="bg-muted/40">
                    {getSessionTypeLabel(workout.sessionType, workout.type)}
                  </Badge>
                  {canEditStatus ? (
                    <button
                      type="button"
                      onClick={() => setLogOnlyMode(true)}
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        'bg-accent text-accent-foreground',
                        'cursor-pointer transition hover:opacity-80',
                      )}
                    >
                      {WORKOUT_STATUS_LABELS[workout.status]}
                    </button>
                  ) : (
                    <Badge className="bg-accent text-accent-foreground">
                      {WORKOUT_STATUS_LABELS[workout.status]}
                    </Badge>
                  )}
                  {completionSource && <CompletionSourceBadge source={completionSource} />}
                </div>
              )}
            </div>
            {isCoach && (
              <ItemActions
                deleteAction={deleteWorkout}
                deleteId={workout.id}
                deleteIdField="workoutId"
                deleteConfirmMessage={`Remove "${workout.title}" from the plan?`}
              />
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {showWorkoutDetails && isCoach && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/workouts/builder/${workout.id}`}>Open in builder</Link>
              </Button>
            </div>
          )}

          {showWorkoutDetails && workout.structure && (
            <section className="space-y-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold">Workout structure</p>
              <StructuredWorkoutView structure={workout.structure} />
            </section>
          )}

          {showWorkoutDetails && isCoach && (
            <section className="space-y-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold">Edit workout</p>
              <form
                action={async (formData) => {
                  await updateWorkout(formData)
                  onOpenChange(false)
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <input type="hidden" name="workoutId" value={workout.id} />
                <label className="block text-sm sm:col-span-2">
                  <span className="text-muted-foreground">Workout name</span>
                  <input
                    name="title"
                    defaultValue={workout.title}
                    required
                    className="input-field mt-1"
                  />
                </label>
                <input
                  name="date"
                  type="date"
                  defaultValue={workout.dateKey}
                  required
                  className="input-field"
                />
                <select name="type" defaultValue={workout.type} required className="input-field">
                  {WORKOUT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {WORKOUT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <input
                  name="plannedDistance"
                  type="number"
                  step="0.1"
                  defaultValue={workout.plannedDistance ?? undefined}
                  placeholder="Distance (km)"
                  className="input-field"
                />
                <input
                  name="plannedDuration"
                  type="number"
                  defaultValue={workout.plannedDuration ?? undefined}
                  placeholder="Duration (min)"
                  className="input-field"
                />
                <textarea
                  name="description"
                  defaultValue={workout.description ?? ''}
                  placeholder="Description"
                  className="input-field sm:col-span-2"
                  rows={2}
                />
                <textarea
                  name="coachNotes"
                  defaultValue={workout.coachNotes ?? ''}
                  placeholder="Coach notes"
                  className="input-field sm:col-span-2"
                  rows={2}
                />
                <Button type="submit" variant="secondary" size="sm" className="w-fit sm:col-span-2">
                  Save changes
                </Button>
              </form>
            </section>
          )}

          {showWorkoutDetails && (
            <section className="space-y-2 rounded-xl border border-border/60 p-3 text-sm">
              <p className="font-semibold">Planned</p>
              {workout.description && <p>{workout.description}</p>}
              <p>
                Target: {formatDistance(workout.plannedDistance)} ·{' '}
                {formatDuration(workout.plannedDuration)}
              </p>
              {workout.coachNotes && (
                <p className="rounded-2xl bg-muted/60 p-3">Coach: {workout.coachNotes}</p>
              )}
            </section>
          )}

          {showWorkoutDetails &&
            (result || workout.status === WorkoutStatus.SKIPPED) && (
            <section className="space-y-3 rounded-xl border border-border/60 p-3 text-sm">
              <p className="font-semibold">
                {workout.status === WorkoutStatus.SKIPPED ? 'Skipped' : 'Completed'}
              </p>
              {workout.status !== WorkoutStatus.SKIPPED && result && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Planned distance</p>
                    <p className="font-medium">{formatDistance(workout.plannedDistance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual distance</p>
                    <p className="font-medium">{formatDistance(result.actualDistance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned duration</p>
                    <p className="font-medium">{formatDuration(workout.plannedDuration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual duration</p>
                    <p className="font-medium">{formatDuration(result.actualDuration)}</p>
                  </div>
                </div>
              )}
              {workout.status !== WorkoutStatus.SKIPPED && result?.rpe != null && (
                <p>RPE: {result.rpe}/10</p>
              )}
              {result?.athleteNotes && (
                <p className="italic">&ldquo;{result.athleteNotes}&rdquo;</p>
              )}
              {result?.coachReply && <CoachReplyBlock reply={result.coachReply} />}
              {result?.stravaActivityUrl && (
                <a
                  href={result.stravaActivityUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-medium text-[#FC4C02] hover:underline"
                >
                  View on Strava
                </a>
              )}
            </section>
          )}

          {!isCoach && (
            <HomeWorkoutCompleteSection
              workout={workout}
              logOnlyMode={logOnlyMode}
              onLogModeChange={setLogOnlyMode}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
