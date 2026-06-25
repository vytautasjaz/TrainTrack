import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

export function dayHasRace(workouts: Pick<PlanWorkoutDetail, 'isRace'>[]): boolean {
  return workouts.some((w) => w.isRace)
}

export function getRacePlanItem<T extends PlanWorkoutDetail>(workouts: T[]): T | undefined {
  return workouts.find((w) => w.isRace)
}

export function raceDaySurfaceClass(isToday = false): string {
  return cn(
    'bg-amber-500/12 text-amber-950 dark:text-amber-100',
    isToday && 'ring-1 ring-inset ring-amber-500/35',
  )
}

export function raceDayHeaderClass(isToday = false): string {
  return cn(
    raceDaySurfaceClass(isToday),
    !isToday && 'text-amber-900 dark:text-amber-200',
  )
}

export function raceDayCellClass(isToday = false): string {
  return raceDaySurfaceClass(isToday)
}

export function raceDaySectionClass(isToday = false): string {
  return cn(
    'border-amber-500/35 bg-amber-500/[0.05]',
    isToday && 'ring-1 ring-amber-500/30',
  )
}

export function raceDayStripClass(isToday = false): string {
  if (isToday) {
    return 'bg-amber-600 text-amber-50 shadow-sm ring-2 ring-amber-400/50'
  }
  return 'bg-amber-500/20 text-amber-950 shadow-[var(--shadow-card)] dark:text-amber-100'
}

export function raceDayMonthClass(): string {
  return 'border-amber-500/50 bg-amber-500/[0.14] ring-1 ring-inset ring-amber-500/25'
}

export function racePlanItemClass(compact = false): string {
  return cn(
    'border border-amber-500/45 bg-amber-500/12 shadow-sm',
    'hover:border-amber-500/65 hover:bg-amber-500/18',
    compact ? 'px-1 py-0.5 landscape:max-lg:px-1' : 'px-1.5 py-1',
  )
}
