import { WorkoutStatus, WorkoutType } from '@prisma/client'
import {
  CONFIGURABLE_PLAN_SPORTS,
  isConfigurablePlanSport,
} from '@/lib/plan-sports'

export const PLAN_SPORT_FILTER_STORAGE_KEY = 'tt-plan-visible-sports'
/** Color / Plain only. Legacy `completion` values migrate via parsePlanColorMode. */
export const PLAN_COLOR_MODE_STORAGE_KEY = 'tt-plan-color-mode-v3'
export const PLAN_COMPLETION_LAYER_STORAGE_KEY = 'tt-plan-completion-layer-v1'
/** Pre-v3 key — used once to migrate Color/Plain + Completion layer. */
const PLAN_COLOR_MODE_STORAGE_KEY_V2 = 'tt-plan-color-mode-v2'
export const PLAN_STATUS_FILTER_STORAGE_KEY = 'tt-plan-status-filter'

export const FILTERABLE_PLAN_SPORTS = CONFIGURABLE_PLAN_SPORTS

/** Card fill: sport tint (Color) vs white (Plain). Completion is a separate layer. */
export type PlanColorMode = 'sport' | 'white'
export type PlanStatusFilter = 'done' | 'open' | 'skipped'

export const PLAN_COLOR_MODES: PlanColorMode[] = ['sport', 'white']
export const PLAN_STATUS_FILTERS: PlanStatusFilter[] = ['done', 'open', 'skipped']

export const PLAN_COLOR_MODE_OPTIONS: {
  id: PlanColorMode
  label: string
  hint: string
}[] = [
  { id: 'sport', label: 'Color', hint: 'Tint cards by Run / Bike / Swim…' },
  { id: 'white', label: 'Plain', hint: 'White cards with sport accent' },
]

export const PLAN_STATUS_FILTER_OPTIONS: {
  id: PlanStatusFilter
  label: string
}[] = [
  { id: 'done', label: 'Done' },
  { id: 'open', label: 'Open' },
  { id: 'skipped', label: 'Skipped' },
]

export function defaultVisiblePlanSports(): WorkoutType[] {
  return [...FILTERABLE_PLAN_SPORTS]
}

export function defaultPlanColorMode(): PlanColorMode {
  return 'sport'
}

export function defaultPlanCompletionLayer(): boolean {
  return true
}

export function readStoredPlanColorMode(): PlanColorMode {
  if (typeof window === 'undefined') return defaultPlanColorMode()
  try {
    const v3 = localStorage.getItem(PLAN_COLOR_MODE_STORAGE_KEY)
    if (v3 != null) return parsePlanColorMode(v3)

    const v2 = localStorage.getItem(PLAN_COLOR_MODE_STORAGE_KEY_V2)
    if (v2 != null) {
      const migrated = parsePlanColorMode(v2)
      writeStoredPlanColorMode(migrated)
      return migrated
    }
    return defaultPlanColorMode()
  } catch {
    return defaultPlanColorMode()
  }
}

