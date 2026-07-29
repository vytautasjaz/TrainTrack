'use client'

import { useId, useState, type DragEvent } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { SuggestableInput } from '@/components/swim-workout/suggestable-input'
import type { SwimSection, SwimSet } from '@/lib/swim-workout/types'
import {
  isCompleteSwimSet,
  sectionDistanceMeters,
} from '@/lib/swim-workout/calculations'
import { createEmptySet, createSection, newSwimId, normalizeSectionOrders } from '@/lib/swim-workout/defaults'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import {
  SWIM_RECOVERY_SUGGESTIONS,
  SWIM_SECTION_OPTIONS,
  SWIM_STROKE_SUGGESTIONS,
  SWIM_TARGET_SUGGESTIONS,
  swimSectionAccent,
  swimTargetBadgeClass,
} from '@/lib/swim-workout/ui'
import { cn } from '@/lib/utils'

function isMeaningfulSet(set: SwimSet): boolean {
  return (
    isCompleteSwimSet(set) ||
    set.repeatCount > 0 ||
    set.distanceM > 0 ||
    set.stroke.trim().length > 0 ||
    Boolean(set.targetPace?.trim()) ||
    Boolean(set.rest?.trim()) ||
    Boolean(set.notes?.trim())
  )
}

function countSets(section: SwimSection): number {
  return section.sets.filter(isMeaningfulSet).length
}

