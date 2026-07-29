import type { CalculatorDefaults } from '@/lib/calculators/prefill'
import type { IntervalPresetId } from '@/lib/calculators/interval-distances'
import type { RunningPresetId, TriathlonPresetId } from '@/lib/calculators/race-distances'
import {
  buildDefaultHyroxState,
  normalizeHyroxState,
  type HyroxCalculatorState,
} from '@/lib/calculators/hyrox'
import {
  buildDefaultSplitsState,
  normalizeSplitsState,
  type SplitsCalculatorState,
} from '@/lib/calculators/splits'
import { parsePaceMinPerKm } from '@/lib/athlete-preferences'

export const CALCULATOR_STORAGE_KEY = 'traintrack:calculators:v2'

export type CalculatorTab = 'running' | 'triathlon' | 'interval' | 'hyrox' | 'splits'
export type CalculatorDirection = 'pace-to-time' | 'time-to-pace'

export type RunningCalculatorState = {
  direction: CalculatorDirection
  pace: string
  customDistanceKm: string
  reversePreset: RunningPresetId | 'custom'
  reverseFinishTime: string
  atPaceCustomDistanceKm: string
}

export type TriathlonCalculatorState = {
  direction: CalculatorDirection
  swimPacePer100m: string
  t1: string
  bikeSpeedKmh: string
  t2: string
  runPace: string
  customSwimKm: string
  customBikeKm: string
  customRunKm: string
  reversePreset: TriathlonPresetId | 'custom'
  reverseSwimTime: string
  reverseBikeTime: string
  reverseRunTime: string
}

export type IntervalCalculatorState = {
  direction: CalculatorDirection
  pace: string
  customDistanceM: string
  reversePreset: IntervalPresetId | 'custom'
  reverseFinishTime: string
  reverseCustomDistanceM: string
  atPaceCustomDistanceM: string
}

export type CalculatorPersistedState = {
  activeTab: CalculatorTab
  running: RunningCalculatorState
  triathlon: TriathlonCalculatorState
  interval: IntervalCalculatorState
  hyrox: HyroxCalculatorState
  splits: SplitsCalculatorState
}

export function buildInitialCalculatorState(
  defaults: CalculatorDefaults,
): CalculatorPersistedState {
  return {
    activeTab: 'running',
    running: {
      direction: 'pace-to-time',
      pace: defaults.runningPace,
      customDistanceKm: '',
      reversePreset: '10k',
      reverseFinishTime: '',
      atPaceCustomDistanceKm: '10',
    },
    triathlon: {
      direction: 'pace-to-time',
      swimPacePer100m: defaults.triathlonSwimPace,
      t1: defaults.triathlonT1,
      bikeSpeedKmh: defaults.triathlonBikeSpeed,
      t2: defaults.triathlonT2,
      runPace: defaults.triathlonRunPace,
      customSwimKm: '1.5',
      customBikeKm: '40',
      customRunKm: '10',
      reversePreset: 'olympic',
      reverseSwimTime: '',
      reverseBikeTime: '',
      reverseRunTime: '',
    },
    interval: {
      direction: 'pace-to-time',
      pace: defaults.runningPace,
      customDistanceM: '',
      reversePreset: '1000',
      reverseFinishTime: '',
      reverseCustomDistanceM: '',
      atPaceCustomDistanceM: '400',
    },
    hyrox: buildDefaultHyroxState(defaults.runningPace),
    splits: buildDefaultSplitsState(parsePaceMinPerKm(defaults.runningPace)),
  }
}

function migrateFromV1(parsed: Record<string, unknown>, defaults: CalculatorDefaults): CalculatorPersistedState | null {
  const running = parsed.running as Record<string, unknown> | undefined
  const triathlon = parsed.triathlon as Record<string, unknown> | undefined
  if (!running || !triathlon) return null

  const initial = buildInitialCalculatorState(defaults)
  return {
    activeTab: (parsed.activeTab as CalculatorTab) ?? initial.activeTab,
    running: {
      ...initial.running,
      pace: typeof running.pace === 'string' ? running.pace : initial.running.pace,
      customDistanceKm:
        typeof running.customDistanceKm === 'string'
          ? running.customDistanceKm
          : initial.running.customDistanceKm,
    },
    triathlon: {
      ...initial.triathlon,
      swimPacePer100m:
        typeof triathlon.swimPacePer100m === 'string'
          ? triathlon.swimPacePer100m
          : initial.triathlon.swimPacePer100m,
      t1: typeof triathlon.t1 === 'string' ? triathlon.t1 : initial.triathlon.t1,
      bikeSpeedKmh:
        typeof triathlon.bikeSpeedKmh === 'string'
          ? triathlon.bikeSpeedKmh
          : initial.triathlon.bikeSpeedKmh,
      t2: typeof triathlon.t2 === 'string' ? triathlon.t2 : initial.triathlon.t2,
      runPace: typeof triathlon.runPace === 'string' ? triathlon.runPace : initial.triathlon.runPace,
      customSwimKm:
        typeof triathlon.customSwimKm === 'string'
          ? triathlon.customSwimKm
          : initial.triathlon.customSwimKm,
      customBikeKm:
        typeof triathlon.customBikeKm === 'string'
          ? triathlon.customBikeKm
          : initial.triathlon.customBikeKm,
      customRunKm:
        typeof triathlon.customRunKm === 'string'
          ? triathlon.customRunKm
          : initial.triathlon.customRunKm,
    },
    interval: initial.interval,
    hyrox: initial.hyrox,
    splits: initial.splits,
  }
}

function migrateRunningState(
  running: RunningCalculatorState & {
    presetTimes?: Partial<Record<RunningPresetId, string>>
    customTime?: string
  },
  initial: RunningCalculatorState,
): RunningCalculatorState {
  const merged = { ...initial, ...running }
  if (merged.reverseFinishTime) return merged

  const legacyPresetTime = running.presetTimes
    ? Object.values(running.presetTimes).find((time) => time?.trim())
    : undefined

  return {
    ...merged,
    reverseFinishTime: running.customTime?.trim() || legacyPresetTime || '',
  }
}

export function loadCalculatorState(defaults: CalculatorDefaults): CalculatorPersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CALCULATOR_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CalculatorPersistedState & {
        running?: RunningCalculatorState & {
          presetTimes?: Partial<Record<RunningPresetId, string>>
          customTime?: string
        }
      }
      if (parsed?.running?.direction && parsed?.triathlon?.direction) {
        const initial = buildInitialCalculatorState(defaults)
        return {
          ...initial,
          ...parsed,
          running: migrateRunningState(parsed.running, initial.running),
          triathlon: { ...initial.triathlon, ...parsed.triathlon },
          interval: { ...initial.interval, ...parsed.interval },
          hyrox: normalizeHyroxState(
            (parsed as CalculatorPersistedState).hyrox,
            defaults.runningPace,
          ),
          splits: normalizeSplitsState(
            (parsed as CalculatorPersistedState).splits,
            parsePaceMinPerKm(defaults.runningPace),
          ),
        }
      }
    }

    const legacyRaw = localStorage.getItem('traintrack:calculators:v1')
    if (legacyRaw) {
      return migrateFromV1(JSON.parse(legacyRaw) as Record<string, unknown>, defaults)
    }

    return null
  } catch {
    return null
  }
}

export function saveCalculatorState(state: CalculatorPersistedState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}
