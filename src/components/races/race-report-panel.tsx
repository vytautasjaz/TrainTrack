import {
  Bike,
  FileText,
  Footprints,
  Link2,
  Medal,
  StickyNote,
  Timer,
  Trophy,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RaceLegKind, RaceOutcome, type RaceType } from '@prisma/client'
import { RaceStatCell } from '@/components/races/race-stat-cell'
import { RACE_OUTCOME_LABELS } from '@/lib/constants'
import {
  formatRaceLegResult,
  RACE_LEG_LABELS,
  raceUsesLegs,
  TRIATHLON_LEG_ORDER,
  type RaceLegView,
} from '@/lib/race-legs'
import { racePlaceLines } from '@/lib/season-races'
import { cn } from '@/lib/utils'

const LEG_ICON: Record<RaceLegKind, LucideIcon> = {
  SWIM: Waves,
  T1: Timer,
  BIKE: Bike,
  T2: Timer,
  RUN: Footprints,
}

export type RaceReportPanelData = {
  type: RaceType
  outcome?: RaceOutcome | string | null
  resultTime?: string | null
  resultPlace?: string | null
  resultPlaceGender?: string | null
  resultPlaceAg?: string | null
  resultNotes?: string | null
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
  legs?: Array<
    Pick<
      RaceLegView,
      | 'id'
      | 'kind'
      | 'sortOrder'
      | 'resultTime'
      | 'plannedTime'
      | 'stravaActivityUrl'
    > &
      Partial<
        Pick<RaceLegView, 'actualDurationMin' | 'stravaActivityName' | 'plannedTime'>
      >
  > | null
}

function resultLabel(race: RaceReportPanelData): string {
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

export function raceHasReportContent(race: RaceReportPanelData): boolean {
  const outcome = race.outcome as RaceOutcome | null
  if (outcome && outcome !== RaceOutcome.DISMISSED) return true
  if (race.stravaActivityUrl?.trim()) return true
  if (!raceUsesLegs(race.type) || !race.legs?.length) return false
  return race.legs.some(
    (leg) => formatRaceLegResult(leg) !== '—' || Boolean(leg.stravaActivityUrl?.trim()),
  )
}

type RaceReportPanelProps = {
  race: RaceReportPanelData
  className?: string
  /** Show planned split times under result when present. */
  showPlan?: boolean
  /** When true, omit the built-in Race report title row (accordion header used instead). */
  hideHeader?: boolean
}

/**
 * Race report block in the same icon + gap-px cell language as race preview.
 */
export function RaceReportPanel({
  race,
  className,
  showPlan = true,
  hideHeader = false,
}: RaceReportPanelProps) {
  if (!raceHasReportContent(race)) return null

  const outcome = race.outcome as RaceOutcome | null
  const hasOutcome = Boolean(outcome && outcome !== RaceOutcome.DISMISSED)
  const places = racePlaceLines(race)
  const notes = race.resultNotes?.trim() || null
  const stravaUrl = race.stravaActivityUrl?.trim() || null
  const resultValue = hasOutcome ? resultLabel(race) : null

  const hasLoggedSplit =
    raceUsesLegs(race.type) &&
    Boolean(
      race.legs?.some(
        (leg) => formatRaceLegResult(leg) !== '—' || Boolean(leg.stravaActivityUrl?.trim()),
      ),
    )

  const splitsForRow =
    hasLoggedSplit && race.legs?.length
      ? TRIATHLON_LEG_ORDER.map((kind) => {
          const leg = race.legs!.find((row) => row.kind === kind)
          if (!leg) return null
          return {
            leg,
            time: formatRaceLegResult(leg),
            plan: leg.plannedTime?.trim() || null,
            hasStrava: Boolean(leg.stravaActivityUrl?.trim()),
          }
        }).filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

  const topCells: Array<{ key: string; node: ReactNode }> = []

  if (hasOutcome && resultValue) {
    topCells.push({
      key: 'result',
      node: (
        <RaceStatCell icon={Trophy} label="Result">
          <span className="tabular-nums">{resultValue}</span>
        </RaceStatCell>
      ),
    })
  }

  if (places.length > 0) {
    topCells.push({
      key: 'place',
      node: (
        <RaceStatCell icon={Medal} label="Place">
          {places.length === 1 ? (
            <span className="tabular-nums">{places[0]!.value}</span>
          ) : (
            <ul className="flex min-w-0 flex-wrap items-stretch divide-x divide-border/60">
              {places.map((row) => (
                <li key={row.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="mt-0.5 block tabular-nums">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
        </RaceStatCell>
      ),
    })
  }

  if (stravaUrl) {
    topCells.push({
      key: 'strava',
      node: (
        <RaceStatCell icon={Link2} label="Strava">
          <a
            href={stravaUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all font-semibold text-[#FC4C02] hover:underline"
          >
            {race.stravaActivityName?.trim() || 'Open activity'}
          </a>
        </RaceStatCell>
      ),
    })
  }

  return (
    <div className={cn('bg-border', className)}>
      {!hideHeader ? (
        <div className="flex items-start gap-3 bg-background px-4 py-3.5 sm:px-5">
          <FileText
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
              Race report
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              My results and splits from the race.
            </p>
          </div>
        </div>
      ) : null}

      {topCells.length > 0 ? (
        <div
          className={cn(
            'grid grid-cols-1 gap-px',
            !hideHeader && 'mt-px',
            topCells.length === 1 && 'sm:grid-cols-1',
            topCells.length === 2 && 'sm:grid-cols-2',
            topCells.length >= 3 && 'sm:grid-cols-3',
          )}
        >
          {topCells.map((cell) => (
            <div key={cell.key} className="min-h-0">
              {cell.node}
            </div>
          ))}
        </div>
      ) : null}

      {splitsForRow.length > 0 ? (
        <div
          className={cn('grid gap-px', (topCells.length > 0 || !hideHeader) && 'mt-px')}
          style={{
            gridTemplateColumns: `repeat(${splitsForRow.length}, minmax(0, 1fr))`,
          }}
        >
          {splitsForRow.map(({ leg, time, plan, hasStrava }) => {
            const Icon = LEG_ICON[leg.kind]
            return (
              <RaceStatCell
                key={leg.id}
                icon={Icon}
                label={RACE_LEG_LABELS[leg.kind]}
                className="flex-col items-start gap-1 px-2 py-3 sm:gap-1.5 sm:px-3 sm:py-3.5 [&_svg]:mt-0"
              >
                <span className="tabular-nums">{time}</span>
                {showPlan && plan ? (
                  <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground sm:text-xs">
                    Plan {plan}
                  </span>
                ) : null}
                {hasStrava && leg.stravaActivityUrl ? (
                  <a
                    href={leg.stravaActivityUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block text-[10px] font-medium text-[#FC4C02] hover:underline sm:text-xs"
                  >
                    Strava
                  </a>
                ) : null}
              </RaceStatCell>
            )
          })}
        </div>
      ) : null}

      {notes && !hideHeader ? (
        <div
          className={cn(
            (topCells.length > 0 || splitsForRow.length > 0 || !hideHeader) && 'mt-px',
          )}
        >
          <RaceStatCell icon={StickyNote} label="Feedback">
            <span className="whitespace-pre-wrap font-medium leading-relaxed">
              {notes}
            </span>
          </RaceStatCell>
        </div>
      ) : null}
    </div>
  )
}
