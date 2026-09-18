import type {
  HyroxDivision,
  RaceCourseType,
  RacePriority,
  RaceType,
  SeasonPhase,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'
import {
  addDateOnlyDays,
  parseDateOnly,
  startOfWeekDateOnly,
  toDateKey,
} from '@/lib/dates'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import type { TrainingPhaseBlock } from '@/lib/training-phase-context'

/** Monday=0 … Sunday=6 for plan sessions. */
export function dayOfWeekFromDateKey(dateKey: string): number {
  const d = parseDateOnly(dateKey)
  const utc = d.getUTCDay() // 0 Sun … 6 Sat
  return utc === 0 ? 6 : utc - 1
}

export function weekIndexFromDateKey(
  dateKey: string,
  planStartMondayKey: string,
): number {
  const start = startOfWeekDateOnly(parseDateOnly(planStartMondayKey))
  const dayMon = startOfWeekDateOnly(parseDateOnly(dateKey))
  return Math.round((dayMon.getTime() - start.getTime()) / (7 * 86400000))
}

export function dateKeyForPlanSlot(args: {
  startWeekMondayKey: string
  weekIndex: number
  dayOfWeek: number
}): string {
  const monday = startOfWeekDateOnly(parseDateOnly(args.startWeekMondayKey))
  return toDateKey(
    addDateOnlyDays(monday, args.weekIndex * 7 + args.dayOfWeek),
  )
}

export function dateKeyForPlanDay(args: {
  startWeekMondayKey: string
  dayIndex: number
}): string {
  const monday = startOfWeekDateOnly(parseDateOnly(args.startWeekMondayKey))
  return toDateKey(addDateOnlyDays(monday, args.dayIndex))
}

export const DAY_OF_WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export type RelativePlanPhase = {
  phase: SeasonPhase
  sport: WorkoutType
  label: string | null
  startDay: number
  endDay: number
}

/** Inclusive day index within a plan (Mon of week 1 = 0). */
export function planDayIndex(weekIndex: number, dayOfWeek: number): number {
  return weekIndex * 7 + dayOfWeek
}

export function weekIndexFromPlanDay(day: number): number {
  return Math.floor(day / 7)
}

export function dayOfWeekFromPlanDay(day: number): number {
  return ((day % 7) + 7) % 7
}

export function planDayCount(weekCount: number): number {
  return Math.max(0, weekCount) * 7
}

/** Monday (day index) of the week that contains `day`. */
export function weekStartDayFromPlanDay(day: number): number {
  return weekIndexFromPlanDay(day) * 7
}

/**
 * Clip absolute season phases to a plan window and store relative day indices.
 * Days are inclusive, 0-based within weekCount * 7.
 */
export function relativePhasesFromBlocks(args: {
  blocks: TrainingPhaseBlock[]
  planStartMondayKey: string
  weekCount: number
}): RelativePlanPhase[] {
  const { blocks, planStartMondayKey, weekCount } = args
  if (weekCount <= 0) return []
  const dayCount = planDayCount(weekCount)
  const planStart = parseDateOnly(planStartMondayKey)
  const planEndSunday = toDateKey(addDateOnlyDays(planStart, dayCount - 1))
  const out: RelativePlanPhase[] = []

  for (const block of blocks) {
    const clipStart =
      block.startKey > planStartMondayKey ? block.startKey : planStartMondayKey
    const clipEnd = block.endKey < planEndSunday ? block.endKey : planEndSunday
    if (clipStart > clipEnd) continue
    const startDay = Math.round(
      (parseDateOnly(clipStart).getTime() - planStart.getTime()) / 86400000,
    )
    const endDay = Math.round(
      (parseDateOnly(clipEnd).getTime() - planStart.getTime()) / 86400000,
    )
    if (endDay < 0 || startDay >= dayCount) continue
    out.push({
      phase: block.phase,
      sport: block.sport,
      label: block.label,
      startDay: Math.max(0, startDay),
      endDay: Math.min(dayCount - 1, endDay),
    })
  }

  // Merge identical adjacent spans (same phase/sport/label)
  out.sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay)
  const merged: RelativePlanPhase[] = []
  for (const p of out) {
    const last = merged[merged.length - 1]
    if (
      last &&
      last.phase === p.phase &&
      last.sport === p.sport &&
      last.label === p.label &&
      p.startDay <= last.endDay + 1
    ) {
      last.endDay = Math.max(last.endDay, p.endDay)
    } else {
      merged.push({ ...p })
    }
  }
  return merged
}

