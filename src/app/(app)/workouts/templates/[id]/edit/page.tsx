import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession, isCoachView} from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { WORKOUT_TYPE_LABELS, WorkoutType } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateTemplate } from '@/app/actions/workouts'

const TEMPLATE_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type EditTemplatePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/workouts')

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
        action={<BackButton fallbackHref={`/workouts/library/${template.type.toLowerCase()}`} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTemplate} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="templateId" value={template.id} />
            <Input
              name="title"
              defaultValue={template.title}
              required
              className="md:col-span-2"
            />
            <Select name="type" defaultValue={template.type} required>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORKOUT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
            <Input
              name="distanceKm"
              type="number"
              step="0.1"
              defaultValue={template.distanceKm ?? undefined}
              placeholder="Distance (km)"
            />
            <Input
              name="durationMin"
              type="number"
              defaultValue={template.durationMin ?? undefined}
              placeholder="Duration (min)"
            />
            <Textarea
              name="description"
              defaultValue={template.description ?? ''}
              placeholder="Description"
              className="md:col-span-2"
              rows={2}
            />
            <Textarea
              name="notes"
              defaultValue={template.notes ?? ''}
              placeholder="Coach notes"
              className="md:col-span-2"
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
