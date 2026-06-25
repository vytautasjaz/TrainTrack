import { WorkoutType } from '@prisma/client'
import { SPORT_ROW_ORDER } from '@/lib/constants'

/** Sports that can appear as rows in the coach training planner */
export const CONFIGURABLE_PLAN_SPORTS: WorkoutType[] = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.RECOVERY && t !== WorkoutType.REST,
)

export const DEFAULT_PLAN_SPORT_ROWS: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
]

const CONFIGURABLE_SET = new Set<WorkoutType>(CONFIGURABLE_PLAN_SPORTS)

export function isConfigurablePlanSport(type: WorkoutType): boolean {
  return CONFIGURABLE_SET.has(type)
}

export function normalizePlanSportRows(rows: WorkoutType[]): WorkoutType[] {
  const filtered = rows.filter(isConfigurablePlanSport)
  if (filtered.length === 0) return [...DEFAULT_PLAN_SPORT_ROWS]
  return CONFIGURABLE_PLAN_SPORTS.filter((sport) => filtered.includes(sport))
}

export function resolveCoachPlanSportRows(
  planSportRows: WorkoutType[],
  extraPlanSportRows: WorkoutType[],
  typesInWeek: Iterable<WorkoutType>,
  hiddenPlanSportRows: WorkoutType[] = [],
): WorkoutType[] {
  const typesInWeekSet = new Set(typesInWeek)
  const hidden = new Set(hiddenPlanSportRows.filter(isConfigurablePlanSport))
  const combined = new Set<WorkoutType>([
    ...normalizePlanSportRows(planSportRows),
    ...extraPlanSportRows.filter(isConfigurablePlanSport),
  ])
  for (const type of typesInWeekSet) {
    if (isConfigurablePlanSport(type)) combined.add(type)
  }
  for (const sport of hidden) {
    if (!typesInWeekSet.has(sport)) combined.delete(sport)
  }
  return CONFIGURABLE_PLAN_SPORTS.filter((sport) => combined.has(sport))
}

export function canRemovePlanSportRow(
  sport: WorkoutType,
  typesInWeek: Iterable<WorkoutType>,
): boolean {
  if (!isConfigurablePlanSport(sport)) return false
  return !new Set(typesInWeek).has(sport)
}

export function availableExtraPlanSports(
  planSportRows: WorkoutType[],
  extraPlanSportRows: WorkoutType[],
  typesInWeek: Iterable<WorkoutType>,
  hiddenPlanSportRows: WorkoutType[] = [],
): WorkoutType[] {
  const visible = new Set(
    resolveCoachPlanSportRows(
      planSportRows,
      extraPlanSportRows,
      typesInWeek,
      hiddenPlanSportRows,
    ),
  )
  return CONFIGURABLE_PLAN_SPORTS.filter((sport) => !visible.has(sport))
}

export function parsePlanSportRows(values: FormDataEntryValue[]): WorkoutType[] {
  const rows: WorkoutType[] = []
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    if (isConfigurablePlanSport(raw as WorkoutType)) rows.push(raw as WorkoutType)
  }
  return normalizePlanSportRows(rows)
}
