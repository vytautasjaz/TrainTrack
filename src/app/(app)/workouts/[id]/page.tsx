import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession, isCoachView} from '@/lib/session'
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
import { IncludeItemsSummary } from '@/components/workout-editor/include-items-summary'
import { CoachReplyBlock } from '@/components/plan/coach-reply-block'
import { MarkCoachReplyReadOnView } from '@/components/athlete/mark-coach-reply-read-on-view'
import { parseStructure } from '@/lib/workout-builder/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import { completeWorkout, deleteWorkout, updateWorkout } from '@/app/actions/workouts'
import { WORKOUT_PLAN_INCLUDE } from '@/lib/queries'
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
    include: { ...WORKOUT_PLAN_INCLUDE, athlete: true, template: true },
  })

  if (!workout) notFound()

  const result = workout.result
  const coachView = isCoachView(session)
  const visibleCoachNotes =
    coachView || !workout.coachNotesPrivate ? workout.coachNotes : null
  const visibleAthleteNotes =
    !coachView || !result?.athleteNotesPrivate ? result?.athleteNotes : null
  const dateValue = workout.date.toISOString().slice(0, 10)
  const structure = parseStructure(workout.structure)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {session.hasAthlete && result?.coachReply && !result.coachReplyReadAt && (
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
        {coachView && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/workouts/builder/${workout.id}`}>Open in builder</Link>
            </Button>
            <ItemActions
              deleteAction={deleteWorkout}
              deleteId={workout.id}
              deleteIdField="workoutId"
              deleteConfirmTitle="Remove workout?"
              deleteConfirmMessage={`“${workout.title}” will be removed from the plan.`}
              redirectTo="/training"
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

      {structure.includeItems && structure.includeItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Include</CardTitle>
          </CardHeader>
          <CardContent>
            <IncludeItemsSummary items={structure.includeItems} />
          </CardContent>
        </Card>
      ) : null}

      {coachView && (
        <Card>
          <CardHeader>
            <CardTitle>Edit workout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWorkout} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="workoutId" value={workout.id} />
              <Input name="title" defaultValue={workout.title} required className="sm:col-span-2" />
              <Input name="date" type="date" defaultValue={dateValue} required />
              <Select name="type" defaultValue={workout.type} required>
                {WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORKOUT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
              <Input
                name="plannedDistance"
                type="number"
                step="0.1"
                defaultValue={workout.plannedDistance ?? undefined}
                placeholder="Distance (km)"
              />
              <Input
                name="plannedDuration"
                type="number"
                defaultValue={workout.plannedDuration ?? undefined}
                placeholder="Duration (min)"
              />
              <Textarea
                name="description"
                defaultValue={workout.description ?? ''}
                placeholder="Description"
                className="sm:col-span-2"
                rows={2}
              />
              <Textarea
                name="coachNotes"
                defaultValue={workout.coachNotes ?? ''}
                placeholder="Coach notes"
                className="sm:col-span-2"
                rows={2}
              />
              <PrivateNoteToggle
                hideFrom="athlete"
                name="coachNotesPrivate"
                defaultChecked={workout.coachNotesPrivate}
                className="sm:col-span-2"
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
          {visibleCoachNotes && (
            <p className="rounded-2xl bg-muted/60 p-3 text-sm">
              Coach: {visibleCoachNotes}
              {coachView && workout.coachNotesPrivate ? (
                <span className="ml-2 text-xs text-muted-foreground">(private)</span>
              ) : null}
            </p>
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
            {visibleAthleteNotes && (
              <p className="italic">
                &ldquo;{visibleAthleteNotes}&rdquo;
                {!coachView && result?.athleteNotesPrivate ? (
                  <span className="ml-2 not-italic text-xs text-muted-foreground">
                    (private)
                  </span>
                ) : null}
              </p>
            )}
            {result.coachReply && <CoachReplyBlock reply={result.coachReply} />}
          </CardContent>
        </Card>
      )}

      {result?.stravaActivityUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Strava activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {session.hasAthlete
                ? 'Stats were imported from Strava and can\'t be edited here.'
                : 'This workout was completed via Strava.'}
            </p>
            <Button variant="secondary" size="sm" asChild>
              <a href={result.stravaActivityUrl} target="_blank" rel="noreferrer">
                View on Strava
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {session.hasAthlete && !result?.stravaActivityUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Log workout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={completeWorkout} className="space-y-3">
              <input type="hidden" name="workoutId" value={workout.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Actual distance (km)">
                  <Input
                    name="actualDistance"
                    type="number"
                    step="0.1"
                    defaultValue={result?.actualDistance ?? workout.plannedDistance ?? undefined}
                  />
                </FormField>
                <FormField label="Actual duration (min)">
                  <Input
                    name="actualDuration"
                    type="number"
                    defaultValue={result?.actualDuration ?? workout.plannedDuration ?? undefined}
                  />
                </FormField>
                <FormField label="RPE (1–10)">
                  <Input
                    name="rpe"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={result?.rpe ?? 6}
                  />
                </FormField>
                <FormField label="Status">
                  <Select
                    name="logType"
                    defaultValue={
                      workout.status === WorkoutStatus.SKIPPED ? 'SKIPPED' : 'COMPLETED'
                    }
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="SKIPPED">Skipped</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Notes">
                <Textarea
                  name="athleteNotes"
                  defaultValue={result?.athleteNotes ?? ''}
                  rows={3}
                  placeholder="How did it feel?"
                />
                <PrivateNoteToggle
                  hideFrom="coach"
                  name="athleteNotesPrivate"
                  defaultChecked={Boolean(result?.athleteNotesPrivate)}
                  className="mt-2"
                />
              </FormField>
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
