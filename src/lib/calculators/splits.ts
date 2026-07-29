import { formatPaceMinPerKmPrecise, parsePaceMinPerKm } from '@/lib/athlete-preferences'
import { formatRaceTime, parsePositiveFloat, parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { paceToSpeedKmh } from '@/lib/calculators/pace-zones'

export type SplitsSport = 'run' | 'bike'
export type SplitsMode = 'distance' | 'time'

export type SplitsCalculatorState = {
  sport: SplitsSport
  /** Run pace min/km (e.g. 5:00). */
  runPace: string
  /** Bike speed km/h. */
  bikeSpeedKmh: string
  distanceKm: string
  finishTime: string
  splitMode: SplitsMode
  /** Distance between splits (km), e.g. 1 / 2 / 5. */
  splitEveryKm: string
  /** Time between splits (minutes), e.g. 15 / 30. */
  splitEveryMin: string
}

export type SplitRow = {
  /** 1-based split index (finish row uses label instead). */
  index: number
  isFinish: boolean
  /** Label for the split mark, e.g. "1 km" or "15:00". */
  mark: string
  /** Distance covered at this mark (km). */
  distanceKm: number
  /** Elapsed time at this mark (minutes). */
  elapsedMin: number
}

export function buildDefaultSplitsState(runPaceFallbackMinPerKm?: number | null): SplitsCalculatorState {
  const paceMin =
    runPaceFallbackMinPerKm != null && runPaceFallbackMinPerKm > 0
      ? runPaceFallbackMinPerKm
      : 5
  const runPace = formatPaceMinPerKmPrecise(paceMin)
  const distanceKm = 10
  const finishMin = distanceKm * paceMin

  return {
    sport: 'run',
    runPace,
    bikeSpeedKmh: '30',
    distanceKm: String(distanceKm),
    finishTime: formatRaceTime(finishMin),
    splitMode: 'distance',
    splitEveryKm: '1',
    splitEveryMin: '15',
  }
}

export function normalizeSplitsState(
  partial: Partial<SplitsCalculatorState> & { speedKmh?: string } | undefined,
  runPaceFallbackMinPerKm?: number | null,
): SplitsCalculatorState {
  const defaults = buildDefaultSplitsState(runPaceFallbackMinPerKm)
  const legacySpeed = partial && 'speedKmh' in partial ? partial.speedKmh : undefined
  const { speedKmh: _legacy, ...rest } = (partial ?? {}) as Partial<SplitsCalculatorState> & {
    speedKmh?: string
  }

  let runPace = rest.runPace || defaults.runPace
  let bikeSpeedKmh = rest.bikeSpeedKmh || defaults.bikeSpeedKmh

  // Migrate older single speedKmh field into the active sport input.
  if (legacySpeed && typeof legacySpeed === 'string' && legacySpeed.trim()) {
    if (rest.sport === 'bike' && !rest.bikeSpeedKmh) {
      bikeSpeedKmh = legacySpeed
    } else if (!rest.runPace) {
      const kmh = parsePositiveFloat(legacySpeed)
      if (kmh != null && kmh > 0) {
        runPace = formatPaceMinPerKmPrecise(60 / kmh)
      }
    }
  }

  return {
    ...defaults,
    ...rest,
    runPace,
    bikeSpeedKmh,
    sport: rest.sport === 'bike' || rest.sport === 'run' ? rest.sport : defaults.sport,
    splitMode:
      rest.splitMode === 'time' || rest.splitMode === 'distance'
        ? rest.splitMode
        : defaults.splitMode,
  }
}

function formatDistanceLabel(km: number): string {
  if (Number.isInteger(km)) return `${km} km`
  const rounded = Math.round(km * 100) / 100
  return `${rounded} km`
}

/** Resolve motion rate as km/h from sport-specific inputs. */
export function resolveSpeedKmh(state: SplitsCalculatorState): number | null {
  if (state.sport === 'bike') {
    return parsePositiveFloat(state.bikeSpeedKmh)
  }
  const pace = parsePaceMinPerKm(state.runPace)
  if (pace == null || pace <= 0) return null
  return paceToSpeedKmh(pace)
}

export function resolveSplitsMotion(state: SplitsCalculatorState): {
  speedKmh: number | null
  paceMinPerKm: number | null
  distanceKm: number | null
  finishMin: number | null
} {
  const distance = parsePositiveFloat(state.distanceKm)
  const finishMin = parseRaceTimeToMinutes(state.finishTime)

  if (state.sport === 'run') {
    const pace = parsePaceMinPerKm(state.runPace)
    const speed = pace != null && pace > 0 ? paceToSpeedKmh(pace) : null

    if (pace != null && distance != null) {
      return {
        speedKmh: speed,
        paceMinPerKm: pace,
        distanceKm: distance,
        finishMin: distance * pace,
      }
    }
    if (pace != null && finishMin != null) {
      return {
        speedKmh: speed,
        paceMinPerKm: pace,
        distanceKm: finishMin / pace,
        finishMin,
      }
    }
    if (distance != null && finishMin != null && finishMin > 0) {
      const derivedPace = finishMin / distance
      return {
        speedKmh: paceToSpeedKmh(derivedPace),
        paceMinPerKm: derivedPace,
        distanceKm: distance,
        finishMin,
      }
    }
    return { speedKmh: speed, paceMinPerKm: pace, distanceKm: distance, finishMin }
  }

  const speed = parsePositiveFloat(state.bikeSpeedKmh)
  if (speed != null && distance != null) {
    return {
      speedKmh: speed,
      paceMinPerKm: null,
      distanceKm: distance,
      finishMin: (distance / speed) * 60,
    }
  }
  if (speed != null && finishMin != null) {
    return {
      speedKmh: speed,
      paceMinPerKm: null,
      distanceKm: speed * (finishMin / 60),
      finishMin,
    }
  }
  if (distance != null && finishMin != null && finishMin > 0) {
    return {
      speedKmh: distance / (finishMin / 60),
      paceMinPerKm: null,
      distanceKm: distance,
      finishMin,
    }
  }
  return { speedKmh: speed, paceMinPerKm: null, distanceKm: distance, finishMin }
}

export function computeSplitRows(state: SplitsCalculatorState): SplitRow[] {
  const motion = resolveSplitsMotion(state)
  if (motion.speedKmh == null || motion.speedKmh <= 0) return []
  if (motion.distanceKm == null || motion.distanceKm <= 0) return []
  if (motion.finishMin == null || motion.finishMin <= 0) return []

  const speed = motion.speedKmh
  const totalKm = motion.distanceKm
  const totalMin = motion.finishMin
  const rows: SplitRow[] = []

  if (state.splitMode === 'distance') {
    const everyKm = parsePositiveFloat(state.splitEveryKm)
    if (everyKm == null || everyKm <= 0) return []

    let index = 0
    for (let atKm = everyKm; atKm < totalKm - 1e-9; atKm += everyKm) {
      index += 1
      const elapsedMin = (atKm / speed) * 60
      rows.push({
        index,
        isFinish: false,
        mark: formatDistanceLabel(atKm),
        distanceKm: atKm,
        elapsedMin,
      })
      if (index > 500) break
    }

    rows.push({
      index: index + 1,
      isFinish: true,
      mark: formatDistanceLabel(totalKm),
      distanceKm: totalKm,
      elapsedMin: totalMin,
    })
    return rows
  }

  const everyMin = parsePositiveFloat(state.splitEveryMin)
  if (everyMin == null || everyMin <= 0) return []

  let index = 0
  for (let atMin = everyMin; atMin < totalMin - 1e-9; atMin += everyMin) {
    index += 1
    const distanceKm = speed * (atMin / 60)
    rows.push({
      index,
      isFinish: false,
      mark: formatRaceTime(atMin),
      distanceKm,
      elapsedMin: atMin,
    })
    if (index > 500) break
  }

  rows.push({
    index: index + 1,
    isFinish: true,
    mark: formatRaceTime(totalMin),
    distanceKm: totalKm,
    elapsedMin: totalMin,
  })
  return rows
}
