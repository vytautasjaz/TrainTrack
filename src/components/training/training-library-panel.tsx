'use client'

import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderOpen, GripVertical, Layers, Search, X } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  useTrainingLibrary,
  type TrainingLibraryTemplateItem,
} from '@/components/training/training-library-context'
import {
  LibraryFilterPicker,
  type LibraryFilterOption,
} from '@/components/workout-library/library-filter-picker'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'
import { SESSION_TYPE_LABELS } from '@/lib/workout-builder/types'
import { cn } from '@/lib/utils'

type FolderFilter = 'all' | 'unfiled' | string

function formatTemplateMeta(t: TrainingLibraryTemplateItem): string {
  const parts: string[] = []
  const session = SESSION_TYPE_LABELS[t.sessionType]
  if (session) parts.push(session)

  if (t.type === WorkoutType.SWIM && t.plannedDistanceMeters != null) {
    parts.push(`${t.plannedDistanceMeters} m`)
  } else if (t.distanceKm != null) {
    const km = Math.round(t.distanceKm * 10) / 10
    parts.push(t.distanceApprox ? `~${km} km` : `${km} km`)
  }

  if (t.durationMin != null) {
    parts.push(t.durationApprox ? `~${t.durationMin} min` : `${t.durationMin} min`)
  }

  if (parts.length === 0) return WORKOUT_TYPE_LABELS[t.type]
  return parts.join(' · ')
}

function LibraryTemplateRow({
  template,
  folderLabel,
}: {
  template: TrainingLibraryTemplateItem
  folderLabel: string | null
}) {
  const dnd = usePlanWeekDnd()
  const [dragging, setDragging] = useState(false)

  return (
    <li
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
        'flex cursor-grab items-center gap-2 rounded-[8px] border border-[var(--tt-line-strong,#d4d4d4)] bg-white px-2.5 py-2 shadow-[0_1px_0_rgba(17,17,17,0.04)] active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <GripVertical
        className="h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)]"
        strokeWidth={1.75}
        aria-hidden
      />
      <WorkoutSportIcon
        type={template.type}
        size="xs"
        className="!h-3.5 !w-3.5 !rounded-sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--tt-ink,#111)]">
          {template.title}
        </p>
        <p className="truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
          {folderLabel ? `${folderLabel} · ` : null}
          {formatTemplateMeta(template)}
        </p>
      </div>
    </li>
  )
}