export function writeStoredPlanColorMode(mode: PlanColorMode) {
  try {
    localStorage.setItem(PLAN_COLOR_MODE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function readStoredPlanCompletionLayer(): boolean {
  if (typeof window === 'undefined') return defaultPlanCompletionLayer()
  try {
    const raw = localStorage.getItem(PLAN_COMPLETION_LAYER_STORAGE_KEY)
    if (raw === '1' || raw === 'true') return true
    if (raw === '0' || raw === 'false') return false

    // Migrate from exclusive v2 modes: completion → on; Color/Plain → off.
    const v2 = localStorage.getItem(PLAN_COLOR_MODE_STORAGE_KEY_V2)
    if (v2 === 'completion') {
      writeStoredPlanCompletionLayer(true)
      return true
    }
    if (v2 === 'sport' || v2 === 'white') {
      writeStoredPlanCompletionLayer(false)
      return false
    }
    return defaultPlanCompletionLayer()
  } catch {
    return defaultPlanCompletionLayer()
  }
}

export function writeStoredPlanCompletionLayer(on: boolean) {
  try {
    localStorage.setItem(PLAN_COMPLETION_LAYER_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function defaultPlanStatusFilters(): PlanStatusFilter[] {
  return [...PLAN_STATUS_FILTERS]
}

export function parsePlanColorMode(raw: string | null): PlanColorMode {
  if (raw === 'sport' || raw === 'white') return raw
  // Legacy exclusive "completion" mode → Plain (white) + completion layer on.
  if (raw === 'completion') return 'white'
  return defaultPlanColorMode()
}

export function normalizePlanStatusFilters(
  statuses: PlanStatusFilter[],
): PlanStatusFilter[] {
  const selected = new Set(statuses)
  return PLAN_STATUS_FILTERS.filter((s) => selected.has(s))
}

export function parsePlanStatusFilters(raw: string | null): PlanStatusFilter[] {
  if (!raw) return defaultPlanStatusFilters()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultPlanStatusFilters()
    const normalized = normalizePlanStatusFilters(
      parsed.filter(
        (v): v is PlanStatusFilter =>
          v === 'done' || v === 'open' || v === 'skipped',
      ),
    )
    return normalized.length > 0 ? normalized : defaultPlanStatusFilters()
  } catch {
    return defaultPlanStatusFilters()
  }
}

export function serializePlanStatusFilters(statuses: PlanStatusFilter[]): string {
  return JSON.stringify(normalizePlanStatusFilters(statuses))
}

export function planWorkoutStatusMatches(
  status: WorkoutStatus,
  allowed: ReadonlySet<PlanStatusFilter>,
): boolean {
  if (allowed.size === 0) return false
  if (allowed.size === PLAN_STATUS_FILTERS.length) return true
  if (status === WorkoutStatus.COMPLETED) return allowed.has('done')
  if (status === WorkoutStatus.SKIPPED) return allowed.has('skipped')
  return allowed.has('open')
}

export function normalizeVisiblePlanSports(sports: WorkoutType[]): WorkoutType[] {
  const selected = new Set(sports.filter(isConfigurablePlanSport))
  if (selected.size === 0) return []
  return FILTERABLE_PLAN_SPORTS.filter((sport) => selected.has(sport))
}

export function parseVisiblePlanSports(raw: string | null): WorkoutType[] {
  if (!raw) return defaultVisiblePlanSports()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultVisiblePlanSports()
    return normalizeVisiblePlanSports(
      parsed.filter((v): v is WorkoutType => typeof v === 'string'),
    )
  } catch {
    return defaultVisiblePlanSports()
  }
}

export function serializeVisiblePlanSports(sports: WorkoutType[]): string {
  return JSON.stringify(normalizeVisiblePlanSports(sports))
}

export function isPlanSportVisible(
  sport: WorkoutType,
  visibleSports: ReadonlySet<WorkoutType>,
): boolean {
  if (!isConfigurablePlanSport(sport)) return true
  return visibleSports.has(sport)
}

export function isPlanWorkoutVisible(
  workout: { type: WorkoutType },
  visibleSports: ReadonlySet<WorkoutType>,
): boolean {
  return isPlanSportVisible(workout.type, visibleSports)
}

export function filterPlanWorkouts<
  T extends { type: WorkoutType; status?: WorkoutStatus },
>(
  workouts: T[],
  visibleSports: ReadonlySet<WorkoutType>,
  visibleStatuses?: ReadonlySet<PlanStatusFilter>,
): T[] {
  return workouts.filter((w) => {
    if (!isPlanWorkoutVisible(w, visibleSports)) return false
    if (!visibleStatuses) return true
    if (w.status == null) return true
    return planWorkoutStatusMatches(w.status, visibleStatuses)
  })
}

export function filterPlanSportRows(
  sports: WorkoutType[],
  visibleSports: ReadonlySet<WorkoutType>,
): WorkoutType[] {
  return sports.filter((sport) => isPlanSportVisible(sport, visibleSports))
}
