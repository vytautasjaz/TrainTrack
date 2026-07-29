'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'
import { WorkoutLibraryFilters } from '@/components/workout-library/workout-library-filters'
import {
  useFilteredLibraryTemplates,
  WorkoutLibraryTemplateGrid,
} from '@/components/workout-library/workout-library-template-card'
import {
  getLibrarySportConfig,
  newTemplateHref,
  type LibraryBuilderKind,
} from '@/lib/workout-library/config'
import type { WorkoutLibraryTemplate, LibrarySort } from '@/lib/workout-library/types'
import type { SessionType, WorkoutType } from '@prisma/client'
import { createTemplate } from '@/app/actions/workouts'
import { sessionTypesForSport } from '@/lib/workout-builder/session-modes'

type WorkoutLibrarySportViewProps = {
  sport: WorkoutType
  templates: WorkoutLibraryTemplate[]
  today: string
  query: string
  sort: LibrarySort
  sessionFilter: string
}

function builderHint(kind: LibraryBuilderKind): string {
  switch (kind) {
    case 'swim':
      return 'Use the swim builder for sets, strokes, pace, and rest.'
    case 'block':
      return 'Use the structured builder for intervals, tempo blocks, and warm-up/cool-down.'
    case 'text':
      return 'Text-only templates — describe the workout in plain language.'
  }
}

function CreateTextTemplateForm({ sport }: { sport: WorkoutType }) {
  return (
    <Card id="create">
      <CardHeader>
        <CardTitle>New {getLibrarySportConfig(sport)?.label ?? 'workout'} template</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createTemplate} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="type" value={sport} />
          <input type="hidden" name="returnSport" value={sport} />
          <Input name="title" placeholder="Title" required className="md:col-span-2" />
          <Input
            name="durationMin"
            type="number"
            placeholder="Duration (min)"
            className={sport === 'STRENGTH' || sport === 'HYROX' ? 'md:col-span-2' : undefined}
          />
          {sport !== 'STRENGTH' && sport !== 'HYROX' && (
            <Input name="distanceKm" type="number" step="0.1" placeholder="Distance (km)" />
          )}
          <Textarea
            name="description"
            placeholder="Workout description"
            className="md:col-span-2"
            rows={4}
            required
          />
          <Textarea
            name="notes"
            placeholder="Coach notes (optional)"
            className="md:col-span-2"
            rows={2}
          />
          <Button type="submit" variant="secondary" size="sm" className="md:col-span-2 w-fit">
            Save to library
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SportLibraryContent({
  sport,
  templates,
  today,
  query,
  sort,
  sessionFilter,
}: WorkoutLibrarySportViewProps) {
  const config = getLibrarySportConfig(sport)
  const sessionTypes = sessionTypesForSport(sport) as SessionType[]
  const filtered = useFilteredLibraryTemplates(templates, query, sort, sessionFilter)

  if (!config) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${config.label} library`}
        description={config.description}
        action={
          config.builderKind === 'text' ? (
            <Button variant="secondary" size="sm" asChild>
              <a href="#create">
                <Plus className="h-3.5 w-3.5" />
                New template
              </a>
            </Button>
          ) : (
            <Button variant="secondary" size="sm" asChild>
              <Link href={newTemplateHref(sport)}>
                <Plus className="h-3.5 w-3.5" />
                New workout
              </Link>
            </Button>
          )
        }
      />

      <p className="text-sm text-muted-foreground">{builderHint(config.builderKind)}</p>

      <WorkoutLibraryFilters sport={sport} sessionTypes={sessionTypes} />

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saved workouts ({filtered.length})
        </p>
        <WorkoutLibraryTemplateGrid
          templates={filtered}
          today={today}
          emptyMessage={
            query
              ? 'No workouts match your search.'
              : `No ${config.label.toLowerCase()} templates yet — create one to get started.`
          }
        />
      </div>

      {config.builderKind === 'text' && <CreateTextTemplateForm sport={sport} />}
    </div>
  )
}

export function WorkoutLibrarySportView(props: WorkoutLibrarySportViewProps) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <SportLibraryContent {...props} />
    </Suspense>
  )
}
