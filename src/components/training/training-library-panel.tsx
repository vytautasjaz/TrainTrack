'use client'

import { useMemo, useState } from 'react'
import { GripVertical, Library, PanelRightClose, Search, X } from 'lucide-react'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { planWorkoutDataCardSurfaceClass } from '@/components/plan/plan-workout-data-card'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  useTrainingLibrary,
  type TrainingLibraryTemplateItem,
} from '@/components/training/training-library-context'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'
import { SESSION_TYPE_LABELS } from '@/lib/workout-builder/types'
import { cn } from '@/lib/utils'

function formatTemplateHero(t: TrainingLibraryTemplateItem): {
  value: string
  unit: string
} | null {
  if (t.type === WorkoutType.SWIM && t.plannedDistanceMeters != null) {
    return { value: String(t.plannedDistanceMeters), unit: 'm' }
  }
  if (t.distanceKm != null) {
    const km = Math.round(t.distanceKm * 10) / 10
    return {
      value: t.distanceApprox ? `~${km}` : String(km),
      unit: 'km',
    }
  }
  if (t.durationMin != null) {
    return {
      value: t.durationApprox ? `~${t.durationMin}` : String(t.durationMin),
      unit: 'min',
    }
  }
  return null
}

function formatTemplateDuration(t: TrainingLibraryTemplateItem): string | null {
  if (t.distanceKm == null && !(t.type === WorkoutType.SWIM && t.plannedDistanceMeters != null)) {
    return null
  }
  if (t.durationMin == null) return null
  return t.durationApprox ? `~${t.durationMin} min` : `${t.durationMin} min`
}

function LibraryTemplateCard({ template }: { template: TrainingLibraryTemplateItem }) {
  const dnd = usePlanWeekDnd()
  const [dragging, setDragging] = useState(false)
  const hero = formatTemplateHero(template)
  const duration = formatTemplateDuration(template)
  const sessionLabel = SESSION_TYPE_LABELS[template.sessionType] ?? template.sessionType

  return (
    <div
      draggable={Boolean(dnd)}
      onDragStart={(e) => {
        if (!dnd) return
        setDragging(true)
        dnd.setDragItem({
          kind: 'template',
          templateId: template.id,
          sport: template.type,
        })
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData('text/plain', `template:${template.id}`)
      }}
      onDragEnd={() => {
        setDragging(false)
        dnd?.setDragItem(null)
      }}
      className={cn(
        'group cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div
        className={cn(
          planWorkoutDataCardSurfaceClass(WorkoutStatus.PLANNED),
          'flex items-start gap-2 p-2.5',
        )}
      >
        <WorkoutSportIcon type={template.type} size="xs" appearance="outline" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug text-[#111827]">
              {template.title}
            </p>
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </div>
          <p className="mt-0.5 truncate text-[10px] leading-snug text-[#6B7280]">
            {WORKOUT_TYPE_LABELS[template.type]}
            {sessionLabel ? ` · ${sessionLabel}` : ''}
          </p>
          {hero ? (
            <div className="mt-1 flex items-baseline gap-0.5">
              <span className="text-[20px] font-bold leading-none tracking-tight tabular-nums text-[#111827]">
                {hero.value}
              </span>
              <span className="text-[11px] font-medium leading-none text-[#111827]">
                {hero.unit}
              </span>
            </div>
          ) : null}
          {duration ? (
            <p className="mt-0.5 text-[11px] font-medium text-[#6B7280]">{duration}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function TrainingLibraryPanel() {
  const library = useTrainingLibrary()
  const dnd = usePlanWeekDnd()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState<WorkoutType | 'ALL'>('ALL')
  const [isOver, setIsOver] = useState(false)

  const filtered = useMemo(() => {
    if (!library) return []
    const q = query.trim().toLowerCase()
    return library.templates.filter((t) => {
      if (sport !== 'ALL' && t.type !== sport) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q)
      )
    })
  }, [library, query, sport])

  const canDropPlan = dnd?.dragItem?.kind === 'plan'
  const showDropHint = Boolean(canDropPlan)

  function handleDragOver(e: React.DragEvent) {
    if (!canDropPlan) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setIsOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    if (!canDropPlan || !dnd?.dragItem || dnd.dragItem.kind !== 'plan') return
    dnd.savePlanWorkoutToLibrary(dnd.dragItem.id)
  }

  if (!library) return null

  return (
    <aside
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'sticky top-0 flex h-full max-h-[calc(100dvh-1rem)] flex-col overflow-hidden bg-card transition',
        canDropPlan && !isOver && 'bg-brand/[0.03]',
        canDropPlan && isOver && 'bg-brand/[0.07]',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-1 pb-2.5 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <Library className="h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Library</p>
            <p className="text-[11px] text-muted-foreground">
              {showDropHint
                ? 'Drop workout to save as template'
                : 'Drag both ways with plan days'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => library.setOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close library"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 border-b border-border/40 px-1 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="input-field-compact w-full pl-8 pr-8 text-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSport('ALL')}
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium transition',
              sport === 'ALL'
                ? 'bg-brand/15 text-brand'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            All
          </button>
          {LIBRARY_SPORTS.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => setSport(s.type)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium transition',
                sport === s.type
                  ? 'bg-brand/15 text-brand'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-1 py-2">
        {showDropHint && filtered.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs font-medium text-brand">
            Drop here to save to library
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {library.templates.length === 0
              ? 'No templates yet. Drag a plan workout here to save one.'
              : 'No templates match.'}
          </p>
        ) : (
          filtered.map((template) => (
            <LibraryTemplateCard key={template.id} template={template} />
          ))
        )}
      </div>
    </aside>
  )
}
