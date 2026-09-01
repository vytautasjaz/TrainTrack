'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  CalendarPlus,
  ChevronDown,
  Copy,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as WT } from '@prisma/client'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ItemActions } from '@/components/ui/item-actions'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import { LibraryScheduleDayModal } from '@/components/workout-library/library-schedule-day-modal'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import {
  editTemplateHref,
  isStructuredTemplate,
  LIBRARY_SPORTS,
  type LibrarySportConfig,
} from '@/lib/workout-library/config'
import type { WorkoutLibraryTemplate } from '@/lib/workout-library/types'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { formatDistance, formatDuration, cn } from '@/lib/utils'
import { formatSwimDistance } from '@/lib/swim-workout/format'
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
import {
  createLibraryFolder,
  deleteLibraryFolder,
  moveTemplateToFolder,
} from '@/app/actions/library-folders'

export type LibraryBrowserTemplate = Omit<
  WorkoutLibraryTemplate,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string
  updatedAt: string
}

export type LibraryBrowserFolder = {
  id: string
  sport: WorkoutType
  name: string
  sortOrder: number
}

type SportFilter = 'all' | WorkoutType
/** all = every folder · unfiled = no folder · or a folder id */
type FolderFilter = 'all' | 'unfiled' | string
type SortId = 'folder' | 'title' | 'updated' | 'sport'
type ViewMode = 'list' | 'cards'
type KindFilter = 'all' | 'structured' | 'text'

const SPORT_RAIL: Record<WorkoutType, string> = {
  RUN: 'var(--color-sport-run)',
  BIKE: 'var(--color-sport-bike)',
  SWIM: 'var(--color-sport-swim)',
  STRENGTH: 'var(--color-sport-strength)',
  HYROX: 'var(--color-sport-hyrox)',
  TRIATHLON: 'var(--color-sport-tri)',
  RECOVERY: 'var(--color-sport-recovery)',
  REST: 'var(--color-sport-rest)',
}

