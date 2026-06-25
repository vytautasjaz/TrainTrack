import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { WORKOUT_TYPE_LABELS, WorkoutType } from '@/lib/constants'
import { updateTemplate } from '@/app/actions/workouts'

const TEMPLATE_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type EditTemplatePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'COACH') redirect('/workouts')

  const { id } = await params
  const template = await prisma.workoutTemplate.findFirst({
    where: { id, coachId: session.userId },
  })
  if (!template) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit template"
        description={template.title}
        action={<BackButton fallbackHref="/workouts" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTemplate} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="templateId" value={template.id} />
            <input
              name="title"
              defaultValue={template.title}
              required
              className="input-field md:col-span-2"
            />
            <select name="type" defaultValue={template.type} required className="input-field">
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
              defaultValue={template.distanceKm ?? undefined}
              placeholder="Distance (km)"
              className="input-field"
            />
            <input
              name="durationMin"
              type="number"
              defaultValue={template.durationMin ?? undefined}
              placeholder="Duration (min)"
              className="input-field"
            />
            <textarea
              name="description"
              defaultValue={template.description ?? ''}
              placeholder="Description"
              className="input-field md:col-span-2"
              rows={2}
            />
            <textarea
              name="notes"
              defaultValue={template.notes ?? ''}
              placeholder="Coach notes"
              className="input-field md:col-span-2"
              rows={2}
            />
            <Button type="submit" variant="secondary" size="sm" className="md:col-span-2 w-fit">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
