import { Calendar, MapPin } from 'lucide-react'
import type { Race } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ItemActions } from '@/components/ui/item-actions'
import { AddRaceButton } from '@/components/races/add-race-modal'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { daysUntil } from '@/lib/utils'
import { deleteRace } from '@/app/actions/workouts'

type AthleteRacesSectionProps = {
  athleteId: string
  races: Race[]
}

export function AthleteRacesSection({ athleteId, races }: AthleteRacesSectionProps) {
  const upcoming = races.filter((r) => daysUntil(r.date) >= 0)
  const past = races.filter((r) => daysUntil(r.date) < 0)
  const featured = upcoming[0]
  const profilePath = `/athletes/${athleteId}`

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Races</h2>
          <p className="text-xs text-muted-foreground">Target events on the calendar</p>
        </div>
        <AddRaceButton athleteId={athleteId} variant="secondary" />
      </div>

      {featured && (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 text-brand-foreground shadow-[var(--shadow-float)]">
          <div className="p-6">
            <Badge className="bg-white/20 text-white">Next race</Badge>
            <h3 className="mt-3 text-xl font-bold">{featured.name}</h3>
            <p className="mt-1 text-4xl font-bold tabular-nums">{daysUntil(featured.date)}</p>
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
              editHref={`/races/${featured.id}/edit?returnTo=${encodeURIComponent(profilePath)}`}
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
                  editHref={`/races/${race.id}/edit?returnTo=${encodeURIComponent(profilePath)}`}
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
            <AddRaceButton athleteId={athleteId} variant="secondary" className="mt-4" />
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Past races</h3>
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
                  editHref={`/races/${r.id}/edit?returnTo=${encodeURIComponent(profilePath)}`}
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
    </section>
  )
}
