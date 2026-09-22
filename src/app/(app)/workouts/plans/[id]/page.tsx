import { redirect, notFound } from 'next/navigation'
import {
  getSession,
  isCoachView,
  resolveAthleteId,
  getCoachAthletes,
} from '@/lib/session'
import { getTrainingPlanDetail } from '@/app/actions/training-plans'
import {
  getCoachLibraryFolders,
  getCoachLibraryTemplates,
} from '@/lib/workout-library/queries'
import { resolveLibraryTemplateMetricsForAthlete } from '@/lib/workout-library/template-metrics'
import { resolveTrainingPlanEstimationPreferences } from '@/lib/training-plan-estimation-prefs'
import { PlanCanvasEditor } from '@/components/training/plan-canvas-editor'
import type { TrainingPlanEditorDetail } from '@/lib/training-plan'
import { startOfWeekDateOnly, toDateKey } from '@/lib/dates'
import { PlannedMetricSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TrainingPlanEditorPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const { id } = await params

  // Athletes may open plans they own (e.g. AI self-coach drafts).
  if (!isCoachView(session)) {
    const owned = await prisma.trainingPlan.findFirst({
      where: { id, coachId: session.userId },
      select: { id: true },
    })
    if (!owned) redirect('/training')
  }

  const athleteId = await resolveAthleteId(session)

  const [rawPlan, rawTemplates, folders, athletes] = await Promise.all([
    getTrainingPlanDetail(id),
    isCoachView(session)
      ? getCoachLibraryTemplates(session.userId)
      : Promise.resolve([]),
    isCoachView(session)
      ? getCoachLibraryFolders(session.userId)
      : Promise.resolve([]),
    isCoachView(session)
      ? getCoachAthletes(session.userId)
      : Promise.resolve([]),
  ])

  if (!rawPlan) notFound()

  const { preferences, source: prefsSource } =
    await resolveTrainingPlanEstimationPreferences({
      forAthleteId: rawPlan.forAthleteId,
      level: rawPlan.level,
    })

  const plan: TrainingPlanEditorDetail = {
    id: rawPlan.id,
    title: rawPlan.title,
    description: rawPlan.description,
    sportFocus: rawPlan.sportFocus,
    weekCount: rawPlan.weekCount,
    level: rawPlan.level,
    target: rawPlan.target,
    forAthleteId: rawPlan.forAthleteId,
    forAthleteName: rawPlan.forAthlete?.name ?? null,
    sessions: rawPlan.sessions.map((s) => ({
      id: s.id,
      weekIndex: s.weekIndex,
      dayOfWeek: s.dayOfWeek,
      sortOrder: s.sortOrder,
      type: s.type,
      sessionType: s.sessionType,
      title: s.title,
      description: s.description,
      plannedDistance: s.plannedDistance,
      plannedDuration: s.plannedDuration,
      plannedDistanceMeters: s.plannedDistanceMeters,
      plannedDistanceSource: s.plannedDistanceSource,
      plannedDurationSource: s.plannedDurationSource,
      plannedDistanceMetersSource: s.plannedDistanceMetersSource,
      coachNotes: s.coachNotes,
      coachNotesPrivate: s.coachNotesPrivate,
      tags: s.tags,
      sourceTemplateId: s.sourceTemplateId,
      structure: s.structure ?? null,
      swimEnvironment: s.swimEnvironment,
      swimStructure: s.swimStructure ?? null,
    })),
    phases: rawPlan.phases.map((p) => ({
      id: p.id,
      phase: p.phase,
      sport: p.sport,
      label: p.label,
      startDay: p.startDay,
      endDay: p.endDay,
      color: p.color ?? null,
    })),
    races: rawPlan.races.map((r) => ({
      id: r.id,
      weekIndex: r.weekIndex,
      dayOfWeek: r.dayOfWeek,
      sortOrder: r.sortOrder,
      name: r.name,
      type: r.type,
      sport: r.sport,
      priority: r.priority,
      location: r.location,
      goal: r.goal,
      courseType: r.courseType,
      triathlonDistance: r.triathlonDistance,
      hyroxDivision: r.hyroxDivision,
      customDistanceKm: r.customDistanceKm,
      preparationWeeks: r.preparationWeeks,
    })),
  }

  const templates = rawTemplates.map((t) => {
    const metrics = resolveLibraryTemplateMetricsForAthlete(t, preferences)
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      sessionType: t.sessionType,
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      plannedDistanceMeters: t.plannedDistanceMeters ?? null,
      distanceApprox:
        metrics.distanceSource != null &&
        metrics.distanceSource !== PlannedMetricSource.MANUAL,
      durationApprox:
        metrics.durationSource != null &&
        metrics.durationSource !== PlannedMetricSource.MANUAL,
      folderId: t.folderId ?? null,
    }
  })

  return (
    <PlanCanvasEditor
      plan={plan}
      templates={templates}
      folders={folders}
      athleteId={athleteId ?? undefined}
      athletes={athletes.map((a) => ({ id: a.id, name: a.name }))}
      estimationPreferences={preferences}
      estimationPrefsSource={prefsSource}
      defaultStartWeekKey={toDateKey(startOfWeekDateOnly(new Date()))}
    />
  )
}
