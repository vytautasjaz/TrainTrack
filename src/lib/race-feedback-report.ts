import { RaceLegKind, RaceOutcome, RaceType } from '@prisma/client'
import { RACE_OUTCOME_LABELS } from '@/lib/constants'
import {
  formatRaceLegResult,
  RACE_LEG_LABELS,
  raceUsesLegs,
  TRIATHLON_LEG_ORDER,
} from '@/lib/race-legs'

export type RaceFeedbackReportLeg = {
  kind: RaceLegKind
  sortOrder: number
  resultTime?: string | null
  actualDurationMin?: number | null
}

export type RaceFeedbackReportSource = {
  outcome: RaceOutcome | null
  resultTime?: string | null
  resultPlace?: string | null
  resultNotes?: string | null
  type: RaceType
  legs?: RaceFeedbackReportLeg[] | null
}

function formatLegLines(race: RaceFeedbackReportSource): string[] {
  if (!raceUsesLegs(race.type) || !race.legs?.length) return []

  const byKind = new Map(race.legs.map((leg) => [leg.kind, leg]))
  const lines: string[] = []

  for (const kind of TRIATHLON_LEG_ORDER) {
    const leg = byKind.get(kind)
    if (!leg) continue
    const time = formatRaceLegResult(leg)
    if (time === '—') continue
    lines.push(`${RACE_LEG_LABELS[kind]}: ${time}`)
  }

  return lines
}

/** Plain-text race report for inbox messages and previews. */
export function formatRaceFeedbackReportBody(race: RaceFeedbackReportSource): string {
  if (!race.outcome || race.outcome === RaceOutcome.DISMISSED) return ''

  const lines: string[] = [`Outcome: ${RACE_OUTCOME_LABELS[race.outcome]}`]

  const finishTime = race.resultTime?.trim()
  if (
    finishTime &&
    (race.outcome === RaceOutcome.FINISHED || race.outcome === RaceOutcome.DNF)
  ) {
    lines.push(`Finish time: ${finishTime}`)
  }

  const place = race.resultPlace?.trim()
  if (place && race.outcome === RaceOutcome.FINISHED) {
    lines.push(`Place: ${place}`)
  }

  const legLines = formatLegLines(race)
  if (legLines.length > 0) {
    lines.push('', ...legLines)
  }

  const notes = race.resultNotes?.trim()
  if (notes) {
    lines.push('', 'Notes:', notes)
  }

  return lines.join('\n').trim()
}

export function hasRaceFeedbackReportContent(race: RaceFeedbackReportSource): boolean {
  return Boolean(formatRaceFeedbackReportBody(race))
}

/** Placeholder inbox message when the race card already carries the report. */
export const RACE_RESULT_LOGGED_MESSAGE = 'Logged race result.'

/** True when the chat bubble would only repeat what's already on the race card. */
export function isRaceReportCardDuplicateMessage(
  body: string,
  race?: { resultNotes?: string | null } | null,
): boolean {
  const trimmed = body.trim()
  if (!trimmed) return true
  if (trimmed === RACE_RESULT_LOGGED_MESSAGE) return true
  if (trimmed.startsWith('Outcome:')) return true
  const notes = race?.resultNotes?.trim()
  if (notes && trimmed === notes) return true
  return false
}