export function formatPlanPhaseDayRange(startDay: number, endDay: number): string {
  const days = endDay - startDay + 1
  if (days <= 0) return '—'
  const startLabel = `${DAY_OF_WEEK_SHORT[dayOfWeekFromPlanDay(startDay)]} W${weekIndexFromPlanDay(startDay) + 1}`
  const endLabel = `${DAY_OF_WEEK_SHORT[dayOfWeekFromPlanDay(endDay)]} W${weekIndexFromPlanDay(endDay) + 1}`
  if (startDay === endDay) return `${startLabel} · 1 day`
  if (
    dayOfWeekFromPlanDay(startDay) === 0 &&
    dayOfWeekFromPlanDay(endDay) === 6 &&
    weekIndexFromPlanDay(startDay) === weekIndexFromPlanDay(endDay)
  ) {
    return `Week ${weekIndexFromPlanDay(startDay) + 1}`
  }
  if (
    dayOfWeekFromPlanDay(startDay) === 0 &&
    dayOfWeekFromPlanDay(endDay) === 6
  ) {
    return `Weeks ${weekIndexFromPlanDay(startDay) + 1}–${weekIndexFromPlanDay(endDay) + 1}`
  }
  return `${startLabel}–${endLabel} · ${days} days`
}

export function formatRelativePhaseLine(p: RelativePlanPhase): string {
  const name = displaySeasonPhaseName(p.phase, p.label)
  return `${name} · ${formatPlanPhaseDayRange(p.startDay, p.endDay)}`
}

/** Inclusive day ranges overlap when they share any day. */
export function planPhaseDaysOverlap(
  a: { startDay: number; endDay: number },
  b: { startDay: number; endDay: number },
): boolean {
  return a.startDay <= b.endDay && b.startDay <= a.endDay
}

/** @deprecated Use planPhaseDaysOverlap. */
export const planPhaseWeeksOverlap = planPhaseDaysOverlap

/**
 * Throws if `candidate` overlaps any existing plan phase (whole-plan rule —
 * canvas shows one phase per day).
 */
export function assertNoPlanPhaseOverlap(args: {
  candidate: { startDay: number; endDay: number }
  existing: Array<{
    id?: string
    startDay: number
    endDay: number
    phase?: SeasonPhase
    label?: string | null
  }>
  /** When updating, exclude this phase id from the check. */
  excludeId?: string
}): void {
  const { candidate, existing, excludeId } = args
  for (const other of existing) {
    if (excludeId && other.id === excludeId) continue
    if (!planPhaseDaysOverlap(candidate, other)) continue
    const name = other.phase
      ? displaySeasonPhaseName(other.phase, other.label)
      : 'Another phase'
    throw new Error(
      `Phases cannot overlap. That range already covers ${name} (${formatPlanPhaseDayRange(other.startDay, other.endDay)}).`,
    )
  }
}

export type PlanPhaseCarveResult = {
  updates: Array<{ id: string; startDay: number; endDay: number }>
  deletes: string[]
  /** Right remnant after a phase is split around the incoming range. */
  creates: Array<{
    cloneFromId: string
    startDay: number
    endDay: number
  }>
}

/**
 * Shrink / split / remove existing phases so `candidate` has exclusive days.
 * Does not include the candidate itself — caller creates or updates it after.
 */
export function carvePlanPhasesForIncomingRange(args: {
  existing: Array<{ id: string; startDay: number; endDay: number }>
  candidate: { startDay: number; endDay: number }
  excludeId?: string
}): PlanPhaseCarveResult {
  const { existing, candidate, excludeId } = args
  const updates: PlanPhaseCarveResult['updates'] = []
  const deletes: string[] = []
  const creates: PlanPhaseCarveResult['creates'] = []

  for (const other of existing) {
    if (excludeId && other.id === excludeId) continue
    if (!planPhaseDaysOverlap(candidate, other)) continue

    const leftEnd = candidate.startDay - 1
    const rightStart = candidate.endDay + 1
    const hasLeft = other.startDay <= leftEnd
    const hasRight = rightStart <= other.endDay

    if (hasLeft && hasRight) {
      updates.push({
        id: other.id,
        startDay: other.startDay,
        endDay: leftEnd,
      })
      creates.push({
        cloneFromId: other.id,
        startDay: rightStart,
        endDay: other.endDay,
      })
    } else if (hasLeft) {
      updates.push({
        id: other.id,
        startDay: other.startDay,
        endDay: leftEnd,
      })
    } else if (hasRight) {
      updates.push({
        id: other.id,
        startDay: rightStart,
        endDay: other.endDay,
      })
    } else {
      deletes.push(other.id)
    }
  }

  return { updates, deletes, creates }
}

