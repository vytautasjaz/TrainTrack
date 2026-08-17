import { SessionType, WorkoutType } from '@prisma/client'
import { PACE_ZONE_FIELDS, paceZoneForSessionType } from '@/lib/athlete-preferences'
import { BIKE_WORKOUT_KINDS, type BikeWorkoutKind } from '@/lib/bike-workout/defaults'
import { getSessionTypeLabel, sessionTypesForSport } from '@/lib/workout-builder/session-modes'

export const PACE_TARGET_OPTIONS = PACE_ZONE_FIELDS.map((zone) => ({
  id: zone.name as PaceTargetId,
  label: zone.label,
}))

export const HR_TARGET_OPTIONS = [
  { id: 'z1', label: 'Z1' },
  { id: 'z2', label: 'Z2' },
  { id: 'z3', label: 'Z3' },
  { id: 'z4', label: 'Z4' },
  { id: 'z5', label: 'Z5' },
] as const

export const BIKE_INTENSITY_TARGET_OPTIONS = [
  { id: 'recovery', label: 'Recovery' },
  { id: 'easy', label: 'Easy / Endurance' },
  { id: 'tempo', label: 'Tempo / Sweet Spot' },
  { id: 'threshold', label: 'Threshold' },
  { id: 'vo2max', label: 'VO₂ max / Sprint' },
] as const

export type PaceTargetId = (typeof PACE_ZONE_FIELDS)[number]['name']
export type HrTargetId = (typeof HR_TARGET_OPTIONS)[number]['id']
export type BikeIntensityTargetId = (typeof BIKE_INTENSITY_TARGET_OPTIONS)[number]['id']

export type WorkoutTypePrefSport = 'RUN' | 'BIKE' | 'SWIM'

export type WorkoutSessionOptionPref = {
  id: string
  sessionType: SessionType
  name: string
  paceTarget: PaceTargetId | null
  hrTarget: HrTargetId | null
  enabled: boolean
}

export type BikeKindOptionPref = {
  id: string
  kind: BikeWorkoutKind
  name: string
  intensityTarget: BikeIntensityTargetId | null
  hrTarget: HrTargetId | null
  enabled: boolean
}

export type WorkoutTypePrefs = {
  RUN?: WorkoutSessionOptionPref[]
  BIKE?: BikeKindOptionPref[]
  SWIM?: WorkoutSessionOptionPref[]
}

const PACE_TARGET_IDS = new Set(PACE_TARGET_OPTIONS.map((o) => o.id))
const HR_TARGET_IDS = new Set(HR_TARGET_OPTIONS.map((o) => o.id))
const BIKE_INTENSITY_IDS = new Set(BIKE_INTENSITY_TARGET_OPTIONS.map((o) => o.id))
const BIKE_KIND_IDS = new Set(BIKE_WORKOUT_KINDS.map((k) => k.id))

function paceTargetFromZoneKey(key: string): PaceTargetId {
  const match = PACE_ZONE_FIELDS.find((z) => z.key === key)
  return (match?.name ?? 'easy') as PaceTargetId
}

function defaultHrForSession(sessionType: SessionType): HrTargetId | null {
  switch (sessionType) {
    case SessionType.RECOVERY_RUN:
      return 'z1'
    case SessionType.EASY_RUN:
    case SessionType.LONG_RUN:
    case SessionType.CROSS_TRAINING:
      return 'z2'
    case SessionType.TEMPO:
    case SessionType.FARTLEK:
      return 'z3'
    case SessionType.THRESHOLD:
    case SessionType.RACE_PACE:
    case SessionType.BRICK:
      return 'z4'
    case SessionType.VO2_MAX:
    case SessionType.INTERVALS:
    case SessionType.HILL_REPEATS:
    case SessionType.HYROX:
      return 'z5'
    default:
      return null
  }
}

