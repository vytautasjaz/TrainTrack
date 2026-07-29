'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ItemActions } from '@/components/ui/item-actions'
import { WORKOUT_TYPE_LABELS, WORKOUT_TYPE_COLORS, WorkoutType } from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import {
  createWorkoutFromTemplate,
  deleteTemplate,
  duplicateTemplate,
} from '@/app/actions/workouts'

export type WorkoutLibraryItem = {
  id: string
  title: string
  type: WorkoutType
  sessionType: import('@prisma/client').SessionType
  description: string | null
  distanceKm: number | null
  durationMin: number | null
  structure: unknown
  notes: string | null
}

type WorkoutLibraryGridProps = {
  templates: WorkoutLibraryItem[]
  today: string
}

export function WorkoutLibraryGrid({ templates, today }: WorkoutLibraryGridProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q) ||
        getSessionTypeLabel(t.sessionType, t.type).toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    )
  }, [templates, query])

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workout library..."
          className="pl-9"
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Full Workouts ({filtered.length})
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
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
                {Boolean(t.structure) && (
                  <p className="text-xs text-brand">Structured workout</p>
                )}
                {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}

                <div className="space-y-3 border-t border-border/60 pt-3">
                  <form action={createWorkoutFromTemplate} className="flex flex-wrap gap-2">
                    <input type="hidden" name="templateId" value={t.id} />
                    <Input
                      type="date"
                      name="date"
                      defaultValue={today}
                      variant="table"
                      className="max-w-[160px]"
                    />
                    <Button type="submit" variant="ghost" size="xs">
                      Create workout
                    </Button>
                  </form>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="xs" asChild>
                      <Link
                        href={
                          t.structure
                            ? `/workouts/templates/builder/${t.id}`
                            : `/workouts/templates/${t.id}/edit`
                        }
                      >
                        Edit
                      </Link>
                    </Button>
                    <form action={duplicateTemplate}>
                      <input type="hidden" name="templateId" value={t.id} />
                      <Button type="submit" variant="ghost" size="xs">
                        Duplicate
                      </Button>
                    </form>
                    <ItemActions
                      deleteAction={deleteTemplate}
                      deleteId={t.id}
                      deleteIdField="templateId"
                      deleteConfirmTitle="Delete template?"
                      deleteConfirmMessage={`“${t.title}” will be removed from your library.`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No workouts match your search.</p>
        )}
      </div>
    </div>
  )
}
