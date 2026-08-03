'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ItemActions } from '@/components/ui/item-actions'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  editTemplateHref,
  isStructuredTemplate,
  newTemplateHref,
} from '@/lib/workout-library/config'
import type { WorkoutLibraryTemplate } from '@/lib/workout-library/types'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { formatDistance, formatDuration } from '@/lib/utils'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import { WorkoutType } from '@prisma/client'
import {
  createWorkoutFromTemplate,
  deleteTemplate,
  duplicateTemplate,
} from '@/app/actions/workouts'
import {
  deleteSwimTemplate,
  duplicateSwimTemplate,
  scheduleSwimFromTemplate,
} from '@/app/actions/swim-workout'

type WorkoutLibraryTemplateCardProps = {
  template: WorkoutLibraryTemplate
  today: string
}

function templateMetrics(template: WorkoutLibraryTemplate): string {
  if (template.type === WorkoutType.SWIM) {
    return [
      template.plannedDistanceMeters
        ? formatSwimDistance(template.plannedDistanceMeters)
        : null,
      template.durationMin ? formatDuration(template.durationMin) : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const durationApprox = template.tags.includes('approx:duration')
  const distanceApprox = template.tags.includes('approx:distance')

  return [
    template.distanceKm != null
      ? `${distanceApprox ? '~' : ''}${formatDistance(template.distanceKm)}`
      : null,
    template.durationMin
      ? `${durationApprox ? '~' : ''}${formatDuration(template.durationMin)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function WorkoutLibraryTemplateCard({
  template,
  today,
}: WorkoutLibraryTemplateCardProps) {
  const metrics = templateMetrics(template)
  const structured = isStructuredTemplate(template)
  const isSwim = template.type === WorkoutType.SWIM
  const scheduleAction = isSwim ? scheduleSwimFromTemplate : createWorkoutFromTemplate
  const duplicateAction = isSwim ? duplicateSwimTemplate : duplicateTemplate
  const deleteAction = isSwim ? deleteSwimTemplate : deleteTemplate

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <WorkoutSportIcon type={template.type} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{template.title}</CardTitle>
              <Badge className={WORKOUT_TYPE_COLORS[template.type]} variant="outline">
                {getSessionTypeLabel(template.sessionType, template.type)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {format(template.updatedAt, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        {template.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
        )}
        {metrics && <p className="text-sm">{metrics}</p>}
        {structured && (
          <p className="text-xs font-medium text-brand">Structured workout</p>
        )}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {template.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{template.notes}</p>
        )}

        <div className="mt-auto space-y-3 border-t border-border/60 pt-3">
          <form action={scheduleAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="templateId" value={template.id} />
            <Input
              type="date"
              name="date"
              defaultValue={today}
              variant="table"
              className="max-w-[160px]"
            />
            <Button type="submit" variant="ghost" size="xs">
              Schedule
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="xs" asChild>
              <Link href={editTemplateHref(template)}>Edit</Link>
            </Button>
            <form action={duplicateAction}>
              <input type="hidden" name="templateId" value={template.id} />
              <Button type="submit" variant="ghost" size="xs">
                Duplicate
              </Button>
            </form>
            <ItemActions
              deleteAction={deleteAction}
              deleteId={template.id}
              deleteIdField="templateId"
              deleteConfirmTitle="Delete template?"
              deleteConfirmMessage={`“${template.title}” will be removed from your library.`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type WorkoutLibraryTemplateGridProps = {
  templates: WorkoutLibraryTemplate[]
  today: string
  emptyMessage: string
}

export function WorkoutLibraryTemplateGrid({
  templates,
  today,
  emptyMessage,
}: WorkoutLibraryTemplateGridProps) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <WorkoutLibraryTemplateCard key={template.id} template={template} today={today} />
      ))}
    </div>
  )
}

type WorkoutLibraryHubSportCardProps = {
  slug: string
  label: string
  description: string
  count: number
  type: WorkoutType
}

export function WorkoutLibraryHubSportCard({
  slug,
  label,
  description,
  count,
  type,
}: WorkoutLibraryHubSportCardProps) {
  return (
    <Link href={`/workouts/library/${slug}`} className="group block h-full">
      <Card className="h-full transition hover:border-brand/30 hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <WorkoutSportIcon type={type} size="md" />
            <div className="min-w-0">
              <CardTitle className="text-lg group-hover:text-brand">{label}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'workout' : 'workouts'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function useFilteredLibraryTemplates(
  templates: WorkoutLibraryTemplate[],
  query: string,
  sort: import('@/lib/workout-library/types').LibrarySort,
  sessionFilter: string,
) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = templates

    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q) ||
          getSessionTypeLabel(t.sessionType, t.type).toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }

    if (sessionFilter && sessionFilter !== 'all') {
      list = list.filter((t) => t.sessionType === sessionFilter)
    }

    const sorted = [...list]
    switch (sort) {
      case 'updated':
        sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        break
      case 'session':
        sorted.sort((a, b) =>
          getSessionTypeLabel(a.sessionType, a.type).localeCompare(
            getSessionTypeLabel(b.sessionType, b.type),
          ),
        )
        break
      case 'title':
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return sorted
  }, [templates, query, sort, sessionFilter])
}
