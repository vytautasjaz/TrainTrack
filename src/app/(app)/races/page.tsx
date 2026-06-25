import { redirect } from 'next/navigation'
import { Calendar, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ItemActions } from '@/components/ui/item-actions'
import { PageHeader } from '@/components/ui/page-header'
import { AddRaceButton } from '@/components/races/add-race-modal'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { daysUntil } from '@/lib/utils'
import { deleteRace } from '@/app/actions/workouts'

export default async function RacesPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const races = await prisma.race.findMany({
    where: { athleteId },
    orderBy: { date: 'asc' },
  })

  const upcoming = races.filter((r) => daysUntil(r.date) >= 0)
  const past = races.filter((r) => daysUntil(r.date) < 0)
  const featured = upcoming[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Races"
        description="Target events and countdown"
        action={<AddRaceButton />}
      />

      {featured && (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 text-brand-foreground shadow-[var(--shadow-float)]">
          <div className="p-6">
            <Badge className="bg-white/20 text-white">Next race</Badge>
            <h2 className="mt-3 text-2xl font-bold">{featured.name}</h2>
            <p className="mt-1 text-5xl font-bold tabular-nums">{daysUntil(featured.date)}</p>
            <p className="text-sm opacity-90">days remaining</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm opacity-90">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {featured.date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {featured.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {featured.location}
                </span>
              )}
            </div>
            {featured.goal && (
              <p className="mt-3 rounded-2xl bg-white/15 px-4 py-2 text-sm">Goal: {featured.goal}</p>
            )}
          </div>
          <div className="border-t border-white/20 bg-black/10 px-6 py-3">
            <ItemActions
              editHref={`/races/${featured.id}/edit`}
              deleteAction={deleteRace}
              deleteId={featured.id}
              deleteIdField="raceId"
              deleteConfirmMessage={`Remove "${featured.name}"?`}
            />
          </div>
        </div>
      )}

      {upcoming.length > 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.slice(1).map((race) => (
            <Card key={race.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{race.name}</CardTitle>
                  <Badge className="bg-brand-soft text-brand">{RACE_TYPE_LABELS[race.type]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-bold tabular-nums text-brand">{daysUntil(race.date)}</p>
                <p className="text-sm text-muted-foreground">days remaining</p>
                {race.goal && <p className="text-sm">Goal: {race.goal}</p>}
                <ItemActions
                  editHref={`/races/${race.id}/edit`}
                  deleteAction={deleteRace}
                  deleteId={race.id}
                  deleteIdField="raceId"
                  deleteConfirmMessage={`Remove "${race.name}"?`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {upcoming.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
            <p>No upcoming races scheduled.</p>
            <AddRaceButton variant="secondary" className="mt-4" />
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Past races</h2>
          <ul className="space-y-2">
            {past.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
              >
                <span>
                  {r.name} · {r.date.toLocaleDateString()}
                </span>
                <ItemActions
                  editHref={`/races/${r.id}/edit`}
                  deleteAction={deleteRace}
                  deleteId={r.id}
                  deleteIdField="raceId"
                  deleteConfirmMessage={`Remove "${r.name}"?`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
