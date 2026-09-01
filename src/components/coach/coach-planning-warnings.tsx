'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarRange } from 'lucide-react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import { Button } from '@/components/ui/button'
import { formatDateKey } from '@/lib/dates'

export type CoachPlanningWarning = {
  athleteId: string
  athleteName: string
  avatarUrl?: string | null
  lastPlannedKey: string | null
}

type CoachPlanningWarningsProps = {
  warnings: CoachPlanningWarning[]
  planningLeadDays: number
}

function WarningRow({ warning }: { warning: CoachPlanningWarning }) {
  const [isPending, startTransition] = useTransition()

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-amber-200/80 bg-card/80 px-3 py-2.5 dark:border-amber-500/20">
      <div className="flex min-w-0 items-center gap-2.5">
        <AthleteAvatar
          name={warning.athleteName}
          avatarUrl={warning.avatarUrl}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {warning.athleteName}
          </p>
          <p className="text-xs text-muted-foreground">
            {warning.lastPlannedKey
              ? `Last planned: ${formatDateKey(warning.lastPlannedKey)}`
              : 'No upcoming workouts planned'}
          </p>
        </div>
      </div>
      <form
        action={(formData) => {
          startTransition(async () => {
            await selectAthleteForTraining(formData)
          })
        }}
      >
        <input type="hidden" name="athleteId" value={warning.athleteId} />
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          <CalendarRange className="h-3.5 w-3.5" />
          {isPending ? 'Opening…' : 'Open plan'}
        </Button>
      </form>
    </li>
  )
}

export function CoachPlanningWarnings({
  warnings,
  planningLeadDays,
}: CoachPlanningWarningsProps) {
  if (warnings.length === 0) return null

  return (
    <section className="card-elevated space-y-3 border-amber-300/60 bg-amber-50/50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Plan ahead
          </h2>
          <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-100/70">
            {warnings.length === 1
              ? `1 active athlete needs workouts planned at least ${planningLeadDays} day${planningLeadDays === 1 ? '' : 's'} ahead.`
              : `${warnings.length} active athletes need workouts planned at least ${planningLeadDays} days ahead.`}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {warnings.map((warning) => (
          <WarningRow key={warning.athleteId} warning={warning} />
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Adjust lead time in{' '}
        <Link href="/settings#planning" className="underline underline-offset-2 hover:text-foreground">
          Preferences
        </Link>
        .
      </p>
    </section>
  )
}
