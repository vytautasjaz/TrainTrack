'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SportIcon } from './mock-ui'
import {
  LIBRARY_FOLDERS,
  LIBRARY_TEMPLATES,
  TRAINING_MONTH_TODAY_KEY,
  workoutsForMonthDate,
  type LibraryFolder,
  type LibraryTemplate,
  type TrainingSport,
  type TrainingWorkout,
} from './training-mock-data'
import { sportRailColor } from './prescription-workout-card'

type SportFilter = 'all' | TrainingSport
/** all = every folder · unfiled = no folder · or a folder id */
type FolderFilter = 'all' | 'unfiled' | string
type SortId = 'title' | 'updated' | 'sport' | 'folder'
type ViewMode = 'cards' | 'list'

const SPORT_TABS: { id: SportFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' },
  { id: 'swim', label: 'Swim' },
  { id: 'strength', label: 'Strength' },
  { id: 'recovery', label: 'Recovery' },
]

const SPORT_LABEL: Record<TrainingSport, string> = {
  run: 'Run',
  bike: 'Bike',
  swim: 'Swim',
  strength: 'Strength',
  recovery: 'Recovery',
}

function createHint(sport: SportFilter) {
  if (sport === 'swim') return 'Folders by topic · swim builder for structured sets.'
  if (sport === 'strength' || sport === 'recovery')
    return 'Topic folders · text templates for session notes.'
  if (sport === 'run' || sport === 'bike')
    return 'Group by topic — Threshold, Long Runs, athlete blocks, etc.'
  return 'Browse by sport and folder · Schedule onto a plan day.'
}

function createLabel(sport: SportFilter) {
  if (sport === 'swim') return 'New swim set'
  if (sport === 'strength' || sport === 'recovery') return 'New text template'
  if (sport === 'run' || sport === 'bike') return 'New workout'
  return 'New template'
}

function folderName(
  folders: LibraryFolder[],
  folderId: string | null | undefined,
): string {
  if (!folderId) return 'Unfiled'
  return folders.find((f) => f.id === folderId)?.name ?? 'Unfiled'
}

/**
 * Coach Library — sport hubs + topic folders + cards/list + preview.
 */
