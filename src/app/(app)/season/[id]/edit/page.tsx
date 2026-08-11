import { notFound, redirect } from 'next/navigation'
import { RaceIntent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId, isCoachView, athleteOwnedByCoachWhere } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { raceUsesLegs } from '@/lib/race-legs'
import { setRaceIntent } from '@/app/actions/workouts'
import { RaceStravaLinkPicker } from '@/components/races/race-strava-link-picker'
import { RaceResultForm } from '@/components/races/race-result-form'
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
      : '/season'

  const race =
    isCoachView(session)
      ? await prisma.race.findFirst({
          where: { id, athlete: athleteOwnedByCoachWhere(session.userId) },
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
            {session.hasAthlete ? (
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

        <RaceResultForm
          raceId={race.id}
          raceType={race.type}
          outcome={race.outcome}
          resultTime={race.resultTime}
          resultNotes={race.resultNotes}
          legs={race.legs}
          allowStravaLink={session.hasAthlete}
        />

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
