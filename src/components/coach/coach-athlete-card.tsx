import Link from 'next/link'
import { CalendarRange, Flag } from 'lucide-react'
import type { AthleteStatus } from '@prisma/client'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  athleteStatusBadgeClass,
  athleteStatusCardClass,
  athleteStatusLabel,
} from '@/lib/athlete-status'
import { cn } from '@/lib/utils'

type CoachAthleteCardProps = {
  athlete: {
    id: string
    name: string
    status: AthleteStatus
    races: { name: string; date: Date }[]
  }
  compliance: number
  completed: number
  planned: number
  nextRaceDays: number | null
}

export function CoachAthleteCard({
  athlete,
  compliance,
  completed,
  planned,
  nextRaceDays,
}: CoachAthleteCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:border-brand/30 hover:shadow-sm',
        athleteStatusCardClass(athlete.status),
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-sm font-bold text-brand">
              {athlete.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">
                <Link
                  href={`/athletes/${athlete.id}`}
                  className="truncate hover:text-brand"
                >
                  {athlete.name}
                </Link>
              </CardTitle>
            </div>
          </div>
          <Badge className={cn('shrink-0', athleteStatusBadgeClass(athlete.status))}>
            {athleteStatusLabel(athlete.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Weekly compliance</span>
            <span className="font-semibold">{compliance}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${compliance}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {completed} / {planned} workouts
          </p>
        </div>
        {athlete.races[0] && nextRaceDays != null && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-sm">
            <Flag className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">
              {athlete.races[0].name} · {nextRaceDays} days
            </span>
          </div>
        )}
      </CardContent>
      <div className="border-t border-border/60 px-4 py-3">
        <form action={selectAthleteForTraining}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <Button type="submit" variant="secondary" size="sm">
            <CalendarRange className="h-3.5 w-3.5" />
            Training
          </Button>
        </form>
      </div>
    </Card>
  )
}
