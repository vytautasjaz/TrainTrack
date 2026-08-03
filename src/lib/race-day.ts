import type { RacePriority } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

const PRIORITY_RANK: Record<RacePriority, number> = { A: 3, B: 2, C: 1 }

export function dayHasRace(workouts: Pick<PlanWorkoutDetail, 'isRace'>[]): boolean {
  return workouts.some((w) => w.isRace)
}

export function getRacePlanItem<T extends PlanWorkoutDetail>(workouts: T[]): T | undefined {
  return workouts.find((w) => w.isRace)
}

/** Highest race priority on the day (A > B > C). */
export function getDayRacePriority(
  workouts: Pick<PlanWorkoutDetail, 'isRace' | 'racePriority'>[],
): RacePriority | null {
  let best: RacePriority | null = null
  for (const w of workouts) {
    if (!w.isRace) continue
    const p = w.racePriority ?? 'C'
    if (!best || PRIORITY_RANK[p] > PRIORITY_RANK[best]) best = p
  }
  return best
}

/** Soft day-column / section wash by A/B/C (not header). */
export const RACE_PRIORITY_DAY_CELL: Record<RacePriority, string> = {
  A: 'bg-red-500/[0.08] text-red-950 dark:bg-red-500/[0.12] dark:text-red-100',
  B: 'bg-blue-500/[0.08] text-blue-950 dark:bg-blue-500/[0.12] dark:text-blue-100',
  C: 'bg-amber-500/[0.08] text-amber-950 dark:bg-amber-500/[0.12] dark:text-amber-100',
}

export const RACE_PRIORITY_DAY_TODAY: Record<RacePriority, string> = {
  A: 'ring-1 ring-inset ring-red-500/30',
  B: 'ring-1 ring-inset ring-blue-500/30',
  C: 'ring-1 ring-inset ring-amber-500/30',
}

export const RACE_PRIORITY_MONTH_CELL: Record<RacePriority, string> = {
  A: 'border-red-500/45 bg-red-500/[0.12] ring-1 ring-inset ring-red-500/20',
  B: 'border-blue-500/45 bg-blue-500/[0.12] ring-1 ring-inset ring-blue-500/20',
  C: 'border-amber-500/45 bg-amber-500/[0.12] ring-1 ring-inset ring-amber-500/20',
}

export const RACE_PRIORITY_MONTH_TODAY: Record<RacePriority, string> = {
  A: 'border-red-500/70 bg-red-500/20',
  B: 'border-blue-500/70 bg-blue-500/20',
  C: 'border-amber-500/70 bg-amber-500/20',
}

export const RACE_PRIORITY_MONTH_SELECTED: Record<RacePriority, string> = {
  A: 'border-red-500 bg-red-500/[0.12]',
  B: 'border-blue-500 bg-blue-500/[0.12]',
  C: 'border-amber-500 bg-amber-500/[0.12]',
}

export const RACE_PRIORITY_MONTH_TODAY_TEXT: Record<RacePriority, string> = {
  A: 'text-red-800 dark:text-red-100',
  B: 'text-blue-800 dark:text-blue-100',
  C: 'text-amber-800 dark:text-amber-100',
}

export const RACE_PRIORITY_SECTION: Record<RacePriority, string> = {
  A: 'border-red-500/35 bg-red-500/[0.05]',
  B: 'border-blue-500/35 bg-blue-500/[0.05]',
  C: 'border-amber-500/35 bg-amber-500/[0.05]',
}

export function raceDayCellClass(priority: RacePriority, isToday = false): string {
  return cn(RACE_PRIORITY_DAY_CELL[priority], isToday && RACE_PRIORITY_DAY_TODAY[priority])
}

export function raceDaySectionClass(priority: RacePriority, isToday = false): string {
  return cn(RACE_PRIORITY_SECTION[priority], isToday && RACE_PRIORITY_DAY_TODAY[priority])
}

export function raceDayMonthClass(priority: RacePriority): string {
  return RACE_PRIORITY_MONTH_CELL[priority]
}

/** Week-table race chip surface by A/B/C priority (not workout completed/skipped). */
export const RACE_PRIORITY_BLOCK: Record<RacePriority, string> = {
  A: 'border-2 border-red-400/80 bg-red-50 dark:border-red-500/55 dark:bg-red-950/35',
  B: 'border-2 border-blue-400/80 bg-blue-50 dark:border-blue-500/55 dark:bg-blue-950/35',
  C: 'border-2 border-amber-400/80 bg-amber-50 dark:border-amber-500/55 dark:bg-amber-950/35',
}

export function racePlanItemClass(compact = false): string {
  return cn(
    'border border-amber-500/45 bg-amber-500/12 shadow-sm',
    'hover:border-amber-500/65 hover:bg-amber-500/18',
    compact ? 'px-1 py-0.5 landscape:max-lg:px-1' : 'px-1.5 py-1',
  )
}

/** @deprecated Prefer priority-aware helpers; kept for strip Flag-only days. */
export function raceDayStripClass(isToday = false): string {
  if (isToday) {
    return 'bg-amber-600 text-amber-50 shadow-sm ring-2 ring-amber-400/50'
  }
  return 'bg-amber-500/20 text-amber-950 dark:text-amber-100'
}