function defaultHrForBikeKind(kind: BikeWorkoutKind): HrTargetId | null {
  switch (kind) {
    case 'RECOVERY':
      return 'z1'
    case 'EASY':
    case 'ENDURANCE':
    case 'LONG':
      return 'z2'
    case 'TEMPO':
    case 'SWEET_SPOT':
      return 'z3'
    case 'THRESHOLD':
    case 'RACE':
      return 'z4'
    case 'VO2':
    case 'SPRINT':
    case 'HILLS':
      return 'z5'
    default:
      return null
  }
}

function defaultIntensityForBikeKind(kind: BikeWorkoutKind): BikeIntensityTargetId | null {
  switch (kind) {
    case 'RECOVERY':
      return 'recovery'
    case 'TEMPO':
    case 'SWEET_SPOT':
      return 'tempo'
    case 'THRESHOLD':
    case 'RACE':
      return 'threshold'
    case 'VO2':
    case 'SPRINT':
    case 'HILLS':
      return 'vo2max'
    case 'CUSTOM':
      return null
    default:
      return 'easy'
  }
}

function newPrefId(): string {
  return `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function defaultRunSessionOptions(): WorkoutSessionOptionPref[] {
  return sessionTypesForSport(WorkoutType.RUN).map((sessionType) => ({
    id: `run:${sessionType}`,
    sessionType,
    name: getSessionTypeLabel(sessionType, WorkoutType.RUN),
    paceTarget: paceTargetFromZoneKey(paceZoneForSessionType(sessionType)),
    hrTarget: defaultHrForSession(sessionType),
    enabled: true,
  }))
}

export function defaultSwimSessionOptions(): WorkoutSessionOptionPref[] {
  return sessionTypesForSport(WorkoutType.SWIM).map((sessionType) => ({
    id: `swim:${sessionType}`,
    sessionType,
    name: getSessionTypeLabel(sessionType, WorkoutType.SWIM),
    paceTarget: paceTargetFromZoneKey(paceZoneForSessionType(sessionType)),
    hrTarget: defaultHrForSession(sessionType),
    enabled: true,
  }))
}

export function defaultBikeKindOptions(): BikeKindOptionPref[] {
  return BIKE_WORKOUT_KINDS.map((option) => ({
    id: `bike:${option.id}`,
    kind: option.id,
    name: option.label,
    intensityTarget: defaultIntensityForBikeKind(option.id),
    hrTarget: defaultHrForBikeKind(option.id),
    enabled: true,
  }))
}

export function createBlankSessionOption(): WorkoutSessionOptionPref {
  return {
    id: newPrefId(),
    sessionType: SessionType.CUSTOM,
    name: 'New',
    paceTarget: 'easy',
    hrTarget: 'z2',
    enabled: true,
  }
}

export function createBlankBikeOption(): BikeKindOptionPref {
  return {
    id: newPrefId(),
    kind: 'CUSTOM',
    name: 'New',
    intensityTarget: 'easy',
    hrTarget: 'z2',
    enabled: true,
  }
}

export function defaultWorkoutTypePrefs(): WorkoutTypePrefs {
  return {
    RUN: defaultRunSessionOptions(),
    BIKE: defaultBikeKindOptions(),
    SWIM: defaultSwimSessionOptions(),
  }
}

function isSessionType(value: unknown): value is SessionType {
  return typeof value === 'string' && (Object.values(SessionType) as string[]).includes(value)
}

function parsePaceTarget(value: unknown): PaceTargetId | null {
  if (value == null || value === '') return null
  return typeof value === 'string' && PACE_TARGET_IDS.has(value as PaceTargetId)
    ? (value as PaceTargetId)
    : null
}

function parseHrTarget(value: unknown): HrTargetId | null {
  if (value == null || value === '') return null
  return typeof value === 'string' && HR_TARGET_IDS.has(value as HrTargetId)
    ? (value as HrTargetId)
    : null
}

function parseBikeIntensity(value: unknown): BikeIntensityTargetId | null {
  if (value == null || value === '') return null
  return typeof value === 'string' && BIKE_INTENSITY_IDS.has(value as BikeIntensityTargetId)
    ? (value as BikeIntensityTargetId)
    : null
}

function parseSessionRows(
  raw: unknown,
  defaults: WorkoutSessionOptionPref[],
  sport: 'RUN' | 'SWIM',
): WorkoutSessionOptionPref[] {
  if (!Array.isArray(raw)) return defaults.map((row) => ({ ...row }))
  if (raw.length === 0) return []

  const usedIds = new Set<string>()
  const ordered: WorkoutSessionOptionPref[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    if (!isSessionType(row.sessionType)) return
    const fallback = defaults.find((d) => d.sessionType === row.sessionType)
    let id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `${sport}:${row.sessionType}${index > 0 ? `:${index}` : ''}`
    if (usedIds.has(id)) id = `${id}:${index}`
    usedIds.add(id)
    ordered.push({
      id,
      sessionType: row.sessionType,
      name:
        typeof row.name === 'string' && row.name.trim()
          ? row.name.trim()
          : (fallback?.name ?? getSessionTypeLabel(row.sessionType, WorkoutType.RUN)),
      paceTarget: 'paceTarget' in row ? parsePaceTarget(row.paceTarget) : (fallback?.paceTarget ?? null),
      hrTarget: 'hrTarget' in row ? parseHrTarget(row.hrTarget) : (fallback?.hrTarget ?? null),
      enabled: row.enabled === false ? false : true,
    })
  })
  return ordered
}

function parseBikeRows(raw: unknown): BikeKindOptionPref[] {
  const defaults = defaultBikeKindOptions()
  if (!Array.isArray(raw)) return defaults.map((row) => ({ ...row }))
  if (raw.length === 0) return []

  const usedIds = new Set<string>()
  const ordered: BikeKindOptionPref[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    if (typeof row.kind !== 'string' || !BIKE_KIND_IDS.has(row.kind as BikeWorkoutKind)) return
    const kind = row.kind as BikeWorkoutKind
    const fallback = defaults.find((d) => d.kind === kind)
    let id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `bike:${kind}${index > 0 ? `:${index}` : ''}`
    if (usedIds.has(id)) id = `${id}:${index}`
    usedIds.add(id)
    ordered.push({
      id,
      kind,
      name:
        typeof row.name === 'string' && row.name.trim()
          ? row.name.trim()
          : (fallback?.name ?? kind),
      intensityTarget:
        'intensityTarget' in row
          ? parseBikeIntensity(row.intensityTarget)
          : (fallback?.intensityTarget ?? null),
      hrTarget: 'hrTarget' in row ? parseHrTarget(row.hrTarget) : (fallback?.hrTarget ?? null),
      enabled: row.enabled === false ? false : true,
    })
  })
  return ordered
}

export function parseWorkoutTypePrefs(raw: unknown): WorkoutTypePrefs {
  if (!raw || typeof raw !== 'object') return defaultWorkoutTypePrefs()
  const root = raw as Record<string, unknown>
  const source =
    root.sessionOptions && typeof root.sessionOptions === 'object'
      ? (root.sessionOptions as Record<string, unknown>)
      : root
  return {
    RUN: parseSessionRows(source.RUN, defaultRunSessionOptions(), 'RUN'),
    BIKE: parseBikeRows(source.BIKE),
    SWIM: parseSessionRows(source.SWIM, defaultSwimSessionOptions(), 'SWIM'),
  }
}

export function workoutTypePrefsToJson(prefs: WorkoutTypePrefs): Record<string, unknown> {
  return {
    RUN: prefs.RUN ?? defaultRunSessionOptions(),
    BIKE: prefs.BIKE ?? defaultBikeKindOptions(),
    SWIM: prefs.SWIM ?? defaultSwimSessionOptions(),
  }
}

export function sessionOptionById(
  prefs: WorkoutTypePrefs | null | undefined,
  sportType: WorkoutType,
  id: string,
): WorkoutSessionOptionPref | undefined {
  const rows = sportType === WorkoutType.SWIM ? prefs?.SWIM : prefs?.RUN
  return rows?.find((row) => row.id === id)
}

export function bikeOptionById(
  prefs: WorkoutTypePrefs | null | undefined,
  id: string,
): BikeKindOptionPref | undefined {
  return prefs?.BIKE?.find((row) => row.id === id)
}

export function sessionOptionForType(
  prefs: WorkoutTypePrefs | null | undefined,
  sportType: WorkoutType,
  sessionType: SessionType,
): WorkoutSessionOptionPref | undefined {
  const rows = sportType === WorkoutType.SWIM ? prefs?.SWIM : prefs?.RUN
  return rows?.find((row) => row.sessionType === sessionType)
}

export function bikeKindOption(
  prefs: WorkoutTypePrefs | null | undefined,
  kind: BikeWorkoutKind,
): BikeKindOptionPref | undefined {
  return prefs?.BIKE?.find((row) => row.kind === kind)
}

export function customSessionTypeLabel(
  sessionType: SessionType,
  sportType: WorkoutType,
  prefs?: WorkoutTypePrefs | null,
  optionId?: string | null,
): string {
  const byId = optionId ? sessionOptionById(prefs, sportType, optionId) : undefined
  if (byId?.name.trim()) return byId.name.trim()
  const row = sessionOptionForType(prefs, sportType, sessionType)
  if (row?.name.trim()) return row.name.trim()
  return getSessionTypeLabel(sessionType, sportType)
}

export function customBikeKindLabel(
  kind: BikeWorkoutKind,
  prefs?: WorkoutTypePrefs | null,
  optionId?: string | null,
): string {
  const byId = optionId ? bikeOptionById(prefs, optionId) : undefined
  if (byId?.name.trim()) return byId.name.trim()
  const row = bikeKindOption(prefs, kind)
  if (row?.name.trim()) return row.name.trim()
  return BIKE_WORKOUT_KINDS.find((k) => k.id === kind)?.label ?? kind
}

export function enabledSessionOptionRows(
  sportType: WorkoutType,
  prefs?: WorkoutTypePrefs | null,
): WorkoutSessionOptionPref[] {
  const defaults =
    sportType === WorkoutType.SWIM ? defaultSwimSessionOptions() : defaultRunSessionOptions()
  const rows = sportType === WorkoutType.SWIM ? prefs?.SWIM : prefs?.RUN
  const source = rows?.length ? rows : defaults
  return source.filter((row) => row.enabled)
}

export function enabledBikeOptionRows(
  prefs?: WorkoutTypePrefs | null,
): BikeKindOptionPref[] {
  const rows = prefs?.BIKE?.length ? prefs.BIKE : defaultBikeKindOptions()
  return rows.filter((row) => row.enabled)
}

export function enabledSessionTypes(
  sportType: WorkoutType,
  prefs?: WorkoutTypePrefs | null,
): SessionType[] {
  const defaults = sessionTypesForSport(sportType)
  const enabled = enabledSessionOptionRows(sportType, prefs).map((row) => row.sessionType)
  if (enabled.length === 0) return defaults
  return [...new Set(enabled)]
}

export function enabledBikeKinds(
  prefs?: WorkoutTypePrefs | null,
): BikeWorkoutKind[] {
  const enabled = enabledBikeOptionRows(prefs).map((row) => row.kind)
  return enabled.length > 0 ? enabled : BIKE_WORKOUT_KINDS.map((k) => k.id)
}

export function paceTargetLabel(id: PaceTargetId | null): string {
  if (!id) return ''
  return PACE_TARGET_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function hrTargetLabel(id: HrTargetId | null): string {
  if (!id) return ''
  return HR_TARGET_OPTIONS.find((o) => o.id === id)?.label ?? id
}
