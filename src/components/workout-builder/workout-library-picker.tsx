'use client'

import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderOpen, Layers, Search, X } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import type {
  WorkoutLibraryFolderPickerItem,
  WorkoutTemplatePickerItem,
} from '@/app/actions/workout-builder'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  LibraryFilterPicker,
  type LibraryFilterOption,
} from '@/components/workout-library/library-filter-picker'
import { cn } from '@/lib/utils'

const TEMPLATE_NONE = '__none__'

type FolderFilter = 'all' | 'unfiled' | string

type WorkoutLibraryPickerProps = {
  templates: WorkoutTemplatePickerItem[]
  folders?: WorkoutLibraryFolderPickerItem[]
  selectedTemplateId: string
  onSelect: (template: WorkoutTemplatePickerItem) => void
  /** Prefer showing this sport when the editor sport changes. */
  activeSport?: WorkoutType
  /** `panel` = always-visible list (modal side panel). `dropdown` = icon popover. */
  variant?: 'dropdown' | 'panel'
  className?: string
}

function formatTemplateMeta(t: WorkoutTemplatePickerItem): string {
  const parts: string[] = [getSessionTypeLabel(t.sessionType, t.type)]
  if (t.type === WorkoutType.SWIM && t.distanceKm != null) {
    parts.push(`${Math.round(t.distanceKm * 1000)} m`)
  } else if (t.distanceKm != null) {
    const km = Math.round(t.distanceKm * 10) / 10
    parts.push(`${km} km`)
  }
  if (t.durationMin != null) {
    parts.push(`${t.durationMin} min`)
  }
  return parts.filter(Boolean).join(' · ')
}

function TemplateBrowser({
  templates,
  folders,
  selectedTemplateId,
  onSelect,
  activeSport,
  listClassName,
}: {
  templates: WorkoutTemplatePickerItem[]
  folders: WorkoutLibraryFolderPickerItem[]
  selectedTemplateId: string
  onSelect: (template: WorkoutTemplatePickerItem) => void
  activeSport?: WorkoutType
  listClassName?: string
}) {
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState<WorkoutType | 'ALL'>(
    activeSport ?? 'ALL',
  )
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')

  // Keep sport/folder filters stable when a template is applied (editor sport
  // may change). Only reset folder when the user changes the sport filter.
  useEffect(() => {
    setFolderFilter('all')
  }, [sport])

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of folders) map.set(f.id, f.name)
    return map
  }, [folders])

  const foldersForSport = useMemo(() => {
    const list =
      sport === 'ALL' ? folders : folders.filter((f) => f.sport === sport)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, sport])

  const sportTemplates = useMemo(
    () =>
      templates.filter((t) => (sport === 'ALL' ? true : t.type === sport)),
    [templates, sport],
  )

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
        folderName.toLowerCase().includes(q) ||
        getSessionTypeLabel(t.sessionType, t.type).toLowerCase().includes(q)
      )
    })
  }, [sportTemplates, folderFilter, query, folderNameById])

  return (
    <>
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

        <div className="flex flex-col gap-1.5 px-0.5">
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

      <ul
        className={cn(
          'min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain bg-[var(--tt-sidebar,#f5f5f5)]/40 p-3',
          listClassName,
        )}
      >
        {filtered.length === 0 ? (
          <li className="list-none px-1 py-6 text-center text-xs text-[var(--tt-ink-faint,#9a9a9a)]">
            {templates.length === 0 ? 'No templates yet' : 'No templates match.'}
          </li>
        ) : (
          filtered.map((template) => {
            const folderLabel = template.folderId
              ? (folderNameById.get(template.folderId) ?? null)
              : null
            const selected = selectedTemplateId === template.id
            return (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => onSelect(template)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-[8px] border border-[var(--tt-line-strong,#d4d4d4)] bg-white px-2.5 py-2 text-left shadow-[0_1px_0_rgba(17,17,17,0.04)] transition hover:border-[var(--tt-ink,#111)]/25',
                    selected &&
                      'border-[var(--tt-ink,#111)] ring-1 ring-[var(--tt-ink,#111)]/10',
                  )}
                >
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
                </button>
              </li>
            )
          })
        )}
      </ul>
    </>
  )
}

export function WorkoutLibraryPicker({
  templates,
  folders = [],
  selectedTemplateId,
  onSelect,
  activeSport,
  variant = 'dropdown',
  className,
}: WorkoutLibraryPickerProps) {
  const [open, setOpen] = useState(false)

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col bg-white [&_button:not(:disabled)]:cursor-pointer',
          className,
        )}
      >
        <TemplateBrowser
          templates={templates}
          folders={folders}
          selectedTemplateId={selectedTemplateId}
          activeSport={activeSport}
          onSelect={onSelect}
        />
      </div>
    )
  }

  if (templates.length === 0) return null

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground',
          open && 'bg-muted/60 text-foreground',
          selectedTemplateId !== TEMPLATE_NONE && 'text-brand',
        )}
        aria-label="Workout library"
        aria-expanded={open}
        title="Workout library"
      >
        <FolderOpen className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-[110] mt-1 flex h-80 w-80 flex-col overflow-hidden rounded-xl border border-[var(--tt-line,#ebebeb)] bg-white shadow-lg">
            <div className="border-b border-[var(--tt-line,#ebebeb)] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Workout Library
              </p>
              <p className="text-[11px] text-muted-foreground">
                Full workouts — creates an editable copy
              </p>
            </div>
            <TemplateBrowser
              templates={templates}
              folders={folders}
              selectedTemplateId={selectedTemplateId}
              activeSport={activeSport}
              onSelect={(template) => {
                onSelect(template)
                setOpen(false)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
