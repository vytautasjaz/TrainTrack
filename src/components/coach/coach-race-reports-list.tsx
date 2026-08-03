'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Flag, X } from 'lucide-react'
import type { RaceOutcome } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dismissRaceReport } from '@/app/actions/feedback'
import { RACE_OUTCOME_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import type { RaceType } from '@prisma/client'
import { RaceLegsSummary } from '@/components/races/race-legs-fields'
import type { RaceLegView } from '@/lib/race-legs'

export type CoachRaceReportItem = {
  id: string
  name: string
  date: string
  type: RaceType
  outcome: RaceOutcome
  resultTime: string | null
  resultNotes: string | null
  resultLoggedAt: string | null
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
  legs?: RaceLegView[]
  athlete: { id: string; name: string }
}

export function CoachRaceReportsList({ reports }: { reports: CoachRaceReportItem[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No new race reports.</p>
  }

  return (
    <div className="space-y-3">
      {reports.map((item) => (
        <CoachRaceReportCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function CoachRaceReportCard({ item }: { item: CoachRaceReportItem }) {
  const [isDismissing, startDismiss] = useTransition()
  const outcomeLabel =
    item.outcome === 'FINISHED' && item.resultTime
      ? item.resultTime
      : RACE_OUTCOME_LABELS[item.outcome]

  function handleDismiss() {
    const formData = new FormData()
    formData.set('raceId', item.id)
    startDismiss(async () => {
      await dismissRaceReport(formData)
    })
  }

  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Flag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Link
              href={`/athletes/${item.athlete.id}`}
              className="font-semibold hover:underline"
            >
              {item.athlete.name}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium">{item.name}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(item.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
            {' · '}
            {RACE_TYPE_LABELS[item.type]}
            {item.resultLoggedAt
              ? ` · logged ${new Date(item.resultLoggedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}`
              : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge className="bg-brand-soft text-brand">New</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isDismissing}
            onClick={handleDismiss}
            aria-label="Dismiss race report"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium">{outcomeLabel}</p>
      {item.legs && item.legs.length > 0 ? (
        <div className="mt-2">
          <RaceLegsSummary legs={item.legs} showPlan={false} />
        </div>
      ) : item.stravaActivityUrl ? (
        <a
          href={item.stravaActivityUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-[#FC4C02] hover:underline"
        >
          {item.stravaActivityName || 'View on Strava'}
        </a>
      ) : null}
      {item.resultNotes?.trim() ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          &ldquo;{item.resultNotes.trim()}&rdquo;
        </p>
      ) : null}
      <div className="mt-3">
        <Button asChild type="button" variant="ghost" size="sm">
          <Link href={`/athletes/${item.athlete.id}`}>View athlete</Link>
        </Button>
      </div>
    </div>
  )
}
