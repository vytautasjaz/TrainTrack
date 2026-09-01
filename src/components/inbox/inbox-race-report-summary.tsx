import { RaceLegKind, RaceOutcome, type RacePriority } from '@prisma/client'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { PriorityBadge } from '@/components/races/priority-badge'
import { RACE_OUTCOME_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import {
  formatRaceLegResult,
  RACE_LEG_LABELS,
  raceUsesLegs,
  TRIATHLON_LEG_ORDER,
} from '@/lib/race-legs'
import { PLANNER_PRIORITY_CARD } from '@/lib/season-planner'
import { cn } from '@/lib/utils'

export type InboxRaceReportLeg = {
  id: string
  kind: RaceLegKind
  sortOrder: number
  resultTime: string | null
  plannedTime: string | null
  stravaActivityUrl: string | null
}

export type InboxRaceReportSummaryData = {
  name: string
  dateKey: string
  type: keyof typeof RACE_TYPE_LABELS
  priority?: RacePriority | null
  outcome: RaceOutcome | string | null
  resultTime: string | null
  resultPlace: string | null
  resultNotes: string | null
  legs?: InboxRaceReportLeg[]
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

function StatTile({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-black/5 bg-background/80 px-3 py-2.5 backdrop-blur-[2px]">
      <p className="title-eyebrow text-[var(--tt-ink-faint)]">{label}</p>
      <p
        className={cn(
          'mt-1 truncate tabular-nums tracking-tight text-foreground',
          emphasize ? 'text-xl font-semibold' : 'text-sm font-semibold',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function InboxRaceSplits({ legs }: { legs: InboxRaceReportLeg[] }) {
  const byKind = new Map(legs.map((leg) => [leg.kind, leg]))
  const items = TRIATHLON_LEG_ORDER.map((kind) => {
    const leg = byKind.get(kind)
    if (!leg) return null
    const time = formatRaceLegResult(leg)
    if (time === '—') return null
    return { kind, time }
  }).filter(Boolean) as Array<{ kind: RaceLegKind; time: string }>

  if (items.length === 0) return null

  return (
    <div>
      <p className="title-eyebrow mb-2 text-[var(--tt-ink-faint)]">Splits</p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {items.map(({ kind, time }) => (
          <div
            key={kind}
            className="min-w-0 rounded-[6px] border border-black/5 bg-background/70 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {RACE_LEG_LABELS[kind]}
            </p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const showLegs = raceUsesLegs(race.type) && Boolean(race.legs?.length)
  const place = race.resultPlace?.trim() || null
  const notes = race.resultNotes?.trim() || null
  const resultValue = hasResult ? inboxRaceResultLabel(race) : null
  const showFinishTile =
    hasResult &&
    Boolean(
      race.resultTime?.trim() ||
        outcome === RaceOutcome.FINISHED ||
        outcome === RaceOutcome.DNF ||
        outcome === RaceOutcome.DID_NOT_START,
    )
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
              <span>{RACE_TYPE_LABELS[race.type]}</span>
            </p>
          </div>
          <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1.5">
            {race.priority ? (
              <PriorityBadge priority={race.priority} />
            ) : (
              <span className={cn(headerTagClass, 'border-black/10 bg-background/70 text-muted-foreground')}>
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

      <div className="space-y-3.5 px-3.5 py-3.5">
        {hasResult ? (
          <>
            {(showFinishTile || place) && (
              <div
                className={cn(
                  'grid gap-2',
                  showFinishTile && place ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {showFinishTile ? (
                  <StatTile
                    label={
                      outcome === RaceOutcome.FINISHED
                        ? 'Finish time'
                        : outcome === RaceOutcome.DNF
                          ? 'Time'
                          : 'Result'
                    }
                    value={resultValue!}
                    emphasize={Boolean(race.resultTime?.trim())}
                  />
                ) : null}
                {place ? <StatTile label="Place" value={place} /> : null}
              </div>
            )}

            {showLegs ? <InboxRaceSplits legs={race.legs!} /> : null}

            {notes ? (
              <div className="rounded-[8px] border border-black/5 bg-background/70 px-3 py-2.5">
                <p className="title-eyebrow text-[var(--tt-ink-faint)]">Notes</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {notes}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No race result logged yet.</p>
        )}
      </div>
    </div>
  )
}
