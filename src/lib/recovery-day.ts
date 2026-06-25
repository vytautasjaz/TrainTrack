import { WorkoutType } from '@prisma/client'
import { cn } from '@/lib/utils'

export function dayHasRecovery(workouts: { type: WorkoutType }[]): boolean {
  return workouts.some((w) => w.type === WorkoutType.RECOVERY)
}

export function getRecoveryWorkout<T extends { type: WorkoutType; coachNotes?: string | null }>(
  workouts: T[],
): T | undefined {
  return workouts.find((w) => w.type === WorkoutType.RECOVERY)
}

export function isRecoverySport(sport: WorkoutType): boolean {
  return sport === WorkoutType.RECOVERY
}

/** Column / day background when marked as recovery. */
export function recoveryDaySurfaceClass(isToday = false): string {
  return cn(
    'bg-violet-500/[0.08] text-violet-900 dark:text-violet-200',
    isToday && 'ring-1 ring-inset ring-violet-500/25',
  )
}

export function recoveryDayHeaderClass(isToday = false): string {
  return cn(
    recoveryDaySurfaceClass(isToday),
    !isToday && 'text-violet-800 dark:text-violet-300',
  )
}

export function recoveryDayCellClass(isToday = false): string {
  return cn(recoveryDaySurfaceClass(isToday), isToday ? '' : '')
}

export function recoveryDayStripClass(isToday = false): string {
  if (isToday) {
    return 'bg-violet-600 text-violet-50 shadow-sm ring-2 ring-violet-400/40'
  }
  return 'bg-violet-500/15 text-violet-800 shadow-[var(--shadow-card)] dark:text-violet-200'
}

export function recoveryDayMonthClass(): string {
  return 'border-violet-500/40 bg-violet-500/[0.12] ring-1 ring-inset ring-violet-500/20'
}

export const RECOVERY_DAY_COLORS = {
  dot: '#8b5cf6',
  text: '#6d28d9',
  bg: '#f5f3ff',
}
