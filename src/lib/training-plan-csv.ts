import { DAY_OF_WEEK_SHORT, planDayIndex } from '@/lib/training-plan'
import type { TrainingPlanEditorDetail } from '@/lib/training-plan'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { displaySeasonPhaseName } from '@/lib/season-planner'
import type { SessionType } from '@prisma/client'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function phaseLabelForDay(
  plan: TrainingPlanEditorDetail,
  dayIndex: number,
): string {
  const phase = plan.phases.find(
    (p) => dayIndex >= p.startDay && dayIndex <= p.endDay,
  )
  if (!phase) return ''
  return phase.label?.trim() || displaySeasonPhaseName(phase.phase)
}

/** Build a CSV string for a training plan (sessions + race placeholders). */
export function trainingPlanToCsv(plan: TrainingPlanEditorDetail): string {
  const headers = [
    'week',
    'day',
    'day_name',
    'kind',
    'sport',
    'session_type',
    'title',
    'description',
    'distance_km',
    'duration_min',
    'coach_notes',
    'tags',
    'phase',
  ]

  const rows: string[][] = []

  const sessions = [...plan.sessions].sort((a, b) => {
    if (a.weekIndex !== b.weekIndex) return a.weekIndex - b.weekIndex
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
    return a.sortOrder - b.sortOrder
  })

  for (const s of sessions) {
    const dayIndex = planDayIndex(s.weekIndex, s.dayOfWeek)
    rows.push([
      String(s.weekIndex + 1),
      String(s.dayOfWeek + 1),
      DAY_OF_WEEK_SHORT[s.dayOfWeek] ?? '',
      'session',
      WORKOUT_TYPE_LABELS[s.type] ?? s.type,
      getSessionTypeLabel(s.sessionType as SessionType, s.type),
      s.title,
      s.description ?? '',
      s.plannedDistance != null ? String(s.plannedDistance) : '',
      s.plannedDuration != null ? String(s.plannedDuration) : '',
      s.coachNotes ?? '',
      s.tags.join('; '),
      phaseLabelForDay(plan, dayIndex),
    ])
  }

  const races = [...plan.races].sort((a, b) => {
    if (a.weekIndex !== b.weekIndex) return a.weekIndex - b.weekIndex
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
    return a.sortOrder - b.sortOrder
  })

  for (const r of races) {
    const dayIndex = planDayIndex(r.weekIndex, r.dayOfWeek)
    rows.push([
      String(r.weekIndex + 1),
      String(r.dayOfWeek + 1),
      DAY_OF_WEEK_SHORT[r.dayOfWeek] ?? '',
      'race',
      WORKOUT_TYPE_LABELS[r.sport] ?? r.sport,
      r.type,
      r.name,
      [r.location, r.goal].filter(Boolean).join(' · '),
      r.customDistanceKm != null ? String(r.customDistanceKm) : '',
      '',
      r.priority,
      '',
      phaseLabelForDay(plan, dayIndex),
    ])
  }

  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ]
  // BOM helps Excel open UTF-8 correctly
  return `\uFEFF${lines.join('\n')}\n`
}

export function downloadTrainingPlanCsv(plan: TrainingPlanEditorDetail) {
  const csv = trainingPlanToCsv(plan)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeTitle =
    plan.title
      .trim()
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'training-plan'
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeTitle}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