function templateMetrics(template: LibraryBrowserTemplate): string {
  if (template.type === WT.SWIM) {
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

function createLabel(sport: SportFilter) {
  if (sport === 'all') return 'New template'
  const config = LIBRARY_SPORTS.find((s) => s.type === sport)
  if (config?.builderKind === 'swim') return 'New swim set'
  if (config?.builderKind === 'text') return 'New text template'
  return 'New workout'
}

function createSport(sport: SportFilter): WorkoutType {
  if (sport === 'all') return WT.RUN
  return sport
}

function createHint(sport: SportFilter) {
  if (sport === WT.SWIM)
    return 'Folders by topic · swim builder for structured sets.'
  if (sport === WT.STRENGTH || sport === WT.RECOVERY || sport === WT.HYROX)
    return 'Topic folders · text templates for session notes.'
  if (sport === WT.RUN || sport === WT.BIKE || sport === WT.TRIATHLON)
    return 'Group by topic — Threshold, Long Runs, athlete blocks, etc.'
  return 'Browse by sport and folder · Schedule onto a plan day.'
}

function folderName(
  folderById: Map<string, LibraryBrowserFolder>,
  folderId: string | null | undefined,
): string {
  if (!folderId) return 'Unfiled'
  return folderById.get(folderId)?.name ?? 'Unfiled'
}

type WorkoutLibraryBrowserProps = {
  folders: LibraryBrowserFolder[]
  templates: LibraryBrowserTemplate[]
  today: string
  initialSport?: SportFilter
}

export function WorkoutLibraryBrowser({
  folders,
  templates,
  today,
  initialSport = 'all',
}: WorkoutLibraryBrowserProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sportParam = searchParams.get('sport')
  const sportFromUrl: SportFilter = (() => {
    if (!sportParam) return initialSport
    if (sportParam === 'all') return 'all'
    const match = LIBRARY_SPORTS.find((s) => s.slug === sportParam)
    return match?.type ?? initialSport
  })()

  const [sport, setSport] = useState<SportFilter>(sportFromUrl)
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('folder')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => templates[0]?.id ?? null,
  )
  const [scheduleTarget, setScheduleTarget] =
    useState<LibraryBrowserTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [schedulePending, startSchedule] = useTransition()
  const [duplicatePending, startDuplicate] = useTransition()
  const [folderPending, startFolder] = useTransition()
  const [scheduledFlash, setScheduledFlash] = useState<{
    id: string
    label: string
  } | null>(null)

  const folderById = useMemo(() => {
    const map = new Map<string, LibraryBrowserFolder>()
    for (const f of folders) map.set(f.id, f)
    return map
  }, [folders])

  useEffect(() => {
    setSport(sportFromUrl)
  }, [sportFromUrl])

  function setSportFilter(next: SportFilter) {
    setSport(next)
    setFolderFilter('all')
    setCreatingFolder(false)
    setNewFolderName('')
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('sport')
    else {
      const slug = LIBRARY_SPORTS.find((s) => s.type === next)?.slug
      if (slug) params.set('sport', slug)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const foldersForSport = useMemo(() => {
    const list =
      sport === 'all' ? folders : folders.filter((f) => f.sport === sport)
    return [...list].sort((a, b) => {
      if (sport === 'all' && a.sport !== b.sport) {
        return (
          WORKOUT_TYPE_LABELS[a.sport].localeCompare(
            WORKOUT_TYPE_LABELS[b.sport],
          ) || a.name.localeCompare(b.name)
        )
      }
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    })
  }, [folders, sport])

  const sportTemplates = useMemo(
    () =>
      sport === 'all' ? templates : templates.filter((t) => t.type === sport),
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

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length }
    for (const s of LIBRARY_SPORTS) {
      counts[s.type] = templates.filter((t) => t.type === s.type).length
    }
    return counts
  }, [templates])

  const filtered = useMemo(() => {
    let list = sportTemplates
    if (folderFilter === 'unfiled') {
      list = list.filter((t) => !t.folderId)
    } else if (folderFilter !== 'all') {
      list = list.filter((t) => t.folderId === folderFilter)
    }
    if (kindFilter === 'structured') {
      list = list.filter((t) => isStructuredTemplate(t))
    } else if (kindFilter === 'text') {
      list = list.filter((t) => !isStructuredTemplate(t))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((t) => {
        const fname = folderName(folderById, t.folderId).toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q) ||
          getSessionTypeLabel(t.sessionType, t.type).toLowerCase().includes(q) ||
          fname.includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
        )
      })
    }
    list = [...list].sort((a, b) => {
      if (sort === 'updated') return b.updatedAt.localeCompare(a.updatedAt)
      if (sort === 'sport') {
        return (
          WORKOUT_TYPE_LABELS[a.type].localeCompare(
            WORKOUT_TYPE_LABELS[b.type],
          ) || a.title.localeCompare(b.title)
        )
      }
      if (sort === 'folder') {
        const fa = folderName(folderById, a.folderId)
        const fb = folderName(folderById, b.folderId)
        return fa.localeCompare(fb) || a.title.localeCompare(b.title)
      }
      return a.title.localeCompare(b.title)
    })
    return list
  }, [sportTemplates, folderFilter, kindFilter, query, sort, folderById])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(filtered[0]!.id)
    }
  }, [filtered, selectedId])

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    templates.find((t) => t.id === selectedId) ??
    null

  const foldersForSelected = useMemo(() => {
    if (!selected) return []
    return folders
      .filter((f) => f.sport === selected.type)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [folders, selected])

  const sportConfig: LibrarySportConfig | undefined =
    sport === 'all' ? undefined : LIBRARY_SPORTS.find((s) => s.type === sport)

  const activeFolderLabel =
    folderFilter === 'all'
      ? 'All folders'
      : folderFilter === 'unfiled'
        ? 'Unfiled'
        : folderById.get(folderFilter)?.name ?? 'Folder'

  function openSchedule(t: LibraryBrowserTemplate) {
    setSelectedId(t.id)
    setScheduleTarget(t)
  }

  function confirmSchedule(dateKey: string) {
    if (!scheduleTarget) return
    const template = scheduleTarget
    const formData = new FormData()
    formData.set('templateId', template.id)
    formData.set('date', dateKey)
    const action =
      template.type === WT.SWIM
        ? scheduleSwimFromTemplate
        : createWorkoutFromTemplate
    startSchedule(async () => {
      await action(formData)
      const label = format(new Date(`${dateKey}T00:00:00Z`), 'EEE d MMM')
      setScheduledFlash({ id: template.id, label })
      setScheduleTarget(null)
      window.setTimeout(() => setScheduledFlash(null), 2200)
      router.refresh()
    })
  }

  function duplicate(t: LibraryBrowserTemplate) {
    const formData = new FormData()
    formData.set('templateId', t.id)
    const action =
      t.type === WT.SWIM ? duplicateSwimTemplate : duplicateTemplate
    startDuplicate(async () => {
      await action(formData)
      router.refresh()
    })
  }

  function createFolder() {
    const name = newFolderName.trim()
    if (!name || folderPending) return
    const targetSport: WorkoutType =
      sport === 'all' ? (selected?.type ?? WT.RUN) : sport
    const formData = new FormData()
    formData.set('name', name)
    formData.set('sport', targetSport)
    startFolder(async () => {
      const folder = await createLibraryFolder(formData)
      setFolderFilter(folder.id)
      setNewFolderName('')
      setCreatingFolder(false)
      router.refresh()
    })
  }

  function deleteFolder(folderId: string) {
    const folder = folderById.get(folderId)
    if (!folder) return
    const count = templates.filter((t) => t.folderId === folderId).length
    const ok = window.confirm(
      count > 0
        ? `Delete “${folder.name}”? ${count} workout${count === 1 ? '' : 's'} will move to Unfiled.`
        : `Delete “${folder.name}”?`,
    )
    if (!ok) return
    const formData = new FormData()
    formData.set('folderId', folderId)
    startFolder(async () => {
      await deleteLibraryFolder(formData)
      if (folderFilter === folderId) setFolderFilter('all')
      router.refresh()
    })
  }

  function moveToFolder(templateId: string, folderId: string | null) {
    const formData = new FormData()
    formData.set('templateId', templateId)
    formData.set('folderId', folderId ?? '')
    startFolder(async () => {
      await moveTemplateToFolder(formData)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_[role=button]]:cursor-pointer [&_[role=tab]]:cursor-pointer">
      <PageHeader className="mb-1 items-end">
        <div className="min-w-0">
          <PageHeaderEyebrow>Coach · Library</PageHeaderEyebrow>
          <PageHeaderTitle className="mt-1">Library</PageHeaderTitle>
          <PageHeaderDescription>
            {sportConfig
              ? sportConfig.description
              : 'Templates by sport, organized in topic folders you create — athlete blocks, session types, campaigns.'}
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {createLabel(sport)}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <p className="text-[12px] text-[var(--tt-ink-faint)]">{createHint(sport)}</p>

      <div
        role="tablist"
        aria-label="Sport"
        className="flex flex-wrap gap-1 border-b border-[var(--tt-line)] pb-px"
      >
        <SportTab
          active={sport === 'all'}
          label="All"
          count={sportCounts.all ?? 0}
          onClick={() => setSportFilter('all')}
        />
        {LIBRARY_SPORTS.map((s) => (
          <SportTab
            key={s.slug}
            active={sport === s.type}
            label={s.label}
            count={sportCounts[s.type] ?? 0}
            onClick={() => setSportFilter(s.type)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates or folders…"
            className="h-9 w-full rounded-[8px] border border-[var(--tt-line)] bg-white pl-8 pr-3 text-[13px] text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-ink)]"
          />
        </label>

        <div className="flex rounded-[8px] border border-[var(--tt-line)] p-0.5">
          {(
            [
              ['all', 'All'],
              ['structured', 'Structured'],
              ['text', 'Text'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={cn(
                'rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition',
                kindFilter === id
                  ? 'bg-[var(--tt-ink)] text-white'
                  : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="h-9 appearance-none rounded-[8px] border border-[var(--tt-line)] bg-white py-1.5 pl-3 pr-8 text-[12px] font-medium text-[var(--tt-ink)] outline-none"
            aria-label="Sort"
          >
            <option value="folder">Sort · Folder</option>
            <option value="title">Sort · Title</option>
            <option value="updated">Sort · Updated</option>
            <option value="sport">Sort · Sport</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tt-ink-faint)]" />
        </div>

        <div
          role="group"
          aria-label="View mode"
          className="ml-auto flex rounded-[8px] border border-[var(--tt-line)] p-0.5"
        >
          {(
            [
              ['cards', LayoutGrid, 'Cards'],
              ['list', List, 'List'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={viewMode === id}
              onClick={() => setViewMode(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition',
                viewMode === id
                  ? 'bg-[var(--tt-ink)] text-white'
                  : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-[13.5rem]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
              Folders
            </p>
            <div className="flex items-center gap-2">
              {typeof folderFilter === 'string' &&
              folderFilter !== 'all' &&
              folderFilter !== 'unfiled' ? (
                <button
                  type="button"
                  disabled={folderPending}
                  onClick={() => deleteFolder(folderFilter)}
                  className="text-[11px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)] disabled:opacity-50"
                >
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCreatingFolder((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                title="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                New
              </button>
            </div>
          </div>

          {creatingFolder ? (
            <form
              className="mb-2 space-y-1.5 rounded-[8px] border border-[var(--tt-line)] bg-white p-2"
              onSubmit={(e) => {
                e.preventDefault()
                createFolder()
              }}
            >
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={
                  sport === 'all'
                    ? `Folder name (→ ${WORKOUT_TYPE_LABELS[selected?.type ?? WT.RUN]})`
                    : 'Folder name…'
                }
                disabled={folderPending}
                className="h-8 w-full rounded-[6px] border border-[var(--tt-line)] px-2 text-[12px] text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)] disabled:opacity-50"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={folderPending || !newFolderName.trim()}
                  className="flex-1 rounded-[5px] bg-[var(--tt-ink)] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {folderPending ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingFolder(false)
                    setNewFolderName('')
                  }}
                  className="rounded-[5px] px-2 py-1 text-[11px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]"
                >
                  Cancel
                </button>
              </div>
              {sport === 'all' ? (
                <p className="text-[10px] text-[var(--tt-ink-faint)]">
                  Created under{' '}
                  {WORKOUT_TYPE_LABELS[selected?.type ?? WT.RUN]}
                </p>
              ) : null}
            </form>
          ) : null}

          <nav aria-label="Topic folders" className="space-y-0.5">
            <FolderNavItem
              label="All"
              count={folderCounts.all ?? 0}
              active={folderFilter === 'all'}
              icon={FolderOpen}
              onClick={() => setFolderFilter('all')}
            />
            <FolderNavItem
              label="Unfiled"
              count={folderCounts.unfiled ?? 0}
              active={folderFilter === 'unfiled'}
              icon={Folder}
              muted
              onClick={() => setFolderFilter('unfiled')}
            />
            {foldersForSport.length > 0 ? (
              <div className="my-2 border-t border-[var(--tt-line)]" />
            ) : null}
            {foldersForSport.map((f) => (
              <FolderNavItem
                key={f.id}
                label={
                  sport === 'all'
                    ? `${WORKOUT_TYPE_LABELS[f.sport]} · ${f.name}`
                    : f.name
                }
                count={folderCounts[f.id] ?? 0}
                active={folderFilter === f.id}
                icon={folderFilter === f.id ? FolderOpen : Folder}
                onClick={() => setFolderFilter(f.id)}
              />
            ))}
            {foldersForSport.length === 0 && !creatingFolder ? (
              <p className="px-2 py-3 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
                No topic folders yet. Create one for Threshold, Long Runs,
                athlete blocks…
              </p>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            {activeFolderLabel} · {filtered.length} workout
            {filtered.length === 1 ? '' : 's'}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[var(--tt-line)] px-6 py-14 text-center">
              <p className="text-[14px] font-medium text-[var(--tt-ink)]">
                No templates here
              </p>
              <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
                {query
                  ? 'No templates match your search.'
                  : 'Move workouts into this folder from the preview, or create a new template.'}
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((t) => (
                <li key={t.id}>
                  <TemplateCard
                    template={t}
                    folderLabel={folderName(folderById, t.folderId)}
                    active={selected?.id === t.id}
                    scheduledLabel={
                      scheduledFlash?.id === t.id ? scheduledFlash.label : null
                    }
                    onSelect={() => setSelectedId(t.id)}
                    onSchedule={() => openSchedule(t)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-[8px] border border-[var(--tt-line)]">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                    <th className="px-3 py-2.5 font-semibold">Template</th>
                    <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                      Folder
                    </th>
                    <th className="hidden px-3 py-2.5 font-semibold md:table-cell">
                      Type
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Metrics</th>
                    <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">
                      Kind
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      <span className="sr-only">Schedule</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <TemplateListRow
                      key={t.id}
                      template={t}
                      folderLabel={folderName(folderById, t.folderId)}
                      active={selected?.id === t.id}
                      scheduledLabel={
                        scheduledFlash?.id === t.id
                          ? scheduledFlash.label
                          : null
                      }
                      onSelect={() => setSelectedId(t.id)}
                      onSchedule={() => openSchedule(t)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="hidden w-full shrink-0 border-t border-[var(--tt-line)] pt-5 lg:sticky lg:top-4 lg:block lg:w-[18.5rem] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {selected ? (
            <TemplatePreviewPane
              template={selected}
              folderLabel={folderName(folderById, selected.folderId)}
              folders={foldersForSelected}
              folderPending={folderPending}
              onMoveFolder={(folderId) => moveToFolder(selected.id, folderId)}
              scheduledLabel={
                scheduledFlash?.id === selected.id
                  ? scheduledFlash.label
                  : null
              }
              onSchedule={() => openSchedule(selected)}
              onDuplicate={() => duplicate(selected)}
              duplicatePending={duplicatePending}
            />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[var(--tt-line)] px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-[var(--tt-ink)]">
                Select a template
              </p>
              <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
                Preview, move between folders, schedule.
              </p>
            </div>
          )}
        </aside>
      </div>

      {scheduleTarget ? (
        <LibraryScheduleDayModal
          open
          today={today}
          pending={schedulePending}
          templateTitle={scheduleTarget.title}
          templateMeta={templateMetrics(scheduleTarget) || null}
          onClose={() => {
            if (!schedulePending) setScheduleTarget(null)
          }}
          onConfirm={confirmSchedule}
        />
      ) : null}

      <WorkoutEditorDialog
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next)
          if (!next) router.refresh()
        }}
        mode="template"
        sport={createSport(sport)}
        date={today}
      />
    </div>
  )
}

function SportTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative px-3 py-2 text-[13px] font-medium transition',
        active
          ? 'text-[var(--tt-ink)]'
          : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]',
      )}
    >
      {label}
      <span className="ml-1.5 tabular-nums text-[11px] text-[var(--tt-ink-faint)]">
        {count}
      </span>
      {active ? (
        <span
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--tt-red)]"
          aria-hidden
        />
      ) : null}
    </button>
  )
}

function FolderNavItem({
  label,
  count,
  active,
  icon: Icon,
  muted,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  icon: typeof Folder
  muted?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] transition',
        active
          ? 'bg-[var(--tt-ink)] text-white'
          : muted
            ? 'text-[var(--tt-ink-faint)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink-soft)]'
            : 'text-[var(--tt-ink-soft)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink)]',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span
        className={cn(
          'tabular-nums text-[10px]',
          active ? 'text-white/70' : 'text-[var(--tt-ink-faint)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function ScheduleCompactButton({
  scheduled,
  onSchedule,
}: {
  scheduled: boolean
  onSchedule: () => void
}) {
  return (
    <button
      type="button"
      title={scheduled ? 'Reschedule' : 'Schedule'}
      aria-label={scheduled ? 'Reschedule' : 'Schedule'}
      onClick={(e) => {
        e.stopPropagation()
        onSchedule()
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px] px-1.5 py-1 text-[11px] font-medium transition',
        scheduled
          ? 'text-[var(--tt-good)]'
          : 'text-[var(--tt-ink-faint)] hover:bg-black/[0.04] hover:text-[var(--tt-ink)]',
      )}
    >
      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="hidden sm:inline">{scheduled ? 'Done' : 'Schedule'}</span>
    </button>
  )
}

function TemplateListRow({
  template: t,
  folderLabel,
  active,
  scheduledLabel,
  onSelect,
  onSchedule,
}: {
  template: LibraryBrowserTemplate
  folderLabel: string
  active: boolean
  scheduledLabel: string | null
  onSelect: () => void
  onSchedule: () => void
}) {
  const metrics = templateMetrics(t)
  const structured = isStructuredTemplate(t)
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'cursor-pointer border-b border-[var(--tt-line)] last:border-0 transition',
        active
          ? 'bg-[var(--tt-sidebar,#f5f5f5)]'
          : 'hover:bg-[var(--tt-sidebar,#f5f5f5)]/60',
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 text-left">
          <span
            className="h-7 w-0.5 shrink-0 rounded-full"
            style={{ background: SPORT_RAIL[t.type] }}
            aria-hidden
          />
          <WorkoutSportIcon type={t.type} size="xs" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[var(--tt-ink)]">
              {t.title}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-[var(--tt-ink-soft)] sm:hidden">
              {folderLabel}
              {metrics ? ` · ${metrics}` : null}
            </span>
          </span>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 text-[12px] text-[var(--tt-ink-soft)] sm:table-cell">
        <span className="inline-flex max-w-[10rem] items-center gap-1 truncate">
          <Folder
            className="h-3 w-3 shrink-0 text-[var(--tt-ink-faint)]"
            strokeWidth={1.75}
          />
          {folderLabel}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-[12px] text-[var(--tt-ink-soft)] md:table-cell">
        {getSessionTypeLabel(t.sessionType as SessionType, t.type)}
      </td>
      <td className="px-3 py-2.5 text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
        {scheduledLabel ? (
          <span className="text-[var(--tt-good)]">→ {scheduledLabel}</span>
        ) : (
          metrics || '—'
        )}
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide',
            structured ? 'text-[var(--tt-red)]' : 'text-[var(--tt-ink-faint)]',
          )}
        >
          {structured ? 'Structured' : 'Text'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <ScheduleCompactButton
          scheduled={Boolean(scheduledLabel)}
          onSchedule={onSchedule}
        />
      </td>
    </tr>
  )
}

function TemplateCard({
  template: t,
  folderLabel,
  active,
  scheduledLabel,
  onSelect,
  onSchedule,
}: {
  template: LibraryBrowserTemplate
  folderLabel: string
  active: boolean
  scheduledLabel: string | null
  onSelect: () => void
  onSchedule: () => void
}) {
  const metrics = templateMetrics(t)
  const structured = isStructuredTemplate(t)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'flex h-full cursor-pointer flex-col rounded-[8px] border bg-white transition',
        active
          ? 'border-[var(--tt-ink)] shadow-[0_0_0_1px_var(--tt-ink)]'
          : 'border-[var(--tt-line)] hover:border-[var(--tt-line-strong)]',
      )}
    >
      <div className="flex w-full flex-1 flex-col px-3.5 pb-2 pt-3.5 text-left">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
            style={{ background: SPORT_RAIL[t.type] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <WorkoutSportIcon type={t.type} size="xs" />
                <p className="truncate text-[14px] font-semibold text-[var(--tt-ink)]">
                  {t.title}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                {getSessionTypeLabel(t.sessionType, t.type)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
              {t.description ?? metrics ?? WORKOUT_TYPE_LABELS[t.type]}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--tt-ink-faint)]">
                <Folder className="h-3 w-3" strokeWidth={1.75} />
                {folderLabel}
              </span>
              {metrics ? (
                <span className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
                  {metrics}
                </span>
              ) : null}
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  structured
                    ? 'text-[var(--tt-red)]'
                    : 'text-[var(--tt-ink-faint)]',
                )}
              >
                {structured ? 'Structured' : 'Text'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--tt-line)] px-3.5 py-2">
        <span className="text-[10px] text-[var(--tt-ink-faint)]">
          {scheduledLabel ? (
            <span className="text-[var(--tt-good)]">→ {scheduledLabel}</span>
          ) : (
            format(new Date(t.updatedAt), 'MMM d')
          )}
        </span>
        <ScheduleCompactButton
          scheduled={Boolean(scheduledLabel)}
          onSchedule={onSchedule}
        />
      </div>
    </div>
  )
}

function TemplatePreviewPane({
  template,
  folderLabel,
  folders,
  folderPending,
  onMoveFolder,
  scheduledLabel,
  onSchedule,
  onDuplicate,
  duplicatePending,
}: {
  template: LibraryBrowserTemplate
  folderLabel: string
  folders: LibraryBrowserFolder[]
  folderPending: boolean
  onMoveFolder: (folderId: string | null) => void
  scheduledLabel: string | null
  onSchedule: () => void
  onDuplicate: () => void
  duplicatePending: boolean
}) {
  const metrics = templateMetrics(template)
  const structured = isStructuredTemplate(template)
  const structure =
    template.structure &&
    typeof template.structure === 'object' &&
    hasStructureContent(template.structure as WorkoutStructure)
      ? (template.structure as WorkoutStructure)
      : null
  const deleteAction =
    template.type === WT.SWIM ? deleteSwimTemplate : deleteTemplate

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
          Preview
        </p>
        <div className="mt-2 flex items-start gap-2.5">
          <span
            className="mt-1 h-10 w-1 shrink-0 rounded-full"
            style={{ background: SPORT_RAIL[template.type] }}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <WorkoutSportIcon type={template.type} size="xs" />
              <h2 className="text-[17px] font-semibold leading-snug text-[var(--tt-ink)]">
                {template.title}
              </h2>
            </div>
            <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
              {getSessionTypeLabel(template.sessionType, template.type)}
              {metrics ? ` · ${metrics}` : null}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--tt-ink-faint)]">
              Updated {format(new Date(template.updatedAt), 'MMM d, yyyy')}
            </p>
            <div className="mt-2">
              <FolderMoveSelect
                folderLabel={folderLabel}
                folderId={template.folderId}
                folders={folders}
                disabled={folderPending}
                onMoveFolder={onMoveFolder}
              />
            </div>
          </div>
        </div>
      </div>

      {structure ? (
        <WorkoutStructureChart structure={structure} size="sm" showCaption />
      ) : null}

      {template.description ? (
        <div className="border-t border-[var(--tt-line)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            {structured ? 'Notes' : 'Description'}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--tt-ink)]">
            {template.description}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSchedule}
        className={cn(
          'inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border px-3 py-2 text-[13px] font-medium transition',
          scheduledLabel
            ? 'border-[var(--tt-good)]/30 text-[var(--tt-good)]'
            : 'border-[var(--tt-line)] text-[var(--tt-ink-soft)] hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink)]',
        )}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {scheduledLabel ? `Scheduled · ${scheduledLabel}` : 'Schedule…'}
      </button>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" size="xs" asChild>
          <Link href={editTemplateHref(template)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={duplicatePending}
          onClick={onDuplicate}
        >
          <Copy className="h-3.5 w-3.5" />
          {duplicatePending ? 'Duplicating…' : 'Duplicate'}
        </Button>
        <ItemActions
          deleteAction={deleteAction}
          deleteId={template.id}
          deleteIdField="templateId"
          deleteConfirmTitle="Delete template?"
          deleteConfirmMessage={`"${template.title}" will be removed from your library.`}
        />
      </div>
    </div>
  )
}

function FolderMoveSelect({
  folderLabel,
  folderId,
  folders,
  disabled,
  onMoveFolder,
}: {
  folderLabel: string
  folderId: string | null
  folders: LibraryBrowserFolder[]
  disabled?: boolean
  onMoveFolder: (folderId: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] px-2 py-0.5 text-[11px] font-medium text-[var(--tt-ink-faint)] transition hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink-soft)] disabled:opacity-50"
      >
        <Folder className="h-3 w-3 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{folderLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close folder menu"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-[8px] border border-[var(--tt-line)] bg-white py-1 shadow-[0_8px_24px_rgba(17,17,17,0.12)]"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!folderId}
                onClick={() => {
                  onMoveFolder(null)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                  !folderId
                    ? 'font-semibold text-[var(--tt-ink)]'
                    : 'text-[var(--tt-ink-soft)]',
                )}
              >
                Unfiled
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={folderId === f.id}
                  onClick={() => {
                    onMoveFolder(f.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                    folderId === f.id
                      ? 'font-semibold text-[var(--tt-ink)]'
                      : 'text-[var(--tt-ink-soft)]',
                  )}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
