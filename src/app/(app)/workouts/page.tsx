import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { getSession, isCoach} from '@/lib/session'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WorkoutLibraryHubSportCard } from '@/components/workout-library/workout-library-template-card'
import {
  getCoachLibraryCountsBySport,
  getCoachLibraryTemplates,
} from '@/lib/workout-library/queries'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'

export default async function WorkoutsPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoach(session)) redirect('/training')

  const [counts, recent] = await Promise.all([
    getCoachLibraryCountsBySport(session.userId),
    getCoachLibraryTemplates(session.userId),
  ])

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const recentTemplates = recent.slice(0, 6)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workout Library"
        description="Build, store, and reuse workouts across all sports — schedule templates onto the training calendar anytime."
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/workouts/library/run">
              <Plus className="h-3.5 w-3.5" />
              Browse by sport
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LIBRARY_SPORTS.map((sport) => (
          <WorkoutLibraryHubSportCard
            key={sport.slug}
            slug={sport.slug}
            label={sport.label}
            description={sport.description}
            count={counts[sport.type]}
            type={sport.type}
          />
        ))}
      </div>

      {recentTemplates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Recently updated</h2>
              <p className="text-sm text-muted-foreground">
                {total} saved {total === 1 ? 'workout' : 'workouts'} across all sports
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentTemplates.map((template) => (
              <Link
                key={template.id}
                href={`/workouts/library/${LIBRARY_SPORTS.find((s) => s.type === template.type)?.slug ?? 'run'}`}
                className="block"
              >
                <Card className="transition hover:border-brand/30">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {LIBRARY_SPORTS.find((s) => s.type === template.type)?.label} ·{' '}
                        {format(template.updatedAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
