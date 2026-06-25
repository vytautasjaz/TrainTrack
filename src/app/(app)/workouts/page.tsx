import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ItemActions } from '@/components/ui/item-actions'
import { WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, WorkoutType } from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'
import { createTemplate, createWorkoutFromTemplate, deleteTemplate } from '@/app/actions/workouts'
import { todayDateKey } from '@/lib/dates'
import { PageHeader } from '@/components/ui/page-header'

const TEMPLATE_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

export default async function WorkoutsPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'COACH') redirect('/training')

  const templates = await prisma.workoutTemplate.findMany({
    where: { coachId: session.userId },
    orderBy: { title: 'asc' },
  })

  const today = todayDateKey()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workout templates"
        description="Reusable workouts — schedule onto the calendar"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workouts/templates/builder/new">
              <Plus className="h-3.5 w-3.5" />
              New template
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{t.title}</CardTitle>
                <Badge className={WORKOUT_TYPE_COLORS[t.type]}>{WORKOUT_TYPE_LABELS[t.type]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              <p className="text-sm">
                {formatDistance(t.distanceKm)} · {formatDuration(t.durationMin)}
              </p>
              {t.structure && (
                <p className="text-xs text-brand">Structured template</p>
              )}
              {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}

              <div className="space-y-3 border-t border-border/60 pt-3">
                <form action={createWorkoutFromTemplate} className="flex flex-wrap gap-2">
                  <input type="hidden" name="templateId" value={t.id} />
                  <input
                    type="date"
                    name="date"
                    defaultValue={today}
                    className="input-field max-w-[160px] py-1.5"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Schedule
                  </Button>
                </form>
                <ItemActions
                  editHref={
                    t.structure
                      ? `/workouts/templates/builder/${t.id}`
                      : `/workouts/templates/${t.id}/edit`
                  }
                  deleteAction={deleteTemplate}
                  deleteId={t.id}
                  deleteIdField="templateId"
                  deleteConfirmMessage={`Delete template "${t.title}"?`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="create-template">
          <CardHeader>
            <CardTitle>Create template</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTemplate} className="grid gap-3 md:grid-cols-2">
              <input name="title" placeholder="Title" required className="input-field" />
              <select name="type" required className="input-field">
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORKOUT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                name="distanceKm"
                type="number"
                step="0.1"
                placeholder="Distance (km)"
                className="input-field"
              />
              <input
                name="durationMin"
                type="number"
                placeholder="Duration (min)"
                className="input-field"
              />
              <textarea
                name="description"
                placeholder="Description"
                className="input-field md:col-span-2"
                rows={2}
              />
              <textarea
                name="notes"
                placeholder="Coach notes"
                className="input-field md:col-span-2"
                rows={2}
              />
              <Button type="submit" variant="secondary" size="sm" className="md:col-span-2 w-fit">
                Save template
              </Button>
            </form>
          </CardContent>
      </Card>
    </div>
  )
}
