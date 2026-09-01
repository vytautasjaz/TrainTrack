import { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { Target, WorkoutBlock, WorkoutStructure } from '@/lib/workout-builder/types'
import { flattenStructure } from '@/lib/workout-builder/structure-list'

/** Zones that map to athlete pace / bike-speed preference fields. */
export type IntensityPrefZone =
  | 'recovery'
  | 'easy'
  | 'tempo'
  | 'threshold'
  | 'vo2max'

const ZONE_LABEL: Record<IntensityPrefZone, string> = {
  recovery: 'Recovery',
  easy: 'Easy',
  tempo: 'Tempo',
  threshold: 'Threshold',
  vo2max: 'VO₂ max',
}

const RUN_PREF_KEY: Record<IntensityPrefZone, keyof AthletePreferences> = {
  recovery: 'paceRecoveryMinPerKm',
  easy: 'paceEasyMinPerKm',
  tempo: 'paceTempoMinPerKm',
  threshold: 'paceThresholdMinPerKm',
  vo2max: 'paceVo2MaxMinPerKm',
}

const BIKE_PREF_KEY: Record<IntensityPrefZone, keyof AthletePreferences> = {
  recovery: 'bikeSpeedRecoveryKph',
  easy: 'bikeSpeedEasyKph',
  tempo: 'bikeSpeedTempoKph',
  threshold: 'bikeSpeedThresholdKph',
  vo2max: 'bikeSpeedVo2MaxKph',
}

function zoneFromHrNumber(zone: number): IntensityPrefZone | null {
  switch (zone) {
    case 1:
      return 'recovery'
    case 2:
      return 'easy'
    case 3:
      return 'tempo'
    case 4:
      return 'threshold'
    case 5:
      return 'vo2max'
    default:
      return null
  }
}

function zoneFromRpeNumber(rpe: number): IntensityPrefZone {
  if (rpe <= 2) return 'recovery'
  if (rpe <= 4) return 'easy'
  if (rpe <= 6) return 'tempo'
  if (rpe <= 8) return 'threshold'
  return 'vo2max'
}

/** Infer preference zones referenced by free-text intensity (Easy, Z4, Threshold, …). */
export function intensityZonesFromText(value: string): IntensityPrefZone[] {
  const v = value.trim().toLowerCase()
  if (!v) return []

  const zones = new Set<IntensityPrefZone>()

  if (v.includes('recovery') || /\bz\s*1\b/.test(v)) zones.add('recovery')
  if (
    v.includes('easy') ||
    v.includes('endurance') ||
    /\bz\s*2\b/.test(v)
  ) {
    zones.add('easy')
  }
  if (
    v.includes('tempo') ||
    v.includes('sweet') ||
    v.includes('marathon') ||
    /\bz\s*3\b/.test(v) ||
    v.includes('moderate')
  ) {
    zones.add('tempo')
  }
  if (v.includes('threshold') || /\bz\s*4\b/.test(v) || v.includes('hard')) {
    zones.add('threshold')
  }
  if (
    v.includes('vo2') ||
    v.includes('vo₂') ||
    v.includes('5k') ||
    v.includes('sprint') ||
    v.includes('interval') ||
    /\bz\s*5\b/.test(v) ||
    v.includes('max')
  ) {
    zones.add('vo2max')
  }

  return [...zones]
}

function addZonesFromTarget(target: Target | undefined, into: Set<IntensityPrefZone>) {
  if (!target) return
  const value = (target.value ?? '').trim()
  if (!value) return

  if (target.type === 'heartRateZone') {
    const zone = parseInt(value.replace(/\D/g, ''), 10)
    const mapped = zoneFromHrNumber(zone)
    if (mapped) into.add(mapped)
    return
  }

  if (target.type === 'rpe') {
    const rpe = parseInt(value, 10)
    if (!Number.isNaN(rpe) && rpe >= 1 && rpe <= 10) {
      into.add(zoneFromRpeNumber(rpe))
      return
    }
  }

  // Absolute pace / watts / speed — no athlete zone preference required.
  if (
    target.type === 'pace' ||
    target.type === 'power' ||
    target.type === 'speed' ||
    /\d+:\d{1,2}/.test(value) ||
    value.includes('/km') ||
    value.includes('w') ||
    value.includes('kph') ||
    value.includes('km/h')
  ) {
    // Still allow keyword overlays like "Threshold 4:30"
    for (const zone of intensityZonesFromText(value)) into.add(zone)
    if (/\d/.test(value) && intensityZonesFromText(value).length === 0) return
  }

  for (const zone of intensityZonesFromText(value)) into.add(zone)
}

function collectZonesFromBlock(block: WorkoutBlock, into: Set<IntensityPrefZone>) {
  for (const target of block.targets ?? []) addZonesFromTarget(target, into)
  addZonesFromTarget(block.startIntensity, into)
  addZonesFromTarget(block.endIntensity, into)
  if (block.work?.description) {
    for (const zone of intensityZonesFromText(block.work.description)) into.add(zone)
  }
  if (block.recovery?.description) {
    for (const zone of intensityZonesFromText(block.recovery.description)) into.add(zone)
  }
}

export function collectIntensityZonesFromStructure(
  structure: WorkoutStructure | null | undefined,
): IntensityPrefZone[] {
  if (!structure) return []
  const into = new Set<IntensityPrefZone>()
  for (const { block } of flattenStructure(structure)) {
    collectZonesFromBlock(block, into)
  }
  return [...into]
}

function prefValue(
  preferences: AthletePreferences | null | undefined,
  sportType: WorkoutType,
  zone: IntensityPrefZone,
): number | null {
  if (!preferences) return null
  const key =
    sportType === WorkoutType.BIKE ? BIKE_PREF_KEY[zone] : RUN_PREF_KEY[zone]
  const value = preferences[key]
  return typeof value === 'number' && value > 0 ? value : null
}

export function missingIntensityZones(
  structure: WorkoutStructure | null | undefined,
  preferences: AthletePreferences | null | undefined,
  sportType: WorkoutType,
): IntensityPrefZone[] {
  if (sportType !== WorkoutType.RUN && sportType !== WorkoutType.BIKE) return []
  // Without a prefs record we can't tell which zones are missing vs unset profile.
  if (!preferences) return []

  return collectIntensityZonesFromStructure(structure).filter(
    (zone) => prefValue(preferences, sportType, zone) == null,
  )
}

export function missingIntensityZoneLabels(
  structure: WorkoutStructure | null | undefined,
  preferences: AthletePreferences | null | undefined,
  sportType: WorkoutType,
): string[] {
  return missingIntensityZones(structure, preferences, sportType).map(
    (zone) => ZONE_LABEL[zone],
  )
}

export function formatMissingIntensityZoneMessage(
  labels: string[],
  sportType: WorkoutType,
): string {
  if (labels.length === 0) return ''
  const metric = sportType === WorkoutType.BIKE ? 'speed' : 'pace'
  if (labels.length === 1) {
    return `${labels[0]} ${metric} isn’t set in this athlete’s preferences — distance/time estimates will use defaults.`
  }
  const head = labels.slice(0, -1).join(', ')
  const last = labels[labels.length - 1]
  return `${head} and ${last} ${metric}s aren’t set in this athlete’s preferences — distance/time estimates will use defaults.`
}
