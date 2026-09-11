import { RaceOutcome, type RacePriority, type RaceType } from '@prisma/client'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { PriorityBadge } from '@/components/races/priority-badge'
import {
  RaceReportPanel,
  raceHasReportContent,
  type RaceReportPanelData,
} from '@/components/races/race-report-panel'
import { RACE_OUTCOME_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import { PLANNER_PRIORITY_CARD } from '@/lib/season-planner'
import { cn } from '@/lib/utils'
import type { RaceLegView } from '@/lib/race-legs'

export type InboxRaceReportLeg = {
  id: string
  kind: RaceLegView['kind']
  sortOrder: number
  resultTime: string | null
  plannedTime: string | null
  stravaActivityUrl: string | null
  stravaActivityName?: string | null
  actualDurationMin?: number | null
}

export type InboxRaceReportSummaryData = {
  name: string
  dateKey: string
  type: RaceType | keyof typeof RACE_TYPE_LABELS
  priority?: RacePriority | null
  outcome: RaceOutcome | string | null
  resultTime: string | null
  resultPlace: string | null
  resultPlaceGender: string | null
  resultPlaceAg: string | null
  resultNotes: string | null
  legs?: InboxRaceReportLeg[]
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
}

function inboxRaceResultLabel(race: InboxRaceReportSummaryData): string {
  const outcome = race.outcome as RaceOutcome | null
  if (!outcome || outcome === RaceOutcome.DISMISSED) return '—'
  if (outcome === RaceOutcome.FINISHED) {
    return race.resultTime?.trim() || RACE_OUTCOME_LABELS.FINISHED
  }
  if (outcome === RaceOutcome.DNF && race.resultTime?.trim()) {
    return `${RACE_OUTCOME_LABELS.DNF} · ${race.resultTime.trim()}`
  }
  return RACE_OUTCOME_LABELS[outcome]
}

export function formatInboxRaceResultLabel(race: InboxRaceReportSummaryData): string | null {
  if (!race.outcome || race.outcome === RaceOutcome.DISMISSED) return null
  return inboxRaceResultLabel(race)
}

function outcomeBadgeClass(outcome: RaceOutcome | string | null): string {
  if (outcome === RaceOutcome.FINISHED) {
    return 'border-[var(--tt-good)]/25 bg-[var(--tt-good-soft)] text-[var(--tt-good)]'
  }
  if (outcome === RaceOutcome.DNF) {
    return 'border-[var(--tt-red)]/25 bg-[var(--tt-red-soft)] text-[var(--tt-red)]'
  }
  if (outcome === RaceOutcome.DID_NOT_START) {
    return 'border-black/10 bg-background/70 text-muted-foreground'
  }
  return 'border-black/10 bg-background/70 text-muted-foreground'
}

const headerTagClass =
  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-[0.06em]'

type InboxRaceReportSummaryProps = {
  race: InboxRaceReportSummaryData
  dateLabel: string
  className?: string
  showSeasonLink?: boolean
}

export function InboxRaceReportSummary({
  race,
  dateLabel,
  className,
  showSeasonLink = true,
}: InboxRaceReportSummaryProps) {
  const outcome = race.outcome as RaceOutcome | null
  const hasResult = outcome && outcome !== RaceOutcome.DISMISSED
  const reportRace: RaceReportPanelData = {
    type: race.type as RaceType,
    outcome: race.outcome,
    resultTime: race.resultTime,
    resultPlace: race.resultPlace,
    resultPlaceGender: race.resultPlaceGender,
    resultPlaceAg: race.resultPlaceAg,
    resultNotes: race.resultNotes,
    stravaActivityUrl: race.stravaActivityUrl,
    stravaActivityName: race.stravaActivityName,
    legs: race.legs,
  }
  const hasReport = raceHasReportContent(reportRace)
  const prioritySurface = race.priority
    ? PLANNER_PRIORITY_CARD[race.priority]
    : 'border-border bg-background'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[10px] border shadow-[var(--tt-shadow,0_1px_2px_rgba(0,0,0,0.04))]',
        prioritySurface,
        className,
      )}
    >
      <div className="border-b border-black/5 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="title-card text-foreground">{race.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>{dateLabel}</span>
              <span aria-hidden>·</span>
              <span>{RACE_TYPE_LABELS[race.type as keyof typeof RACE_TYPE_LABELS]}</span>
            </p>
          </div>
          <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1.5">
            {race.priority ? (
              <PriorityBadge priority={race.priority} />
            ) : (
              <span
                className={cn(
                  headerTagClass,
                  'border-black/10 bg-background/70 text-muted-foreground',
                )}
              >
                Race
              </span>
            )}
            {hasResult ? (
              <span className={cn(headerTagClass, outcomeBadgeClass(outcome))}>
                {RACE_OUTCOME_LABELS[outcome]}
              </span>
            ) : null}
            {showSeasonLink ? (
              <Link
                href="/season"
                className={cn(
                  headerTagClass,
                  'border-black/10 bg-background/70 text-muted-foreground transition hover:border-black/20 hover:text-foreground',
                )}
              >
                Season plan
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {hasReport ? (
        <RaceReportPanel race={reportRace} showPlan={false} />
      ) : (
        <p className="px-3.5 py-3.5 text-xs text-muted-foreground">
          No race result logged yet.
        </p>
      )}
    </div>
  )
}
