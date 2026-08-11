import { WorkoutStatus, WorkoutType } from '@prisma/client'
import {
  CONFIGURABLE_PLAN_SPORTS,
  isConfigurablePlanSport,
} from '@/lib/plan-sports'

export const PLAN_SPORT_FILTER_STORAGE_KEY = 'tt-plan-visible-sports'
export const PLAN_COLOR_MODE_STORAGE_KEY = 'tt-plan-color-mode'
export const PLAN_STATUS_FILTER_STORAGE_KEY = 'tt-plan-status-filter'

export const FILTERABLE_PLAN_SPORTS = CONFIGURABLE_PLAN_SPORTS

export type PlanColorMode = 'sport' | 'completion' | 'white'
export type PlanStatusFilter = 'done' | 'open' | 'skipped'

export const PLAN_COLOR_MODES: PlanColorMode[] = ['sport', 'completion', 'white']
export const PLAN_STATUS_FILTERS: PlanStatusFilter[] = ['done', 'open', 'skipped']

export const PLAN_COLOR_MODE_OPTIONS: {
  id: PlanColorMode
  label: string
  hint: string
}[] = [
  { id: 'sport', label: 'By sport', hint: 'Tint cards by Run / Bike / Swim…' },
  { id: 'completion', label: 'By completion', hint: 'Green done, muted skipped' },
  { id: 'white', label: 'White', hint: 'White cards with sport accent' },
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

export function defaultPlanStatusFilters(): PlanStatusFilter[] {
  return [...PLAN_STATUS_FILTERS]
}

export function parsePlanColorMode(raw: string | null): PlanColorMode {
  if (raw === 'sport' || raw === 'completion' || raw === 'white') return raw
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
