import type { SportId } from '@/theme/tokens'

export type WorkoutStatus = 'planned' | 'completed' | 'skipped'

export type StructureBlock = {
  label: string
  detail: string
}

/** Matches Next.js `/api/mobile/*` workout DTO. */
export type WorkoutDetail = {
  id: string
  sport: SportId
  sportLabel?: string
  title: string
  description: string
  dateKey?: string
  dateLabel: string
  weekday: string
  dateNum: string
  month: string
  metric: string
  zone?: string | null
  sessionType?: string | null
  prescription: string
  status: WorkoutStatus
  actualMetric?: string | null
  plannedMetric?: string | null
  actualSecondary?: string | null
  plannedSecondary?: string | null
  pace?: string | null
  completionPercent?: number | null
  coachNotes?: string | null
  structure?: StructureBlock[]
  tss?: string | null
  plannedTss?: string | null
}

export type MobileUser = {
  id: string
  name: string
  email: string
  athleteId: string
}

export type HomeResponse = {
  greeting: string
  name: string
  today: WorkoutDetail[]
  upcoming: WorkoutDetail[]
  weekLabel: string
  weekTitle: string
  canGoPrev: boolean
  canGoNext: boolean
  weekOffset: number
  weekStats: WeekStats
  weekStatsWeeks: WeekStats[]
  trainingLoadWeeks: TrainingLoadWeek[]
}

export type WeekSportStat = {
  id: string
  sport: SportId
  label: string
  actualLabel: string
  plannedLabel: string
  unit: string
  pct: number
}

export type WeekStats = {
  title: string
  rangeLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
  sports: WeekSportStat[]
  overall: {
    completedLabel: string
    plannedLabel: string
    pct: number
  }
}

export type TrainingLoadWeek = {
  weekOffset: number
  title: string
  rangeLabel: string
  plannedWeek: boolean
  dailyPlannedTss: number[]
  dailyActualTss: number[]
  dailyPlannedTime: number[]
  dailyActualTime: number[]
  plannedTotalTss: number
  actualTotalTss: number
  plannedTotalTime: number
  actualTotalTime: number
}

export type AuthResponse = {
  token: string
  user: MobileUser
}
