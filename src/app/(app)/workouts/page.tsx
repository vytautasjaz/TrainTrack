import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession, isCoachView, resolveAthleteId, getCoachAthletes } from '@/lib/session'
import {
  getCoachLibraryFolders,
  getCoachLibraryTemplates,
} from '@/lib/workout-library/queries'
import { resolveLibraryTemplateMetricsForAthlete } from '@/lib/workout-library/template-metrics'
import { syncApproxTagsFromSources } from '@/lib/workout-metric-source'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import {
  WorkoutLibraryBrowser,
  type LibraryBrowserTemplate,
} from '@/components/workout-library/workout-library-browser'
import { todayDateKey } from '@/lib/dates'
import { parseSportSlug } from '@/lib/workout-library/config'

type WorkoutsPageProps = {
  searchParams: Promise<{ sport?: string }>
}

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/training')

  const { sport: sportSlug } = await searchParams
  const athleteId = await resolveAthleteId(session)
  const [rawTemplates, folders, preferences, coachAthletes] = await Promise.all([
    getCoachLibraryTemplates(session.userId),
    getCoachLibraryFolders(session.userId),
    loadAthletePreferencesForBuilder(athleteId),
    getCoachAthletes(session.userId),
  ])

  const templates: LibraryBrowserTemplate[] = rawTemplates.map((t) => {
    const metrics = resolveLibraryTemplateMetricsForAthlete(t, preferences)
    return {
      ...t,
      folderId: t.folderId ?? null,
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      distanceSource: metrics.distanceSource,
      durationSource: metrics.durationSource,
      tags: syncApproxTagsFromSources(t.tags, {
        distance: metrics.distanceSource,
        duration: metrics.durationSource,
      }),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }
  })

  const initialSport =
    sportSlug && sportSlug !== 'all'
      ? (parseSportSlug(sportSlug) ?? 'all')
      : 'all'

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading library…</div>}>
      <WorkoutLibraryBrowser
        templates={templates}
        folders={folders}
        today={todayDateKey()}
        initialSport={initialSport === 'all' ? 'all' : initialSport}
        athletes={coachAthletes.map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          avatarUrl: a.avatarUrl,
        }))}
        selectedAthleteId={athleteId ?? coachAthletes[0]?.id ?? ''}
      />
    </Suspense>
  )
}
