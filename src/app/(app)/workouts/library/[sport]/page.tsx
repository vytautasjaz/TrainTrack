import { notFound, redirect } from 'next/navigation'
import { getSession, resolveAthleteId, isCoachView} from '@/lib/session'
import { parseSportSlug } from '@/lib/workout-library/config'
import { getCoachLibraryTemplatesBySport } from '@/lib/workout-library/queries'
import { resolveLibraryTemplateMetricsForAthlete } from '@/lib/workout-library/template-metrics'
import { syncApproxTagsFromSources } from '@/lib/workout-metric-source'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import type { LibrarySort, WorkoutLibraryTemplate } from '@/lib/workout-library/types'
import { WorkoutLibrarySportView } from '@/components/workout-library/workout-library-sport-view'
import { todayDateKey } from '@/lib/dates'

type SportLibraryPageProps = {
  params: Promise<{ sport: string }>
  searchParams: Promise<{ q?: string; sort?: string; session?: string }>
}

export default async function SportLibraryPage({
  params,
  searchParams,
}: SportLibraryPageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/training')

  const { sport: sportSlug } = await params
  const sport = parseSportSlug(sportSlug)
  if (!sport) notFound()

  const athleteId = await resolveAthleteId(session)
  const queryParams = await searchParams
  const [rawTemplates, preferences] = await Promise.all([
    getCoachLibraryTemplatesBySport(session.userId, sport),
    loadAthletePreferencesForBuilder(athleteId),
  ])

  const templates: WorkoutLibraryTemplate[] = rawTemplates.map((t) => {
    const metrics = resolveLibraryTemplateMetricsForAthlete(t, preferences)
    return {
      ...t,
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      distanceSource: metrics.distanceSource,
      durationSource: metrics.durationSource,
      tags: syncApproxTagsFromSources(t.tags, {
        distance: metrics.distanceSource,
        duration: metrics.durationSource,
      }),
    }
  })
  const sort = (queryParams.sort as LibrarySort) || 'title'

  return (
    <WorkoutLibrarySportView
      sport={sport}
      templates={templates}
      today={todayDateKey()}
      query={queryParams.q ?? ''}
      sort={sort}
      sessionFilter={queryParams.session ?? 'all'}
    />
  )
}
