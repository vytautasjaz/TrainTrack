import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { RACE_TYPE_LABELS, RaceType, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { RACE_SPORT_OPTIONS } from '@/lib/races'
import { updateRace } from '@/app/actions/workouts'

const RACE_TYPES = Object.keys(RACE_TYPE_LABELS) as RaceType[]

type EditRacePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function EditRacePage({ params, searchParams }: EditRacePageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const { id } = await params
  const { returnTo: returnToParam } = await searchParams
  const returnTo =
    returnToParam?.startsWith('/') && !returnToParam.startsWith('//') ? returnToParam : '/races'

  const race =
    session.role === 'COACH'
      ? await prisma.race.findFirst({
          where: { id, athlete: { coachId: session.userId } },
        })
      : await prisma.race.findFirst({
          where: {
            id,
            athleteId: (await resolveAthleteId(session)) ?? '',
          },
        })

  if (!race) notFound()

  const dateValue = race.date.toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit race"
        description={race.name}
        action={<BackButton fallbackHref={returnTo} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Race details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateRace} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="raceId" value={race.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input name="name" defaultValue={race.name} required className="input-field md:col-span-2" />
            <input name="date" type="date" defaultValue={dateValue} required className="input-field" />
            <select name="type" defaultValue={race.type} required className="input-field">
              {RACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RACE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select name="sport" defaultValue={race.sport} required className="input-field">
              {RACE_SPORT_OPTIONS.map((sport) => (
                <option key={sport} value={sport}>
                  {WORKOUT_TYPE_LABELS[sport]}
                </option>
              ))}
            </select>
            <input
              name="location"
              defaultValue={race.location ?? ''}
              placeholder="Location"
              className="input-field"
            />
            <input
              name="goal"
              defaultValue={race.goal ?? ''}
              placeholder="Goal"
              className="input-field"
            />
            <Button type="submit" variant="secondary" size="sm" className="md:col-span-2 w-fit">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
