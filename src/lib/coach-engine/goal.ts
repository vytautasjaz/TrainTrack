import type { CollectedAthleteData, GoalProfile } from '@/lib/coach-engine/types'
import { demandIdForSkillSlug, getDemandProfile } from '@/lib/coach-engine/demand'
import { parseScheduleBrief } from '@/lib/coach-engine/brief'
import { parseAthleteLevel } from '@/lib/coach-engine/state'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asWeekCount(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(52, Math.max(4, Math.round(n)))
}

/** Resolve structured goal from skill slug, brief, and upcoming races. */
export function resolveGoalProfile(args: {
  skillSlug: string
  brief: Record<string, unknown>
  data: CollectedAthleteData
}): GoalProfile {
  const demandId = demandIdForSkillSlug(args.skillSlug)
  const demand = getDemandProfile(demandId)
  const level = parseAthleteLevel(args.brief.level)
  const weekCount = asWeekCount(args.brief.weekCount, 8)
  const goalTime = asString(args.brief.goalTime)
  const notes = asString(args.brief.notes)
  const schedule = parseScheduleBrief(args.brief)

  const preferred = args.data.races.find(
    (r) => r.priority === 'A' || r.priority === 'B',
  )
  const race = preferred ?? args.data.races[0] ?? null

  return {
    sport: demand.sportFocus,
    type: demandId === 'MULTI_BASE_V1' ? 'general' : 'race',
    demandId,
    race: race
      ? {
          name: race.name,
          date: race.date,
          priority: race.priority,
        }
      : {
          name: demand.label,
          date: null,
          priority: 'A',
        },
    target: {
      type: goalTime ? 'time' : 'none',
      valueLabel: goalTime || null,
    },
    weekCount,
    level,
    notes,
    daysPerWeek: schedule.daysPerWeek,
    longRunDay: schedule.longRunDay,
    raceWeekday:
      demandId === 'MULTI_BASE_V1'
        ? null
        : (schedule.raceWeekday ?? 6),
    availableDays: schedule.availableDays,
    currentWeeklyKm: schedule.currentWeeklyKm,
    firstWeekKm: schedule.firstWeekKm,
  }
}
