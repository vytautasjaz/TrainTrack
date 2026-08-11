import { PersonalBestMetric } from '@prisma/client'
import { format, parseISO } from 'date-fns'
import { parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import {
  displayPersonalBestDate,
  formatPersonalBestValue,
  type PersonalBestRecord,
} from '@/lib/personal-bests'
import {
  filterRaceResultsForPersonalBest,
  raceResultOutcomeLabel,
  type RaceResultRow,
} from '@/lib/race-results'

export type PersonalBestDistanceHistoryEntry = {
  id: string
  /** Sortable ISO-like date key (padded when PB only has year / year-month). */
  sortDate: string
  dateLabel: string
  event: string
  location: string | null
  resultLabel: string
  /** Minutes (TIME) or raw value for sorting by result. */
  sortValue: number | null
  isPersonalBestRecord: boolean
}

function datesCompatible(raceDate: string, pbDateText: string | null | undefined): boolean {
  const pb = pbDateText?.trim()
  if (!pb) return true
  if (pb.length === 4) return raceDate.startsWith(pb)
  if (pb.length === 7) return raceDate.startsWith(pb)
  return raceDate === pb
}

function sortDateFromPbDateText(dateText: string | null | undefined): string {
  const value = dateText?.trim()
  if (!value) return '0000-01-01'
  if (/^\d{4}$/.test(value)) return `${value}-01-01`
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  return value
}

function timesMatchPb(resultTime: string | null, pbValue: number): boolean {
  if (!resultTime || !(pbValue > 0)) return false
  const mins = parseRaceTimeToMinutes(resultTime)
  if (mins == null) return false
  return Math.abs(mins - pbValue) < 1 / 120 // ~0.5s
}

function formatRaceDateLabel(dateKey: string): string {
  try {
    return format(parseISO(dateKey), 'd MMM yyyy')
  } catch {
    return dateKey
  }
}

/**
 * Race results for a PB distance, plus the PB itself when it is not already
 * represented by a matching race (same raceId, or same time + compatible date).
 */
export function buildPersonalBestDistanceHistory(
  results: RaceResultRow[],
  pb: PersonalBestRecord,
): PersonalBestDistanceHistoryEntry[] {
  const races = filterRaceResultsForPersonalBest(results, pb)

  const entries: PersonalBestDistanceHistoryEntry[] = races.map((row) => ({
    id: `race:${row.id}`,
    sortDate: row.date,
    dateLabel: formatRaceDateLabel(row.date),
    event: row.name,
    location: row.location,
    resultLabel: row.resultTime ?? raceResultOutcomeLabel(row.outcome),
    sortValue: row.resultTime ? parseRaceTimeToMinutes(row.resultTime) : null,
    isPersonalBestRecord: false,
  }))

  const pbCovered =
    pb.value > 0 &&
    races.some((row) => {
      if (pb.raceId && row.id === pb.raceId) return true
      if (pb.metric !== PersonalBestMetric.TIME) return false
      return timesMatchPb(row.resultTime, pb.value) && datesCompatible(row.date, pb.dateText)
    })

  if (pb.value > 0 && !pbCovered) {
    entries.push({
      id: `pb:${pb.id}`,
      sortDate: sortDateFromPbDateText(pb.dateText),
      dateLabel: displayPersonalBestDate(pb.dateText),
      event: pb.event?.trim() || 'Personal best',
      location: null,
      resultLabel: formatPersonalBestValue(pb.value, pb.metric),
      sortValue: pb.value,
      isPersonalBestRecord: true,
    })
  }

  return entries
}