export function isPlanPhaseOverlapError(message: string): boolean {
  return message.startsWith('Phases cannot overlap.')
}

/** Default phase block colors on the plan phase timeline. */
export const PLAN_PHASE_DEFAULT_COLORS: Record<SeasonPhase, string> = {
  BASE: '#64748b',
  BUILD: '#2563eb',
  PEAK: '#7c3aed',
  RACE: '#da2f36',
  RECOVERY: '#059669',
  TRANSITION: '#d97706',
  MAINTENANCE: '#0f766e',
}

/** Curated palette — one swatch per default phase hue (stored as full strength). */
export const PLAN_PHASE_COLOR_PRESETS = [
  '#64748b', // slate — Base
  '#2563eb', // blue — Build
  '#7c3aed', // violet — Peak
  '#da2f36', // red — Race
  '#059669', // green — Recovery
  '#d97706', // amber — Transition
  '#0f766e', // teal — Maintenance
] as const

/** Soft wash used on the plan canvas day background (preview in color pickers). */
export function planPhaseWashBackground(color: string, strength = 8): string {
  return `color-mix(in srgb, ${color} ${strength}%, white)`
}

export function resolvePlanPhaseColor(
  phase: SeasonPhase,
  color?: string | null,
): string {
  const trimmed = color?.trim()
  if (trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  return PLAN_PHASE_DEFAULT_COLORS[phase]
}

export type PlanPhaseDayRange = {
  id: string
  startDay: number
  endDay: number
}

/** @deprecated Use PlanPhaseDayRange. */
export type PlanPhaseWeekRange = PlanPhaseDayRange

/**
 * Resize one edge of a phase within free space only.
 * Neighbors are not moved — gaps stay open; growth stops at the adjacent phase.
 */
export function resizePlanPhaseInGaps(args: {
  phases: PlanPhaseDayRange[]
  phaseId: string
  edge: 'start' | 'end'
  toDay: number
  dayCount: number
}): PlanPhaseDayRange[] {
  const { phases, phaseId, edge, dayCount } = args
  const sorted = [...phases].sort(
    (a, b) => a.startDay - b.startDay || a.endDay - b.endDay,
  )
  const idx = sorted.findIndex((p) => p.id === phaseId)
  if (idx < 0) return phases
  const current = { ...sorted[idx]! }
  const prev = sorted[idx - 1]
  const next = sorted[idx + 1]
  let toDay = Math.max(0, Math.min(dayCount - 1, Math.floor(args.toDay)))

  if (edge === 'end') {
    const maxEnd = next ? next.startDay - 1 : dayCount - 1
    toDay = Math.max(current.startDay, Math.min(toDay, maxEnd))
    current.endDay = toDay
  } else {
    const minStart = prev ? prev.endDay + 1 : 0
    toDay = Math.min(current.endDay, Math.max(toDay, minStart))
    current.startDay = toDay
  }

  sorted[idx] = current
  return sorted
}

/** @deprecated Use resizePlanPhaseInGaps — kept as alias for any external callers. */
export const resizePlanPhaseWithNeighbors = resizePlanPhaseInGaps

/**
 * Shift a phase by day delta; clamp inside plan and away from neighbors
 * (does not push neighbors — only slides into free space).
 */
export function shiftPlanPhaseInGaps(args: {
  phases: PlanPhaseDayRange[]
  phaseId: string
  deltaDays: number
  dayCount: number
}): PlanPhaseDayRange[] {
  const { phases, phaseId, deltaDays, dayCount } = args
  if (deltaDays === 0) return phases
  const sorted = [...phases].sort(
    (a, b) => a.startDay - b.startDay || a.endDay - b.endDay,
  )
  const idx = sorted.findIndex((p) => p.id === phaseId)
  if (idx < 0) return phases
  const current = sorted[idx]!
  const span = current.endDay - current.startDay
  const prev = sorted[idx - 1]
  const next = sorted[idx + 1]
  const minStart = prev ? prev.endDay + 1 : 0
  const maxEnd = next ? next.startDay - 1 : dayCount - 1
  let start = current.startDay + deltaDays
  let end = start + span
  if (start < minStart) {
    start = minStart
    end = start + span
  }
  if (end > maxEnd) {
    end = maxEnd
    start = end - span
  }
  if (start < minStart || end > maxEnd || start > end) return phases
  sorted[idx] = { ...current, startDay: start, endDay: end }
  return sorted
}

/** Phase covering a specific plan day, if any. */
export function phaseForDay<T extends { startDay: number; endDay: number }>(
  phases: T[],
  day: number,
): T | null {
  return phases.find((p) => day >= p.startDay && day <= p.endDay) ?? null
}

/**
 * Primary phase for a week cell: the one covering the most days that week.
 * Ties break toward the earlier-starting phase.
 */
export function phaseForWeek<T extends { startDay: number; endDay: number }>(
  phases: T[],
  weekIndex: number,
): T | null {
  const weekStart = weekIndex * 7
  const weekEnd = weekStart + 6
  let best: T | null = null
  let bestDays = 0
  for (const p of phases) {
    const from = Math.max(p.startDay, weekStart)
    const to = Math.min(p.endDay, weekEnd)
    const days = to - from + 1
    if (days <= 0) continue
    if (
      days > bestDays ||
      (days === bestDays && best && p.startDay < best.startDay)
    ) {
      best = p
      bestDays = days
    }
  }
  return best
}

export type TrainingPlanListItem = {
  id: string
  title: string
  description: string | null
  sportFocus: WorkoutType | null
  weekCount: number
  level: string | null
  target: string | null
  forAthleteId: string | null
  forAthleteName: string | null
  sessionCount: number
  phaseCount: number
  updatedAt: string
}

/** Opaque slot key for plan-canvas DnD (not a calendar date). */
export function planSlotKey(weekIndex: number, dayOfWeek: number): string {
  return `plan:${weekIndex}:${dayOfWeek}`
}

export function parsePlanSlotKey(
  key: string,
): { weekIndex: number; dayOfWeek: number } | null {
  const match = /^plan:(\d+):([0-6])$/.exec(key)
  if (!match) return null
  return {
    weekIndex: Number(match[1]),
    dayOfWeek: Number(match[2]),
  }
}

export function formatPlanSlotLabel(weekIndex: number, dayOfWeek: number): string {
  const day = DAY_OF_WEEK_SHORT[dayOfWeek] ?? `D${dayOfWeek}`
  return `Week ${weekIndex + 1} · ${day}`
}

export type TrainingPlanSessionDetail = {
  id: string
  weekIndex: number
  dayOfWeek: number
  sortOrder: number
  type: WorkoutType
  sessionType: string
  title: string
  description: string | null
  plannedDistance: number | null
  plannedDuration: number | null
  plannedDistanceMeters: number | null
  plannedDistanceSource?: string | null
  plannedDurationSource?: string | null
  plannedDistanceMetersSource?: string | null
  coachNotes: string | null
  coachNotesPrivate: boolean
  tags: string[]
  sourceTemplateId: string | null
  /** Workout builder structure JSON — used for intensity stats. */
  structure?: unknown | null
  swimEnvironment?: string | null
  swimStructure?: unknown | null
}

export type TrainingPlanPhaseDetail = {
  id: string
  phase: SeasonPhase
  sport: WorkoutType
  label: string | null
  startDay: number
  endDay: number
  color: string | null
}

export type TrainingPlanRacePlaceholderDetail = {
  id: string
  weekIndex: number
  dayOfWeek: number
  sortOrder: number
  name: string
  type: RaceType
  sport: WorkoutType
  priority: RacePriority
  location: string | null
  goal: string | null
  courseType: RaceCourseType | null
  triathlonDistance: TriathlonDistance | null
  hyroxDivision: HyroxDivision | null
  customDistanceKm: number | null
  preparationWeeks: number | null
}

export type TrainingPlanEditorDetail = {
  id: string
  title: string
  description: string | null
  sportFocus: WorkoutType | null
  weekCount: number
  level: string | null
  target: string | null
  forAthleteId: string | null
  forAthleteName: string | null
  sessions: TrainingPlanSessionDetail[]
  phases: TrainingPlanPhaseDetail[]
  races: TrainingPlanRacePlaceholderDetail[]
}

/** Fired after save/update/delete so open Plans lists can refresh. */
export const TRAINING_PLANS_CHANGED_EVENT = 'tt-training-plans-changed'

export function notifyTrainingPlansChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TRAINING_PLANS_CHANGED_EVENT))
}
