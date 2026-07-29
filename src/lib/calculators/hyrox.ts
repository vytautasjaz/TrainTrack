import { formatRaceTime, parseDurationToMinutes, parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { parsePaceMinPerKm } from '@/lib/athlete-preferences'

/** Official HYROX station order after each 1 km run. */
export const HYROX_STATIONS = [
  { id: 'ski', label: 'SkiErg', kind: 'erg1000' as const },
  { id: 'sledPush', label: 'Sled Push', kind: 'time' as const },
  { id: 'sledPull', label: 'Sled Pull', kind: 'time' as const },
  { id: 'burpees', label: 'Burpee Broad Jumps', kind: 'time' as const },
  { id: 'row', label: 'RowErg', kind: 'erg1000' as const },
  { id: 'farmers', label: 'Farmers Carry', kind: 'time' as const },
  { id: 'lunges', label: 'Sandbag Lunges', kind: 'time' as const },
  { id: 'wallBalls', label: 'Wall Balls', kind: 'time' as const },
] as const

export type HyroxStationId = (typeof HYROX_STATIONS)[number]['id']
export type HyroxScenario = 'recreational' | 'intermediate' | 'competitive'

/** Default arc → machine approach time (seconds) for Ski/Row. */
export const HYROX_ERG_APPROACH_DEFAULT_SEC = '15'

export type HyroxCalculatorState = {
  scenario: HyroxScenario | 'custom'
  runPace: string
  skiPacePer500: string
  rowPacePer500: string
  /** Seconds from run arc to SkiErg (and back into flow) — editable. */
  skiApproachSec: string
  /** Seconds from run arc to RowErg — editable. */
  rowApproachSec: string
  sledPush: string
  sledPull: string
  burpees: string
  farmers: string
  lunges: string
  wallBalls: string
  /** Total Roxzone / transition time for the whole race (not average). */
  roxzoneTotal: string
}

/** Shared HYROX pacing table defaults (Open-division style). */
export const HYROX_SCENARIO_DEFAULTS: Record<
  HyroxScenario,
  Omit<HyroxCalculatorState, 'scenario'>
> = {
  recreational: {
    runPace: '5:05',
    skiPacePer500: '2:15',
    rowPacePer500: '2:07.5',
    skiApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    rowApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    sledPush: '3:00',
    sledPull: '4:40',
    burpees: '4:30',
    farmers: '2:20',
    lunges: '4:50',
    wallBalls: '6:15',
    roxzoneTotal: '4:30',
  },
  intermediate: {
    runPace: '4:00',
    skiPacePer500: '1:52.5',
    rowPacePer500: '1:47.5',
    skiApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    rowApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    sledPush: '2:20',
    sledPull: '3:40',
    burpees: '3:40',
    farmers: '2:00',
    lunges: '4:30',
    wallBalls: '5:30',
    roxzoneTotal: '3:30',
  },
  competitive: {
    runPace: '3:45',
    skiPacePer500: '1:37.5',
    rowPacePer500: '1:32.5',
    skiApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    rowApproachSec: HYROX_ERG_APPROACH_DEFAULT_SEC,
    sledPush: '1:40',
    sledPull: '3:00',
    burpees: '2:50',
    farmers: '1:30',
    lunges: '4:00',
    wallBalls: '5:40',
    roxzoneTotal: '2:30',
  },
}

export type HyroxSplit = {
  id: string
  label: string
  minutes: number
}

export type HyroxResult = {
  runMin: number | null
  skiMachineMin: number | null
  skiApproachMin: number | null
  skiMin: number | null
  rowMachineMin: number | null
  rowApproachMin: number | null
  rowMin: number | null
  sledPushMin: number | null
  sledPullMin: number | null
  burpeesMin: number | null
  farmersMin: number | null
  lungesMin: number | null
  wallBallsMin: number | null
  stationsMin: number | null
  roxzoneMin: number | null
  totalMin: number | null
  splits: HyroxSplit[]
  /** Finish time if run pace improves by 10 s/km (other inputs unchanged). */
  whatIfFasterRunMin: number | null
  /** Average minutes per HYROX "lap" (run + station + share of roxzone). */
  avgLapMin: number | null
}

const RUN_LAPS = 8

function parseFlexibleMinutes(input: string): number | null {
  return parseRaceTimeToMinutes(input) ?? parseDurationToMinutes(input)
}

function parseApproachMinutes(input: string | undefined): number | null {
  if (input == null || input.trim() === '') return 15 / 60
  const asSec = Number.parseFloat(input.replace(',', '.'))
  if (Number.isFinite(asSec) && asSec >= 0) return asSec / 60
  const asMin = parseFlexibleMinutes(input)
  return asMin != null && asMin >= 0 ? asMin : null
}

/** Erg 1000 m time from pace per 500 m. */
export function erg1000MinutesFromPacePer500(paceMinPer500: number): number {
  return paceMinPer500 * 2
}

export function computeHyroxResult(state: HyroxCalculatorState): HyroxResult {
  const runPace = parsePaceMinPerKm(state.runPace)
  const skiPace = parsePaceMinPerKm(state.skiPacePer500)
  const rowPace = parsePaceMinPerKm(state.rowPacePer500)
  const skiApproachMin = parseApproachMinutes(state.skiApproachSec)
  const rowApproachMin = parseApproachMinutes(state.rowApproachSec)
  const sledPush = parseFlexibleMinutes(state.sledPush)
  const sledPull = parseFlexibleMinutes(state.sledPull)
  const burpees = parseFlexibleMinutes(state.burpees)
  const farmers = parseFlexibleMinutes(state.farmers)
  const lunges = parseFlexibleMinutes(state.lunges)
  const wallBalls = parseFlexibleMinutes(state.wallBalls)
  const roxzoneMin = parseFlexibleMinutes(state.roxzoneTotal)

  const skiMachineMin = skiPace != null ? erg1000MinutesFromPacePer500(skiPace) : null
  const rowMachineMin = rowPace != null ? erg1000MinutesFromPacePer500(rowPace) : null
  const skiMin =
    skiMachineMin != null && skiApproachMin != null ? skiMachineMin + skiApproachMin : null
  const rowMin =
    rowMachineMin != null && rowApproachMin != null ? rowMachineMin + rowApproachMin : null
  const runMin = runPace != null ? RUN_LAPS * runPace : null

  const stationParts = [skiMin, sledPush, sledPull, burpees, rowMin, farmers, lunges, wallBalls]
  const stationsMin = stationParts.every((v) => v != null)
    ? stationParts.reduce((sum, v) => sum + (v as number), 0)
    : null

  const totalParts = [runMin, stationsMin, roxzoneMin]
  const totalMin = totalParts.every((v) => v != null)
    ? (runMin as number) + (stationsMin as number) + (roxzoneMin as number)
    : null

  const stationTimes: Partial<Record<HyroxStationId, number>> = {
    ski: skiMin ?? undefined,
    sledPush: sledPush ?? undefined,
    sledPull: sledPull ?? undefined,
    burpees: burpees ?? undefined,
    row: rowMin ?? undefined,
    farmers: farmers ?? undefined,
    lunges: lunges ?? undefined,
    wallBalls: wallBalls ?? undefined,
  }

  const splits: HyroxSplit[] = []
  if (runPace != null) {
    for (let i = 0; i < RUN_LAPS; i++) {
      const station = HYROX_STATIONS[i]!
      splits.push({
        id: `run-${i + 1}`,
        label: `Run ${i + 1}`,
        minutes: runPace,
      })
      const stationMin = stationTimes[station.id]
      if (stationMin != null) {
        splits.push({
          id: station.id,
          label: station.label,
          minutes: stationMin,
        })
      }
    }
  }

  const fasterRunPace = runPace != null ? runPace - 10 / 60 : null
  const whatIfFasterRunMin =
    totalMin != null && runPace != null && fasterRunPace != null && fasterRunPace > 0
      ? totalMin - RUN_LAPS * (runPace - fasterRunPace)
      : null

  return {
    runMin,
    skiMachineMin,
    skiApproachMin,
    skiMin,
    rowMachineMin,
    rowApproachMin,
    rowMin,
    sledPushMin: sledPush,
    sledPullMin: sledPull,
    burpeesMin: burpees,
    farmersMin: farmers,
    lungesMin: lunges,
    wallBallsMin: wallBalls,
    stationsMin,
    roxzoneMin,
    totalMin,
    splits,
    whatIfFasterRunMin,
    avgLapMin: totalMin != null ? totalMin / RUN_LAPS : null,
  }
}

export function formatHyroxTime(totalMinutes: number): string {
  return formatRaceTime(totalMinutes)
}

export function buildDefaultHyroxState(runPaceFallback = '5:00'): HyroxCalculatorState {
  const base = HYROX_SCENARIO_DEFAULTS.intermediate
  return {
    scenario: 'intermediate',
    ...base,
    runPace: runPaceFallback || base.runPace,
    skiApproachSec: base.skiApproachSec || HYROX_ERG_APPROACH_DEFAULT_SEC,
    rowApproachSec: base.rowApproachSec || HYROX_ERG_APPROACH_DEFAULT_SEC,
  }
}

/** Merge persisted hyrox state with defaults for newly added fields. */
export function normalizeHyroxState(
  partial: Partial<HyroxCalculatorState> & { roxzoneAvg?: string } | undefined,
  runPaceFallback = '5:00',
): HyroxCalculatorState {
  const defaults = buildDefaultHyroxState(runPaceFallback)
  const legacyAvg = partial && 'roxzoneAvg' in partial ? partial.roxzoneAvg : undefined
  let roxzoneTotal = partial?.roxzoneTotal || defaults.roxzoneTotal
  if (!partial?.roxzoneTotal && legacyAvg) {
    const avgMin = parseFlexibleMinutes(legacyAvg)
    if (avgMin != null) {
      roxzoneTotal = formatRaceTime(avgMin * 8)
    }
  }
  const { roxzoneAvg: _legacy, ...rest } = (partial ?? {}) as Partial<HyroxCalculatorState> & {
    roxzoneAvg?: string
  }
  return {
    ...defaults,
    ...rest,
    skiApproachSec: partial?.skiApproachSec || defaults.skiApproachSec,
    rowApproachSec: partial?.rowApproachSec || defaults.rowApproachSec,
    roxzoneTotal,
  }
}
