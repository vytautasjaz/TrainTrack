import { notFound, redirect } from 'next/navigation'
import { RaceIntent, RaceOutcome } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { raceUsesLegs } from '@/lib/race-legs'
import { setRaceIntent, logRaceOutcome } from '@/app/actions/workouts'
import { RaceLegsResultFields } from '@/components/races/race-legs-fields'
import { RaceStravaLinkPicker } from '@/components/races/race-strava-link-picker'
import { EditRaceDetailsForm } from '@/components/races/edit-race-details-form'

type EditRacePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function EditRacePage({
  params,
  searchParams,
}: EditRacePageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const { id } = await params
  const { returnTo: returnToParam } = await searchParams
  const returnTo =
    returnToParam?.startsWith('/') && !returnToParam.startsWith('//')
      ? returnToParam
      : '/races'

  const race =
    session.role === 'COACH'
      ? await prisma.race.findFirst({
          where: { id, athlete: { coachId: session.userId } },
          include: { legs: { orderBy: { sortOrder: 'asc' } } },
        })
      : await prisma.race.findFirst({
          where: {
            id,
            athleteId: (await resolveAthleteId(session)) ?? '',
          },
          include: { legs: { orderBy: { sortOrder: 'asc' } } },
        })

  if (!race) notFound()

  if (race.type === 'TRIATHLON' && race.legs.length === 0) {
    const { ensureTriathlonLegsForRace } = await import('@/lib/strava/sync')
    await ensureTriathlonLegsForRace(race.id, race.type)
    const legs = await prisma.raceLeg.findMany({
      where: { raceId: race.id },
      orderBy: { sortOrder: 'asc' },
    })
    race.legs = legs
  }

  const dateValue = race.date.toISOString().slice(0, 10)
  const isWatching = race.intent === RaceIntent.WATCHING

  return (
    <div className="mx-auto max-w-[42rem] space-y-6">
      <PageHeader
        title={isWatching ? 'Edit watchlist race' : 'Edit race'}
        action={<BackButton fallbackHref={returnTo} />}
      />

      <EditRaceDetailsForm
        raceId={race.id}
        returnTo={returnTo}
        initial={{
          name: race.name,
          date: dateValue,
          location: race.location,
          goal: race.goal,
          url: race.url,
          preparationWeeks: race.preparationWeeks,
          priority: race.priority,
          intent: race.intent,
          sport: race.sport,
          type: race.type,
          courseType: race.courseType,
          triathlonDistance: race.triathlonDistance,
          customDistanceKm: race.customDistanceKm,
          legs: race.legs,
          raceId: race.id,
        }}
      />

      <div className="space-y-4 overflow-hidden rounded-[10px] border border-border/70 bg-card px-5 py-4 shadow-sm sm:px-6">
        <div>
          <h3 className="text-sm font-semibold">Race result &amp; Strava</h3>
          <p className="text-xs text-muted-foreground">
            Update outcome, link activities, and log triathlon splits.
          </p>
        </div>
        {!raceUsesLegs(race.type) ? (
          <div className="rounded-[6px] border border-border/60 bg-muted/15 px-3 py-2.5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Strava activity
            </p>
            {session.role === 'ATHLETE' ? (
              <RaceStravaLinkPicker
                raceId={race.id}
                linkedUrl={race.stravaActivityUrl}
                linkedName={race.stravaActivityName}
              />
            ) : race.stravaActivityUrl ? (
              <a
                href={race.stravaActivityUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#FC4C02] hover:underline"
              >
                {race.stravaActivityName || 'View on Strava'}
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Not linked</p>
            )}
          </div>
        ) : null}
        <form action={logRaceOutcome} className="space-y-3">
          <input type="hidden" name="raceId" value={race.id} />
          <FormField label="Outcome">
            <Select
              name="outcome"
              defaultValue={
                race.outcome && race.outcome !== 'DISMISSED'
                  ? race.outcome
                  : 'FINISHED'
              }
              required
            >
              <option value={RaceOutcome.FINISHED}>Finished</option>
              <option value={RaceOutcome.DID_NOT_START}>Did not start</option>
              <option value={RaceOutcome.DNF}>DNF</option>
            </Select>
          </FormField>
          <FormField label="Overall result" hint="e.g. 3:27:16">
            <Input
              name="resultTime"
              defaultValue={race.resultTime ?? ''}
              placeholder="3:27:16"
              autoComplete="off"
            />
          </FormField>
          {raceUsesLegs(race.type) && race.legs.length > 0 ? (
            <RaceLegsResultFields
              raceId={race.id}
              legs={race.legs}
              allowStravaLink={session.role === 'ATHLETE'}
            />
          ) : null}
          <FormField label="Notes" hint="Optional">
            <Input
              name="resultNotes"
              defaultValue={race.resultNotes ?? ''}
              placeholder="How did it go?"
            />
          </FormField>
          <Button type="submit" variant="secondary" size="sm">
            Save result
          </Button>
        </form>

        <div className="border-t border-border/60 pt-4">
          {isWatching ? (
            <form action={setRaceIntent}>
              <input type="hidden" name="raceId" value={race.id} />
              <input type="hidden" name="intent" value={RaceIntent.PLANNED} />
              <Button type="submit" variant="ghost" size="sm">
                Promote to plan
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Moves this race onto your season plan and training calendar.
              </p>
            </form>
          ) : (
            <form action={setRaceIntent}>
              <input type="hidden" name="raceId" value={race.id} />
              <input type="hidden" name="intent" value={RaceIntent.WATCHING} />
              <Button type="submit" variant="ghost" size="sm">
                Move to watchlist
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Keeps the race visible as of-interest without blocking your plan.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