export function TrainingLibraryPanel() {
  const library = useTrainingLibrary()
  const dnd = usePlanWeekDnd()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState<WorkoutType | 'ALL'>('ALL')
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    setFolderFilter('all')
  }, [sport])

  const foldersForSport = useMemo(() => {
    if (!library) return []
    const list =
      sport === 'ALL'
        ? library.folders
        : library.folders.filter((f) => f.sport === sport)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [library, sport])

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of library?.folders ?? []) map.set(f.id, f.name)
    return map
  }, [library?.folders])

  const sportTemplates = useMemo(() => {
    if (!library) return []
    return library.templates.filter((t) =>
      sport === 'ALL' ? true : t.type === sport,
    )
  }, [library, sport])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: sportTemplates.length,
      unfiled: 0,
    }
    for (const t of sportTemplates) {
      if (!t.folderId) counts.unfiled += 1
      else counts[t.folderId] = (counts[t.folderId] ?? 0) + 1
    }
    return counts
  }, [sportTemplates])

  const sportOptions = useMemo<LibraryFilterOption[]>(
    () => [
      {
        value: 'ALL',
        label: 'All sports',
        icon: (
          <Layers
            className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]"
            strokeWidth={1.75}
          />
        ),
      },
      ...LIBRARY_SPORTS.map((s) => ({
        value: s.type,
        label: s.label,
        icon: (
          <WorkoutSportIcon
            type={s.type}
            size="xs"
            className="!h-4 !w-4 !rounded-sm"
          />
        ),
      })),
    ],
    [],
  )

  const folderOptions = useMemo<LibraryFilterOption[]>(
    () => [
      {
        value: 'all',
        label: 'All folders',
        count: folderCounts.all ?? 0,
        icon: (
          <FolderOpen
            className="h-3.5 w-3.5 text-[var(--tt-ink-soft,#6b6b6b)]"
            strokeWidth={1.75}
          />
        ),
      },
      {
        value: 'unfiled',
        label: 'Unfiled',
        count: folderCounts.unfiled ?? 0,
        icon: (
          <Folder
            className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]"
            strokeWidth={1.75}
          />
        ),
      },
      ...foldersForSport.map((f) => ({
        value: f.id,
        label: f.name,
        count: folderCounts[f.id] ?? 0,
        icon: (
          <Folder
            className="h-3.5 w-3.5 text-[var(--tt-ink-soft,#6b6b6b)]"
            strokeWidth={1.75}
          />
        ),
      })),
    ],
    [foldersForSport, folderCounts],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sportTemplates.filter((t) => {
      if (folderFilter === 'unfiled' && t.folderId) return false
      if (
        folderFilter !== 'all' &&
        folderFilter !== 'unfiled' &&
        t.folderId !== folderFilter
      ) {
        return false
      }
      if (!q) return true
      const folderName = t.folderId
        ? (folderNameById.get(t.folderId) ?? '')
        : 'unfiled'
      return (
        t.title.toLowerCase().includes(q) ||
        WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q) ||
        folderName.toLowerCase().includes(q)
      )
    })
  }, [sportTemplates, folderFilter, query, folderNameById])

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
        'flex h-full flex-col overflow-hidden bg-white transition',
        '[&_button:not(:disabled)]:cursor-pointer',
        canDropPlan && !isOver && 'bg-[color-mix(in_srgb,var(--tt-red,#da2f36)_4%,white)]',
        canDropPlan && isOver && 'bg-[color-mix(in_srgb,var(--tt-red,#da2f36)_8%,white)]',
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--tt-line,#ebebeb)] px-4 py-3">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Library
          </p>
          <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
            {showDropHint ? 'Drop workout to save' : 'Drop onto a day'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => library.setOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-faint,#9a9a9a)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]"
          aria-label="Close library"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="space-y-2 border-b border-[var(--tt-line,#ebebeb)] px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint,#9a9a9a)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="h-8 w-full rounded-[6px] border border-[var(--tt-line,#ebebeb)] bg-white pl-8 pr-8 text-[13px] text-[var(--tt-ink,#111)] outline-none placeholder:text-[var(--tt-ink-faint,#9a9a9a)] focus:border-[var(--tt-line-strong,#ddd)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] hover:text-[var(--tt-ink,#111)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 px-0.5 pt-0.5">
          <LibraryFilterPicker
            label="Sport"
            value={sport}
            onValueChange={(v) => setSport(v as WorkoutType | 'ALL')}
            options={sportOptions}
            aria-label="Filter by sport"
          />
          <LibraryFilterPicker
            label="Folder"
            value={folderFilter}
            onValueChange={(v) => setFolderFilter(v as FolderFilter)}
            options={folderOptions}
            aria-label="Filter by folder"
          />
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain bg-[var(--tt-sidebar,#f5f5f5)]/40 p-3">
        {showDropHint && filtered.length === 0 ? (
          <li className="list-none px-1 py-8 text-center text-xs font-medium text-[var(--tt-red,#da2f36)]">
            Drop here to save to library
          </li>
        ) : filtered.length === 0 ? (
          <li className="list-none px-1 py-6 text-center text-xs text-[var(--tt-ink-faint,#9a9a9a)]">
            {library.templates.length === 0
              ? 'No templates yet. Drag a plan workout here to save one.'
              : 'No templates match.'}
          </li>
        ) : (
          filtered.map((template) => (
            <LibraryTemplateRow
              key={template.id}
              template={template}
              folderLabel={
                template.folderId
                  ? (folderNameById.get(template.folderId) ?? null)
                  : null
              }
            />
          ))
        )}
      </ul>
    </aside>
  )
}