function SwimSetRow({
  set,
  onChange,
  onDelete,
  canDelete,
  dragHandleProps,
}: {
  set: SwimSet
  onChange: (set: SwimSet) => void
  onDelete: () => void
  canDelete: boolean
  dragHandleProps?: {
    draggable: boolean
    onDragStart: (e: DragEvent) => void
    onDragEnd: () => void
  }
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(set.notes?.trim()))
  const hasNotes = Boolean(set.notes?.trim())

  return (
    <div className="border-t border-border/40 first:border-t-0">
      <div className="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3">
        <span
          {...dragHandleProps}
          className="hidden shrink-0 cursor-grab touch-none text-muted-foreground/40 active:cursor-grabbing sm:inline-flex"
          aria-label="Drag to reorder set"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="flex shrink-0 items-baseline gap-1 tabular-nums">
          <input
            type="number"
            min={0}
            value={set.repeatCount || ''}
            onChange={(e) =>
              onChange({ ...set, repeatCount: parseInt(e.target.value, 10) || 0 })
            }
            placeholder="3"
            aria-label="Repeat"
            className="w-8 bg-transparent text-center text-[13px] font-semibold text-[#111827] outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
          />
          <span className="text-[12px] text-muted-foreground">×</span>
          <input
            type="number"
            min={0}
            step={25}
            value={set.distanceM || ''}
            onChange={(e) =>
              onChange({ ...set, distanceM: parseInt(e.target.value, 10) || 0 })
            }
            placeholder="200"
            aria-label="Distance"
            className="w-12 bg-transparent text-center text-[13px] font-semibold text-[#111827] outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
          />
          <span className="text-[12px] text-muted-foreground">m</span>
        </div>

        <div className="hidden h-4 w-px shrink-0 bg-border/60 sm:block" aria-hidden />

        <SuggestableInput
          value={set.stroke}
          onChange={(stroke) => onChange({ ...set, stroke })}
          suggestions={SWIM_STROKE_SUGGESTIONS}
          placeholder="Stroke"
          aria-label="Stroke"
          className="min-w-[4.5rem] flex-1 sm:min-w-[6rem]"
        />

        <SuggestableInput
          value={set.targetPace ?? ''}
          onChange={(targetPace) =>
            onChange({ ...set, targetPace: targetPace || undefined })
          }
          suggestions={SWIM_TARGET_SUGGESTIONS}
          placeholder="Target"
          aria-label="Target"
          className="hidden min-w-[4.5rem] flex-1 sm:block sm:min-w-[5.5rem]"
        />

        <SuggestableInput
          value={set.rest ?? ''}
          onChange={(rest) => onChange({ ...set, rest: rest || undefined })}
          suggestions={SWIM_RECOVERY_SUGGESTIONS}
          placeholder="Recovery"
          aria-label="Recovery / Interval"
          className="hidden min-w-[4.5rem] flex-1 md:block md:min-w-[5.5rem]"
        />

        {hasNotes && !notesOpen ? (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-sky-600 transition hover:bg-sky-50"
            aria-label="Show set notes"
            title={set.notes}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40 hover:text-muted-foreground"
              aria-label="Set options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-[220] min-w-[10rem] rounded-[6px] border border-border bg-card p-1 shadow-md"
            >
              <DropdownMenu.Item
                className="cursor-pointer rounded-[4px] px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted/60"
                onSelect={() => setNotesOpen((v) => !v)}
              >
                {notesOpen || hasNotes ? 'Hide notes' : 'Add notes'}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={!canDelete}
                className="cursor-pointer rounded-[4px] px-2 py-1.5 text-sm text-red-600 outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-red-50"
                onSelect={onDelete}
              >
                Delete set
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Mobile secondary fields */}
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 sm:hidden">
        <SuggestableInput
          value={set.targetPace ?? ''}
          onChange={(targetPace) =>
            onChange({ ...set, targetPace: targetPace || undefined })
          }
          suggestions={SWIM_TARGET_SUGGESTIONS}
          placeholder="Target"
          aria-label="Target"
          className="rounded-[4px] border border-border/50 bg-white/60"
        />
        <SuggestableInput
          value={set.rest ?? ''}
          onChange={(rest) => onChange({ ...set, rest: rest || undefined })}
          suggestions={SWIM_RECOVERY_SUGGESTIONS}
          placeholder="Recovery"
          aria-label="Recovery / Interval"
          className="rounded-[4px] border border-border/50 bg-white/60"
        />
      </div>

      {notesOpen ? (
        <div className="px-2 pb-2 sm:px-3">
          <input
            value={set.notes ?? ''}
            onChange={(e) => onChange({ ...set, notes: e.target.value || undefined })}
            placeholder="Set notes (optional)"
            aria-label="Set notes"
            className="w-full rounded-[4px] border border-border/50 bg-white/70 px-2 py-1.5 text-[12px] text-[#111827] outline-none placeholder:text-muted-foreground/45 focus:border-sky-400/50"
          />
        </div>
      ) : null}
    </div>
  )
}

function SwimSectionCard({
  section,
  expanded,
  onToggleExpand,
  onChange,
  onDelete,
  onDuplicate,
  canDelete,
  dragIndex,
  index,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  section: SwimSection
  expanded: boolean
  onToggleExpand: () => void
  onChange: (section: SwimSection) => void
  onDelete: () => void
  onDuplicate: () => void
  canDelete: boolean
  dragIndex: number | null
  index: number
  onDragStart: (index: number) => void
  onDragEnd: () => void
  onDrop: (index: number) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [setDragIndex, setSetDragIndex] = useState<number | null>(null)
  const accent = swimSectionAccent(section.title)
  const distance = sectionDistanceMeters(section)
  const setCount = countSets(section)
  const titleListId = useId()

  function updateSet(setIndex: number, next: SwimSet) {
    const sets = section.sets.map((s, i) => (i === setIndex ? next : s))
    onChange({ ...section, sets })
  }

  function deleteSet(setIndex: number) {
    const sets = section.sets.filter((_, i) => i !== setIndex)
    onChange({
      ...section,
      sets: sets.length > 0 ? sets : [createEmptySet(0)],
    })
  }

  function addSet() {
    onChange({
      ...section,
      sets: [...section.sets, createEmptySet(section.sets.length)],
    })
  }

  function handleSetDrop(targetIndex: number) {
    if (setDragIndex === null || setDragIndex === targetIndex) return
    const next = [...section.sets]
    const [item] = next.splice(setDragIndex, 1)
    next.splice(targetIndex, 0, item)
    onChange({ ...section, sets: next.map((s, i) => ({ ...s, order: i })) })
    setSetDragIndex(null)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(index)}
      className={cn(
        'group/section overflow-hidden rounded-[6px] border bg-card transition-colors',
        expanded ? 'border-border/80 shadow-sm' : 'border-border/60',
        dragIndex === index && 'opacity-50',
        accent.surface,
      )}
    >
      <div className="flex items-stretch">
        <div className="flex w-10 shrink-0 border-r border-border/40 sm:w-11">
          <div className={cn('w-1.5 shrink-0 sm:w-2', accent.bar)} aria-hidden />
          <span
            draggable
            onDragStart={(e) => {
              e.stopPropagation()
              onDragStart(index)
            }}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 cursor-grab touch-none items-center justify-center text-muted-foreground/45 active:cursor-grabbing"
            aria-label="Drag to reorder section"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="min-w-0 flex-1 px-3 py-2.5 text-left sm:py-3"
        >
          {editingTitle ? (
            <input
              value={section.title}
              list={titleListId}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingTitle(false)
              }}
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-[#111827] outline-none"
              aria-label="Section title"
            />
          ) : (
            <span
              className="block truncate text-sm font-semibold text-[#111827]"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingTitle(true)
              }}
            >
              {section.title || 'Section'}
            </span>
          )}
          <datalist id={titleListId}>
            {SWIM_SECTION_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {[
              distance > 0 ? formatSwimDistance(distance) : null,
              setCount > 0 ? `${setCount} set${setCount === 1 ? '' : 's'}` : null,
            ]
              .filter(Boolean)
              .join('  ·  ') || 'Empty'}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-border/50 px-1 sm:px-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditingTitle(true)
              if (!expanded) onToggleExpand()
            }}
            className="sr-only"
            tabIndex={-1}
          >
            Rename
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40 hover:text-muted-foreground"
            aria-label="Duplicate section"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            disabled={!canDelete}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30"
            aria-label="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40"
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown className={cn('h-4 w-4 transition', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border/40 bg-white/50">
          {section.sets.map((set, setIndex) => (
            <div
              key={set.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleSetDrop(setIndex)}
              className={cn(setDragIndex === setIndex && 'opacity-50')}
            >
              <SwimSetRow
                set={set}
                onChange={(next) => updateSet(setIndex, next)}
                onDelete={() => deleteSet(setIndex)}
                canDelete={section.sets.length > 1}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: (e) => {
                    e.stopPropagation()
                    setSetDragIndex(setIndex)
                  },
                  onDragEnd: () => setSetDragIndex(null),
                }}
              />
            </div>
          ))}

          <div className="border-t border-border/40 px-3 py-2">
            <button
              type="button"
              onClick={addSet}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 transition hover:text-sky-900"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Set
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type SwimWorkoutBuilderProps = {
  sections: SwimSection[]
  onChange: (sections: SwimSection[]) => void
  readOnly?: boolean
}

