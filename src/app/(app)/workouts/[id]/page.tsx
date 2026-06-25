import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { ItemActions } from '@/components/ui/item-actions'
import {
  WORKOUT_STATUS_LABELS,
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
  WorkoutType,
} from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'
import { StructuredWorkoutView } from '@/components/workout-builder/structured-workout-view'
import { CoachReplyBlock } from '@/components/plan/coach-reply-block'
import { MarkCoachReplyReadOnView } from '@/components/athlete/mark-coach-reply-read-on-view'
import { parseStructure } from '@/lib/workout-builder/utils'
import { completeWorkout, deleteWorkout, updateWorkout } from '@/app/actions/workouts'
import { WorkoutStatus } from '@prisma/client'

const WORKOUT_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type WorkoutDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const { id } = await params
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: { result: true, athlete: true, template: true },
  })

  if (!workout) notFound()

  const result = workout.result
  const isCoach = session.role === 'COACH'
  const dateValue = workout.date.toISOString().slice(0, 10)
  const structure = parseStructure(workout.structure)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {session.role === 'ATHLETE' && result?.coachReply && !result.coachReplyReadAt && (
        <MarkCoachReplyReadOnView workoutId={workout.id} shouldMark />
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackButton variant="link" fallbackHref="/training" />
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{workout.title}</h1>
          <p className="text-sm text-muted-foreground">
            {workout.date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
              {WORKOUT_TYPE_LABELS[workout.type]}
            </Badge>
            <Badge className="bg-accent text-accent-foreground">
              {WORKOUT_STATUS_LABELS[workout.status]}
            </Badge>
          </div>
        </div>
        {isCoach && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/workouts/builder/${workout.id}`}>Open in builder</Link>
            </Button>
            <ItemActions
              deleteAction={deleteWorkout}
              deleteId={workout.id}
              deleteIdField="workoutId"
              deleteConfirmMessage={`Remove "${workout.title}" from the plan?`}
            />
          </div>
        )}
      </div>

      {structure && (structure.warmup.length > 0 || structure.mainSet.length > 0 || structure.cooldown.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Workout structure</CardTitle>
          </CardHeader>
          <CardContent>
            <StructuredWorkoutView structure={structure} />
          </CardContent>
        </Card>
      )}

      {isCoach && (
        <Card>
          <CardHeader>
            <CardTitle>Edit workout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWorkout} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="workoutId" value={workout.id} />
              <input name="title" defaultValue={workout.title} required className="input-field sm:col-span-2" />
              <input name="date" type="date" defaultValue={dateValue} required className="input-field" />
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
              <Button type="submit" variant="secondary" size="sm" className="sm:col-span-2 w-fit">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Planned</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {workout.description && <p>{workout.description}</p>}
          <p>
            Target: {formatDistance(workout.plannedDistance)} ·{' '}
            {formatDuration(workout.plannedDuration)}
          </p>
          {workout.coachNotes && (
            <p className="rounded-2xl bg-muted/60 p-3 text-sm">Coach: {workout.coachNotes}</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
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
            {result.rpe != null && <p>RPE: {result.rpe}/10</p>}
            {result.athleteNotes && <p className="italic">&ldquo;{result.athleteNotes}&rdquo;</p>}
            {result.coachReply && <CoachReplyBlock reply={result.coachReply} />}
          </CardContent>
        </Card>
      )}

      {session.role === 'ATHLETE' && (
        <Card>
          <CardHeader>
            <CardTitle>Log workout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={completeWorkout} className="space-y-3">
              <input type="hidden" name="workoutId" value={workout.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Actual distance (km)</span>
                  <input
                    name="actualDistance"
                    type="number"
                    step="0.1"
                    defaultValue={result?.actualDistance ?? workout.plannedDistance ?? undefined}
                    className="input-field mt-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Actual duration (min)</span>
                  <input
                    name="actualDuration"
                    type="number"
                    defaultValue={result?.actualDuration ?? workout.plannedDuration ?? undefined}
                    className="input-field mt-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">RPE (1–10)</span>
                  <input
                    name="rpe"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={result?.rpe ?? 6}
                    className="input-field mt-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <select
                    name="status"
                    defaultValue={workout.status}
                    className="input-field mt-1"
                  >
                    <option value={WorkoutStatus.COMPLETED}>Completed</option>
                    <option value={WorkoutStatus.SKIPPED}>Skipped</option>
                    <option value={WorkoutStatus.PLANNED}>Planned</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-muted-foreground">Notes</span>
                <textarea
                  name="athleteNotes"
                  defaultValue={result?.athleteNotes ?? ''}
                  rows={3}
                  placeholder="How did it feel?"
                  className="input-field mt-1"
                />
              </label>
              <Button type="submit" variant="secondary" size="sm">
                Save feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
