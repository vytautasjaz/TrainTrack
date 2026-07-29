import { notFound, redirect } from 'next/navigation'
import { RaceIntent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import {
  RACE_INTENT_LABELS,
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  RacePriority,
  RaceType,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { RACE_SPORT_OPTIONS } from '@/lib/races'
import { setRaceIntent, updateRace } from '@/app/actions/workouts'

const RACE_TYPES = Object.keys(RACE_TYPE_LABELS) as RaceType[]
const RACE_PRIORITIES = Object.keys(RACE_PRIORITY_LABELS) as RacePriority[]

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
  const isWatching = race.intent === RaceIntent.WATCHING

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isWatching ? 'Edit watchlist race' : 'Edit race'}
        description={race.name}
        action={<BackButton fallbackHref={returnTo} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Race details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateRace} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="raceId" value={race.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <FormField label="Race name" className="md:col-span-2">
              <Input name="name" defaultValue={race.name} required />
            </FormField>
            <FormField label="Date">
              <Input name="date" type="date" defaultValue={dateValue} required />
            </FormField>
            <FormField label="Type">
              <Select name="type" defaultValue={race.type} required>
                {RACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RACE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Intent">
              <Select name="intent" defaultValue={race.intent} required>
                <option value={RaceIntent.PLANNED}>{RACE_INTENT_LABELS.PLANNED}</option>
                <option value={RaceIntent.WATCHING}>{RACE_INTENT_LABELS.WATCHING}</option>
              </Select>
            </FormField>
            <FormField label="Sport on calendar">
              <Select name="sport" defaultValue={race.sport} required>
                {RACE_SPORT_OPTIONS.map((sport) => (
                  <option key={sport} value={sport}>
                    {WORKOUT_TYPE_LABELS[sport]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select name="priority" defaultValue={race.priority} required>
                {RACE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority} — {RACE_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Location">
              <Input name="location" defaultValue={race.location ?? ''} placeholder="Optional" />
            </FormField>
            <FormField label="Goal">
              <Input name="goal" defaultValue={race.goal ?? ''} placeholder="Optional" />
            </FormField>
            <FormField label="Link" className="md:col-span-2">
              <Input
                name="url"
                type="url"
                defaultValue={race.url ?? ''}
                placeholder="https://"
              />
            </FormField>
            <Button type="submit" variant="secondary" size="sm" className="md:col-span-2 w-fit">
              Save changes
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
        </CardContent>
      </Card>
    </div>
  )
}