export function SwimWorkoutBuilder({
  sections,
  onChange,
  readOnly = false,
}: SwimWorkoutBuilderProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [addingSection, setAddingSection] = useState(false)

  function updateSections(next: SwimSection[]) {
    onChange(normalizeSectionOrders(next))
  }

  function updateSection(index: number, section: SwimSection) {
    const next = [...sections]
    next[index] = section
    updateSections(next)
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addSection(title: string) {
    const section = createSection(title, sections.length)
    updateSections([...sections, section])
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.delete(section.id)
      return next
    })
    setAddingSection(false)
  }

  function duplicateSection(index: number) {
    const source = sections[index]
    const copy: SwimSection = {
      id: newSwimId(),
      title: source.title,
      order: sections.length,
      sets: source.sets.map((set, i) => ({ ...set, id: newSwimId(), order: i })),
    }
    const next = [...sections]
    next.splice(index + 1, 0, copy)
    updateSections(next)
    setCollapsedIds((prev) => {
      const nextIds = new Set(prev)
      nextIds.delete(copy.id)
      return nextIds
    })
  }

  function deleteSection(index: number) {
    const id = sections[index]?.id
    updateSections(sections.filter((_, i) => i !== index))
    if (id) {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return
    const next = [...sections]
    const [item] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, item)
    updateSections(next)
    setDragIndex(null)
  }

  if (readOnly) {
    return (
      <div className="space-y-1.5">
        {sections.map((section) => {
          const accent = swimSectionAccent(section.title)
          const distance = sectionDistanceMeters(section)
          const meaningful = section.sets.filter(isMeaningfulSet)
          if (meaningful.length === 0 && distance <= 0) return null

          return (
            <div
              key={section.id}
              className={cn(
                'overflow-hidden rounded-[6px] border border-border/60',
                accent.surface,
              )}
            >
              <div className="flex items-stretch">
                <div className={cn('w-1.5 shrink-0 sm:w-2', accent.bar)} aria-hidden />
                <div className="min-w-0 flex-1 px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-[#111827]">{section.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {[
                        distance > 0 ? formatSwimDistance(distance) : null,
                        meaningful.length > 0
                          ? `${meaningful.length} set${meaningful.length === 1 ? '' : 's'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {meaningful.map((set) => {
                      const rest = set.rest?.trim()
                      const target = set.targetPace?.trim()
                      const notes = set.notes?.trim()

                      return (
                        <li key={set.id} className="space-y-0.5">
                          <div className="flex min-w-0 items-center gap-x-2 text-[13px] leading-snug">
                            <span className="shrink-0 font-semibold tabular-nums text-[#111827]">
                              {set.repeatCount} × {set.distanceM} m
                            </span>
                            {set.stroke ? (
                              <span className="min-w-0 truncate text-[#6B7280]">{set.stroke}</span>
                            ) : null}
                            {rest ? (
                              <span className="shrink-0 font-medium text-violet-600">
                                / {rest}
                              </span>
                            ) : null}
                            {target ? (
                              <span
                                className={cn(
                                  'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                  swimTargetBadgeClass(target),
                                )}
                              >
                                {target}
                              </span>
                            ) : null}
                          </div>
                          {notes ? (
                            <p className="text-[12px] text-muted-foreground">{notes}</p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Workout Details
      </p>

      {sections.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No sections yet — add one below.</p>
      ) : null}

      {sections.map((section, index) => (
        <SwimSectionCard
          key={section.id}
          section={section}
          expanded={!collapsedIds.has(section.id)}
          onToggleExpand={() => toggleCollapsed(section.id)}
          onChange={(next) => updateSection(index, next)}
          onDelete={() => deleteSection(index)}
          onDuplicate={() => duplicateSection(index)}
          canDelete={sections.length > 1}
          dragIndex={dragIndex}
          index={index}
          onDragStart={setDragIndex}
          onDragEnd={() => setDragIndex(null)}
          onDrop={handleDrop}
        />
      ))}

      {addingSection ? (
        <div className="rounded-[6px] border border-dashed border-border/80 bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Choose section type</p>
          <div className="flex flex-wrap gap-1.5">
            {SWIM_SECTION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => addSection(option === 'Custom' ? 'Custom' : option)}
                className="rounded-full border border-border/70 bg-white px-2.5 py-1 text-xs font-medium text-[#111827] transition hover:border-sky-400/50 hover:bg-sky-50"
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAddingSection(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingSection(true)}
          className="flex w-full items-center justify-center gap-1 rounded-[6px] border border-dashed border-border/70 py-2.5 text-xs font-medium text-muted-foreground transition hover:border-sky-400/50 hover:bg-sky-50/50 hover:text-sky-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Section
        </button>
      )}
    </div>
  )
}