export function LibraryMockContent() {
  const [sport, setSport] = useState<SportFilter>('run')
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('folder')
  const [kindFilter, setKindFilter] = useState<'all' | 'structured' | 'text'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedId, setSelectedId] = useState<string | null>('t11')
  const [scheduledFlash, setScheduledFlash] = useState<{
    id: string
    label: string
  } | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<LibraryTemplate | null>(null)

  const [folders, setFolders] = useState<LibraryFolder[]>(() => [...LIBRARY_FOLDERS])
  const [templates, setTemplates] = useState<LibraryTemplate[]>(() =>
    LIBRARY_TEMPLATES.map((t) => ({ ...t })),
  )
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const foldersForSport = useMemo(() => {
    const list =
      sport === 'all' ? folders : folders.filter((f) => f.sport === sport)
    return [...list].sort((a, b) => {
      if (sport === 'all' && a.sport !== b.sport) {
        return a.sport.localeCompare(b.sport)
      }
      return a.name.localeCompare(b.name)
    })
  }, [folders, sport])

  const sportTemplates = useMemo(
    () => templates.filter((t) => (sport === 'all' ? true : t.sport === sport)),
    [templates, sport],
  )

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sportTemplates.length, unfiled: 0 }
    for (const t of sportTemplates) {
      if (!t.folderId) counts.unfiled += 1
      else counts[t.folderId] = (counts[t.folderId] ?? 0) + 1
    }
    return counts
  }, [sportTemplates])

  const filtered = useMemo(() => {
    let list = sportTemplates
    if (folderFilter === 'unfiled') {
      list = list.filter((t) => !t.folderId)
    } else if (folderFilter !== 'all') {
      list = list.filter((t) => t.folderId === folderFilter)
    }
    if (kindFilter !== 'all') {
      list = list.filter((t) => (t.kind ?? 'text') === kindFilter)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((t) => {
        const fname = folderName(folders, t.folderId).toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.meta.toLowerCase().includes(q) ||
          fname.includes(q) ||
          (t.sessionType?.toLowerCase().includes(q) ?? false) ||
          (t.description?.toLowerCase().includes(q) ?? false)
        )
      })
    }
    list = [...list].sort((a, b) => {
      if (sort === 'sport') return a.sport.localeCompare(b.sport) || a.title.localeCompare(b.title)
      if (sort === 'updated') return (b.updated ?? '').localeCompare(a.updated ?? '')
      if (sort === 'folder') {
        const fa = folderName(folders, a.folderId)
        const fb = folderName(folders, b.folderId)
        return fa.localeCompare(fb) || a.title.localeCompare(b.title)
      }
      return a.title.localeCompare(b.title)
    })
    return list
  }, [sportTemplates, folderFilter, kindFilter, query, sort, folders])

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    templates.find((t) => t.id === selectedId) ??
    null

  const foldersForSelected = useMemo(() => {
    if (!selected) return []
    return folders
      .filter((f) => f.sport === selected.sport)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, selected])

  function openSchedule(t: LibraryTemplate) {
    setSelectedId(t.id)
    setScheduleTarget(t)
  }

  function confirmSchedule(dateKey: string) {
    if (!scheduleTarget) return
    const label = formatScheduleLabel(dateKey)
    setScheduledFlash({ id: scheduleTarget.id, label })
    setScheduleTarget(null)
    window.setTimeout(() => setScheduledFlash(null), 2200)
  }

  function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const targetSport: TrainingSport =
      sport === 'all' ? (selected?.sport ?? 'run') : sport
    const id = `f-${targetSport}-${Date.now().toString(36)}`
    setFolders((prev) => [...prev, { id, sport: targetSport, name }])
    setFolderFilter(id)
    setNewFolderName('')
    setCreatingFolder(false)
  }

  function deleteFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    const count = templates.filter((t) => t.folderId === folderId).length
    const ok = window.confirm(
      count > 0
        ? `Delete “${folder.name}”? ${count} workout${count === 1 ? '' : 's'} will move to Unfiled.`
        : `Delete “${folder.name}”?`,
    )
    if (!ok) return
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setTemplates((prev) =>
      prev.map((t) => (t.folderId === folderId ? { ...t, folderId: null } : t)),
    )
    if (folderFilter === folderId) setFolderFilter('all')
  }

  function moveToFolder(templateId: string, folderId: string | null) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, folderId } : t)),
    )
  }

  const activeFolderLabel =
    folderFilter === 'all'
      ? 'All folders'
      : folderFilter === 'unfiled'
        ? 'Unfiled'
        : folders.find((f) => f.id === folderFilter)?.name ?? 'Folder'

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div className="space-y-2">
          <h1 className="tt-mock-h1 !text-5xl">Library.</h1>
          <p className="max-w-lg text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
            Templates by sport, organized in topic folders you create — athlete blocks, session
            types, campaigns.
          </p>
        </div>
        <button
          type="button"
          className="tt-mock-btn tt-mock-btn-primary inline-flex items-center gap-1.5 !normal-case !tracking-normal"
        >
          <Plus className="h-3.5 w-3.5" />
          {createLabel(sport)}
        </button>
      </header>

      <p className="text-[12px] text-[var(--tt-ink-faint)]">{createHint(sport)}</p>

      {/* Sport hubs */}
      <div
        role="tablist"
        aria-label="Sport"
        className="flex flex-wrap gap-1 border-b border-[var(--tt-line)] pb-px"
      >
        {SPORT_TABS.map((tab) => {
          const active = sport === tab.id
          const count =
            tab.id === 'all'
              ? templates.length
              : templates.filter((t) => t.sport === tab.id).length
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSport(tab.id)
                setFolderFilter('all')
                setSelectedId(null)
                setCreatingFolder(false)
              }}
              className={cn(
                'relative px-3 py-2 text-[13px] font-medium transition',
                active
                  ? 'text-[var(--tt-ink)]'
                  : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]',
              )}
            >
              {tab.label}
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
        })}
      </div>

      {/* Filters */}
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
        {/* Folders rail */}
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
                  onClick={() => deleteFolder(folderFilter)}
                  className="text-[11px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]"
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
                  sport === 'all' ? 'Folder name (→ Run)' : 'Folder name…'
                }
                className="h-8 w-full rounded-[6px] border border-[var(--tt-line)] px-2 text-[12px] text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="flex-1 rounded-[5px] bg-[var(--tt-ink)] px-2 py-1 text-[11px] font-semibold text-white"
                >
                  Create
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
                  Created under {SPORT_LABEL[selected?.sport ?? 'run']}
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
                label={sport === 'all' ? `${SPORT_LABEL[f.sport]} · ${f.name}` : f.name}
                count={folderCounts[f.id] ?? 0}
                active={folderFilter === f.id}
                icon={folderFilter === f.id ? FolderOpen : Folder}
                onClick={() => setFolderFilter(f.id)}
              />
            ))}
            {foldersForSport.length === 0 && !creatingFolder ? (
              <p className="px-2 py-3 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
                No topic folders yet. Create one for Threshold, Long Runs, athlete blocks…
              </p>
            ) : null}
          </nav>
        </aside>

        {/* Templates */}
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            {activeFolderLabel} · {filtered.length} workout{filtered.length === 1 ? '' : 's'}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[var(--tt-line)] px-6 py-14 text-center">
              <p className="text-[14px] font-medium text-[var(--tt-ink)]">No templates here</p>
              <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
                Move workouts into this folder from the preview, or create a new template.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((t) => (
                <li key={t.id}>
                  <TemplateCard
                    template={t}
                    folderLabel={folderName(folders, t.folderId)}
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
                    <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Folder</th>
                    <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Metrics</th>
                    <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Kind</th>
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
                      folderLabel={folderName(folders, t.folderId)}
                      active={selected?.id === t.id}
                      scheduledLabel={
                        scheduledFlash?.id === t.id ? scheduledFlash.label : null
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

        {/* Preview pane */}
        <aside className="w-full shrink-0 border-t border-[var(--tt-line)] pt-5 lg:sticky lg:top-4 lg:w-[18.5rem] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {selected ? (
            <TemplatePreview
              template={selected}
              folderLabel={folderName(folders, selected.folderId)}
              folders={foldersForSelected}
              onMoveFolder={(folderId) => moveToFolder(selected.id, folderId)}
              onSchedule={() => openSchedule(selected)}
              scheduledLabel={
                scheduledFlash?.id === selected.id ? scheduledFlash.label : null
              }
            />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[var(--tt-line)] px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-[var(--tt-ink)]">Select a template</p>
              <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
                Preview, move between folders, schedule.
              </p>
            </div>
          )}
        </aside>
      </div>

      {scheduleTarget ? (
        <ScheduleDayModal
          template={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onConfirm={confirmSchedule}
        />
      ) : null}
    </div>
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

function TemplateCard({
  template: t,
  folderLabel,
  active,
  scheduledLabel,
  onSelect,
  onSchedule,
}: {
  template: LibraryTemplate
  folderLabel: string
  active: boolean
  scheduledLabel: string | null
  onSelect: () => void
  onSchedule: () => void
}) {
  const rail = sportRailColor(t.sport)
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-[8px] border bg-white transition',
        active
          ? 'border-[var(--tt-ink)] shadow-[0_0_0_1px_var(--tt-ink)]'
          : 'border-[var(--tt-line)] hover:border-[var(--tt-line-strong)]',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-1 flex-col px-3.5 pb-2 pt-3.5 text-left"
      >
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
            style={{ background: rail }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <SportIcon sport={t.sport} className="h-3.5 w-3.5 shrink-0" />
                <p className="truncate text-[14px] font-semibold text-[var(--tt-ink)]">{t.title}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                {t.sessionType ?? t.sport}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
              {t.description ?? t.meta}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--tt-ink-faint)]">
                <Folder className="h-3 w-3" strokeWidth={1.75} />
                {folderLabel}
              </span>
              <span className="text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">{t.meta}</span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  t.kind === 'structured' ? 'text-[var(--tt-red)]' : 'text-[var(--tt-ink-faint)]',
                )}
              >
                {t.kind === 'structured' ? 'Structured' : 'Text'}
              </span>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--tt-line)] px-3.5 py-2">
        <span className="text-[10px] text-[var(--tt-ink-faint)]">
          {scheduledLabel ? (
            <span className="text-[var(--tt-good)]">→ {scheduledLabel}</span>
          ) : (
            t.updated?.replace(' 2026', '')
          )}
        </span>
        <ScheduleCompactButton scheduled={Boolean(scheduledLabel)} onSchedule={onSchedule} />
      </div>
    </div>
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
  template: LibraryTemplate
  folderLabel: string
  active: boolean
  scheduledLabel: string | null
  onSelect: () => void
  onSchedule: () => void
}) {
  const rail = sportRailColor(t.sport)
  return (
    <tr
      className={cn(
        'border-b border-[var(--tt-line)] last:border-0 transition',
        active ? 'bg-[var(--tt-sidebar,#f5f5f5)]' : 'hover:bg-[var(--tt-sidebar,#f5f5f5)]/60',
      )}
    >
      <td className="px-3 py-2.5">
        <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-2.5 text-left">
          <span className="h-7 w-0.5 shrink-0 rounded-full" style={{ background: rail }} aria-hidden />
          <SportIcon sport={t.sport} className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[var(--tt-ink)]">
              {t.title}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-[var(--tt-ink-soft)] sm:hidden">
              {folderLabel} · {t.meta}
            </span>
          </span>
        </button>
      </td>
      <td className="hidden px-3 py-2.5 text-[12px] text-[var(--tt-ink-soft)] sm:table-cell">
        <span className="inline-flex max-w-[10rem] items-center gap-1 truncate">
          <Folder className="h-3 w-3 shrink-0 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
          {folderLabel}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-[12px] text-[var(--tt-ink-soft)] md:table-cell">
        {t.sessionType ?? '—'}
      </td>
      <td className="px-3 py-2.5 text-[12px] font-medium tabular-nums text-[var(--tt-ink)]">
        {scheduledLabel ? (
          <span className="text-[var(--tt-good)]">→ {scheduledLabel}</span>
        ) : (
          t.meta
        )}
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide',
            t.kind === 'structured' ? 'text-[var(--tt-red)]' : 'text-[var(--tt-ink-faint)]',
          )}
        >
          {t.kind === 'structured' ? 'Structured' : 'Text'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <ScheduleCompactButton scheduled={Boolean(scheduledLabel)} onSchedule={onSchedule} />
      </td>
    </tr>
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
      onClick={onSchedule}
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

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function toDateKey(y: number, m0: number, d: number) {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return { y: y!, m0: m! - 1, d: d! }
}

function formatScheduleLabel(dateKey: string) {
  const { y, m0, d } = parseDateKey(dateKey)
  const dow = new Date(Date.UTC(y, m0, d)).getUTCDay()
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${names[dow]} ${d} ${MONTH_NAMES[m0]!.slice(0, 3)}`
}

function daysInMonth(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
}

/** Monday-first blank count for month start */
function leadingBlanksMon(y: number, m0: number) {
  const dow = new Date(Date.UTC(y, m0, 1)).getUTCDay() // Sun=0
  return (dow + 6) % 7
}

function ScheduleDayModal({
  template,
  onClose,
  onConfirm,
}: {
  template: LibraryTemplate
  onClose: () => void
  onConfirm: (dateKey: string) => void
}) {
  const titleId = useId()
  const today = TRAINING_MONTH_TODAY_KEY
  const initial = parseDateKey(today)
  const [cursor, setCursor] = useState({ y: initial.y, m0: initial.m0 })
  const [selected, setSelected] = useState(today)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const blanks = leadingBlanksMon(cursor.y, cursor.m0)
  const dim = daysInMonth(cursor.y, cursor.m0)
  const cells: Array<{ key: string; day: number } | null> = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: dim }, (_, i) => {
      const day = i + 1
      return { key: toDateKey(cursor.y, cursor.m0, day), day }
    }),
  ]

  const dayWorkouts = workoutsForMonthDate(selected)

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m0 + delta, 1))
      return { y: d.getUTCFullYear(), m0: d.getUTCMonth() }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92vh,40rem)] w-full max-w-[24rem] flex-col overflow-hidden rounded-t-[8px] border border-[var(--tt-line)] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.18)] sm:rounded-[8px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tt-line)] px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="text-[14px] font-semibold text-[var(--tt-ink)]">
              Schedule workout
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-soft)]">
              {template.title} · {template.meta}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--tt-ink-faint)] hover:bg-black/[0.04] hover:text-[var(--tt-ink)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[13px] font-semibold text-[var(--tt-ink)]">
              {MONTH_NAMES[cursor.m0]} {cursor.y}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink)]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) {
                return <span key={`b-${i}`} className="h-11" />
              }
              const isSelected = cell.key === selected
              const isToday = cell.key === today
              const existing = workoutsForMonthDate(cell.key)
              const dots = existing.slice(0, 3)
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    'relative flex h-11 flex-col items-center justify-center rounded-[6px] text-[13px] tabular-nums transition',
                    isSelected
                      ? 'bg-[var(--tt-ink)] font-semibold text-white'
                      : 'text-[var(--tt-ink)] hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                  )}
                  aria-label={
                    existing.length
                      ? `${formatScheduleLabel(cell.key)}, ${existing.length} scheduled`
                      : formatScheduleLabel(cell.key)
                  }
                >
                  <span className="leading-none">{cell.day}</span>
                  {dots.length > 0 ? (
                    <span className="mt-1 flex items-center gap-0.5">
                      {dots.map((w) => (
                        <span
                          key={w.id}
                          className="h-1 w-1 rounded-full"
                          style={{
                            background: isSelected ? 'rgba(255,255,255,0.85)' : sportRailColor(w.sport),
                          }}
                        />
                      ))}
                      {existing.length > 3 ? (
                        <span
                          className={cn(
                            'text-[8px] leading-none',
                            isSelected ? 'text-white/80' : 'text-[var(--tt-ink-faint)]',
                          )}
                        >
                          +
                        </span>
                      ) : null}
                    </span>
                  ) : isToday && !isSelected ? (
                    <span className="mt-1 h-1 w-1 rounded-full bg-[var(--tt-red)]" />
                  ) : (
                    <span className="mt-1 h-1 w-1" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelected(today)
                const { y, m0 } = parseDateKey(today)
                setCursor({ y, m0 })
              }}
              className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const { y, m0, d } = parseDateKey(today)
                const next = new Date(Date.UTC(y, m0, d + 1))
                const key = toDateKey(
                  next.getUTCFullYear(),
                  next.getUTCMonth(),
                  next.getUTCDate(),
                )
                setSelected(key)
                setCursor({ y: next.getUTCFullYear(), m0: next.getUTCMonth() })
              }}
              className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
            >
              Tomorrow
            </button>
          </div>

          <div className="mt-4 border-t border-[var(--tt-line)] pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
              Already on {formatScheduleLabel(selected)}
            </p>
            {dayWorkouts.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-[var(--tt-line)] px-3 py-3 text-[12px] text-[var(--tt-ink-faint)]">
                Free day — nothing scheduled yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {dayWorkouts.map((w) => (
                  <ScheduledDayRow key={w.id} workout={w} />
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
              New · <span className="font-medium text-[var(--tt-ink-soft)]">{template.title}</span> will
              be added to this day.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--tt-line)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--tt-ink)] px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule · {formatScheduleLabel(selected)}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduledDayRow({ workout: w }: { workout: TrainingWorkout }) {
  const rail = sportRailColor(w.sport)
  const done = w.status === 'done'
  const skipped = w.status === 'skipped'
  return (
    <li className="flex items-center gap-2 rounded-[6px] border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)]/50 px-2.5 py-2">
      <span className="h-7 w-0.5 shrink-0 rounded-full" style={{ background: rail }} aria-hidden />
      <SportIcon
        sport={w.sport}
        className="h-3.5 w-3.5 shrink-0"
        color={done ? 'var(--tt-good)' : skipped ? 'var(--tt-ink-faint)' : undefined}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[12px] font-semibold',
            skipped ? 'text-[var(--tt-ink-faint)] line-through' : 'text-[var(--tt-ink)]',
          )}
        >
          {w.title}
        </p>
        <p className="truncate text-[11px] text-[var(--tt-ink-soft)]">
          {w.prescription ?? w.meta}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
          done
            ? 'text-[var(--tt-good)]'
            : skipped
              ? 'text-[var(--tt-ink-faint)]'
              : 'text-[var(--tt-ink-faint)]',
        )}
      >
        {done ? 'Done' : skipped ? 'Skip' : 'Plan'}
      </span>
    </li>
  )
}

function TemplatePreview({
  template,
  folderLabel,
  folders,
  onMoveFolder,
  onSchedule,
  scheduledLabel,
}: {
  template: LibraryTemplate
  folderLabel: string
  folders: LibraryFolder[]
  onMoveFolder: (folderId: string | null) => void
  onSchedule: () => void
  scheduledLabel: string | null
}) {
  const rail = sportRailColor(template.sport)
  const blocks =
    template.kind === 'structured'
      ? structureLines(template)
      : [{ label: 'Description', body: template.description ?? template.meta }]

  return (
    <div className="space-y-4">
      <div>
        <p className="tt-mock-overline">Preview</p>
        <div className="mt-2 flex items-start gap-2.5">
          <span
            className="mt-1 h-10 w-1 shrink-0 rounded-full"
            style={{ background: rail }}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <SportIcon sport={template.sport} className="h-4 w-4" />
              <h2 className="text-[17px] font-semibold leading-snug text-[var(--tt-ink)]">
                {template.title}
              </h2>
            </div>
            <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
              {template.sessionType} · {template.meta}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--tt-ink-faint)]">
              Updated {template.updated}
            </p>
            <div className="mt-2">
              <FolderPill
                folderLabel={folderLabel}
                folderId={template.folderId ?? null}
                folders={folders}
                onMoveFolder={onMoveFolder}
              />
            </div>
          </div>
        </div>
      </div>

      {template.kind === 'structured' ? (
        <StructurePreviewChart
          sport={template.sport}
          segments={structureGraph(template)}
        />
      ) : null}

      <div className="space-y-2 border-t border-[var(--tt-line)] pt-3">
        {blocks.map((b) => (
          <div key={b.label} className="border-b border-[var(--tt-line)] py-2 last:border-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
              {b.label}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-[var(--tt-ink)]">{b.body}</p>
          </div>
        ))}
      </div>

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
        <PreviewAction icon={Pencil} label="Edit" />
        <PreviewAction icon={Copy} label="Duplicate" />
        <PreviewAction icon={Trash2} label="Delete" muted />
      </div>
    </div>
  )
}

function FolderPill({
  folderLabel,
  folderId,
  folders,
  onMoveFolder,
}: {
  folderLabel: string
  folderId: string | null
  folders: LibraryFolder[]
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] px-2 py-0.5 text-[11px] font-medium text-[var(--tt-ink-faint)] transition hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink-soft)]"
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

function PreviewAction({
  icon: Icon,
  label,
  muted,
}: {
  icon: typeof Pencil
  label: string
  muted?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1 rounded-[6px] border border-[var(--tt-line)] px-2 py-1.5 text-[11px] font-semibold transition hover:border-[var(--tt-line-strong)]',
        muted ? 'text-[var(--tt-ink-faint)]' : 'text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
      {label}
    </button>
  )
}

type StructureSegKind = 'warmup' | 'work' | 'recovery' | 'cooldown'

type StructureSeg = {
  weight: number
  intensity: number
  kind: StructureSegKind
}

function StructurePreviewChart({
  sport,
  segments,
}: {
  sport: TrainingSport
  segments: StructureSeg[]
}) {
  const accent = sportRailColor(sport)

  function fill(kind: StructureSegKind) {
    if (kind === 'work') return accent
    if (kind === 'recovery') return `color-mix(in srgb, ${accent} 32%, white)`
    if (kind === 'warmup') return 'var(--tt-ink-faint)'
    return 'color-mix(in srgb, var(--tt-ink-faint) 55%, white)'
  }

  return (
    <div className="border-t border-[var(--tt-line)] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
          Structure
        </p>
        <div className="flex items-center gap-2 text-[10px] text-[var(--tt-ink-faint)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-sm" style={{ background: accent }} />
            Work
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-sm"
              style={{ background: `color-mix(in srgb, ${accent} 32%, white)` }}
            />
            Rec
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-sm bg-[var(--tt-ink-faint)]" />
            WU/CD
          </span>
        </div>
      </div>
      <div
        className="relative h-14 w-full border-b border-[var(--tt-line)]"
        role="img"
        aria-label="Workout intensity profile"
      >
        <div className="absolute inset-0 flex min-w-0 items-end gap-px overflow-hidden">
          {segments.map((seg, i) => (
            <div
              key={`${seg.kind}-${i}`}
              className="min-w-[2px] shrink-0 rounded-t-[2px]"
              title={`${seg.kind} · ${Math.round(seg.intensity * 100)}%`}
              style={{
                flexGrow: seg.weight,
                flexBasis: 0,
                height: `${Math.max(14, Math.round(seg.intensity * 100))}%`,
                background: fill(seg.kind),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Intensity silhouette — mirrors production WorkoutStructureChart. */
function structureGraph(t: LibraryTemplate): StructureSeg[] {
  const wu = (w = 1.2): StructureSeg => ({ weight: w, intensity: 0.32, kind: 'warmup' })
  const cd = (w = 1): StructureSeg => ({ weight: w, intensity: 0.28, kind: 'cooldown' })
  const work = (intensity: number, w = 1): StructureSeg => ({
    weight: w,
    intensity,
    kind: 'work',
  })
  const rec = (w = 0.45): StructureSeg => ({ weight: w, intensity: 0.22, kind: 'recovery' })

  const intervals = (n: number, intensity: number, workW = 1.1, recW = 0.45) => {
    const segs: StructureSeg[] = [wu()]
    for (let i = 0; i < n; i++) {
      segs.push(work(intensity, workW))
      if (i < n - 1) segs.push(rec(recW))
    }
    segs.push(cd())
    return segs
  }

  switch (t.id) {
    case 't2':
      return intervals(5, 0.92, 0.9, 0.55) // VO2 5×3′
    case 't11':
      return intervals(4, 0.78, 1.6, 0.5) // 4×2k LT
    case 't12':
      return intervals(3, 0.88, 1.2, 0.7) // 3×1k race
    case 't14':
      return intervals(6, 0.72, 1, 0.35) // cruise 6×1k
    case 't1':
      return [wu(1), work(0.7, 6), cd(1)] // tempo continuous
    case 't3':
      return [wu(1), work(0.42, 8), cd(1)] // long easy
    case 't13':
      return [
        wu(1),
        work(0.38, 5),
        work(0.48, 2),
        work(0.58, 1.5),
        cd(0.8),
      ] // progressive long
    case 't5':
      return intervals(3, 0.74, 1.4, 0.55) // SS 3×12
    case 't16':
      return intervals(2, 0.74, 2.2, 0.7) // SS 2×20
    case 't4':
      return [wu(1), work(0.4, 7), cd(1)] // endurance
    case 't6':
      return intervals(8, 0.76, 0.65, 0.22) // CSS 8×100
    case 't7':
      return [wu(1), work(0.35, 2), work(0.48, 1.5), work(0.35, 2), work(0.42, 1.5), cd(1)]
    default:
      return [wu(), work(0.55, 4), cd()]
  }
}

function structureLines(t: LibraryTemplate): { label: string; body: string }[] {
  if (t.id === 't2' || t.id === 't12') {
    return [
      { label: 'Warm-up', body: '2 km · easy' },
      { label: 'Intervals', body: t.id === 't12' ? '3 × 1 km race pace · 3′' : '5 × 3′ @ VO2 · 2′ jog' },
      { label: 'Cool-down', body: '1.5 km · easy' },
    ]
  }
  if (t.id === 't11' || t.id === 't14') {
    return [
      { label: 'Warm-up', body: '2 km · easy' },
      {
        label: 'Main',
        body: t.id === 't11' ? '4 × 2 km @ LT · 90″ jog' : '6 × 1 km @ cruise · 1′',
      },
      { label: 'Cool-down', body: '1.5 km · easy' },
    ]
  }
  if (t.id === 't5' || t.id === 't16') {
    return [
      { label: 'Warm-up', body: '15′ easy spinning' },
      { label: 'Main', body: t.id === 't16' ? '2 × 20′ sweet spot' : '3 × 12′ sweet spot · 5′ easy' },
      { label: 'Cool-down', body: '10′ easy' },
    ]
  }
  if (t.id === 't6') {
    return [
      { label: 'Warm-up', body: '400 m mix' },
      { label: 'Main', body: '8 × 100 CSS on 15″ rest' },
      { label: 'Pull', body: '200 m pull buoy' },
      { label: 'Cool-down', body: '200 m easy' },
    ]
  }
  const parts = (t.description ?? t.meta).split('·').map((s) => s.trim())
  if (parts.length >= 3) {
    return [
      { label: 'Warm-up', body: parts[0]! },
      { label: 'Main', body: parts[1]! },
      { label: 'Cool-down', body: parts.slice(2).join(' · ') },
    ]
  }
  return [{ label: 'Session', body: t.description ?? t.meta }]
}
