import { WorkoutStatus } from '@prisma/client'
import { format, subDays } from 'date-fns'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

export type DayPhase = 'past' | 'today' | 'upcoming'

export type TrainingDisplayStatus =
  | 'completed'
  | 'skipped'
  | 'missed'
  | 'planned_today'
  | 'upcoming'

export type TrainingDay = {
  date: Date
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
  phase: DayPhase
}

export type TrainingWeekStats = {
  completed: number
  skipped: number
  missed: number
  upcoming: number
  todayPlanned: number
}

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function yesterdayKey(reference = new Date()): string {
  return format(subDays(reference, 1), 'yyyy-MM-dd')
}

export function getDayPhase(dateKey: string, reference = todayKey()): DayPhase {
  if (dateKey < reference) return 'past'
  if (dateKey > reference) return 'upcoming'
  return 'today'
}

export function getTrainingDisplayStatus(
  workout: { status: WorkoutStatus },
  dateKey: string,
  reference = todayKey(),
): TrainingDisplayStatus {
  if (workout.status === 'COMPLETED') return 'completed'
  if (workout.status === 'SKIPPED') return 'skipped'
  if (dateKey < reference) return 'missed'
  if (dateKey === reference) return 'planned_today'
  return 'upcoming'
}

export function buildTrainingDays(days: Date[]): TrainingDay[] {
  const reference = todayKey()
  return days.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return {
      date,
      dateKey,
      dayLabel: format(date, 'EEE'),
      dateLabel: format(date, 'd MMM'),
      isToday: dateKey === reference,
      phase: getDayPhase(dateKey, reference),
    }
  })
}

export function computeWeekStats(
  workouts: PlanWorkoutDetail[],
  reference = todayKey(),
): TrainingWeekStats {
  const stats: TrainingWeekStats = {
    completed: 0,
    skipped: 0,
    missed: 0,
    upcoming: 0,
    todayPlanned: 0,
  }

  for (const workout of workouts) {
    if (workout.type === 'REST' || workout.type === 'RECOVERY') continue
    if (workout.isRace) continue
    const display = getTrainingDisplayStatus(workout, workout.dateKey, reference)
    switch (display) {
      case 'completed':
        stats.completed += 1
        break
      case 'skipped':
        stats.skipped += 1
        break
      case 'missed':
        stats.missed += 1
        break
      case 'upcoming':
        stats.upcoming += 1
        break
      case 'planned_today':
        stats.todayPlanned += 1
        break
    }
  }

  return stats
}

export function groupWorkoutsByTrainingDay(
  days: TrainingDay[],
  byDate: Map<string, PlanWorkoutDetail[]>,
) {
  const today = days.filter((d) => d.phase === 'today')
  const upcoming = days.filter((d) => d.phase === 'upcoming')
  const past = days.filter((d) => d.phase === 'past').reverse()

  function withWorkouts(dayList: TrainingDay[]) {
    return dayList
      .map((day) => ({
        day,
        workouts: (byDate.get(day.dateKey) ?? []).filter((w) => w.type !== 'REST'),
      }))
      .filter((entry) => entry.workouts.length > 0)
  }

  return {
    today: withWorkouts(today),
    upcoming: withWorkouts(upcoming),
    past: withWorkouts(past),
  }
}
