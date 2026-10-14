'use client'

import type { DragEvent } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ExerciseLibraryDto } from '@/app/actions/exercises'
import { searchContextForSection } from '@/lib/exercises/context'
import type { ExerciseSearchContext } from '@/lib/exercises/types'
import {
  SECTION_TYPE_LABELS,
  createEmptyBlockV2,
  newStructureId,
  type WorkoutBlockTypeV2,
  type WorkoutSectionType,
  type WorkoutSectionV2,
} from '@/lib/workout-builder/structure-v2'
import { sourcesEqual } from '@/lib/workout-builder/structure-move-eq'
import { AddBlockMenu } from '@/components/workout-builder/sections/add-block-menu'
import { SectionExerciseItem } from '@/components/workout-builder/sections/section-exercise-item'
import { WorkoutBlockCard } from '@/components/workout-builder/sections/workout-block-card'
import { useStructureDnd } from '@/components/workout-builder/sections/structure-dnd-context'
import { Button } from '@/components/ui/button'
import {
  DragInsertIndicator,
  insertIndexFromClientY,
  insertIndexFromDragEvent,
} from '@/components/ui/drag-insert-indicator'
import { cn } from '@/lib/utils'
import { useRef } from 'react'

type WorkoutSectionCardProps = {
  section: WorkoutSectionV2
  /** Index of this section in structure.items */
  sectionRootIndex: number
  onChange: (section: WorkoutSectionV2) => void
  onRemove: () => void
  library: ExerciseLibraryDto[]
  searchContext?: ExerciseSearchContext
  className?: string
  dragging?: boolean
  onDragHandleStart?: (e: DragEvent<HTMLButtonElement>) => void
  onDragHandleEnd?: () => void
}

export function WorkoutSectionCard({
  section,
  sectionRootIndex,
  onChange,
  onRemove,
  library,
  searchContext: searchContextProp,
  className,
  dragging = false,
  onDragHandleStart,
  onDragHandleEnd,
}: WorkoutSectionCardProps) {
  const dnd = useStructureDnd()
  const listRef = useRef<HTMLDivElement>(null)
  const searchContext =
    searchContextProp ?? searchContextForSection(section.type)

  function updateBlock(index: number, next: WorkoutSectionV2['blocks'][number]) {
    onChange({
      ...section,
      blocks: section.blocks.map((block, i) => (i === index ? next : block)),
    })
  }

  function addBlock(type: WorkoutBlockTypeV2) {
    onChange({
      ...section,
      blocks: [...section.blocks, createEmptyBlockV2(type)],
    })
  }

  function addExercise() {
    onChange({
      ...section,
      blocks: [...section.blocks, createEmptyBlockV2('EXERCISE')],
    })
  }

  function acceptsSectionDrop(e: DragEvent) {
    return dnd.isDraggingType(e, ['rootItem', 'sectionBlock', 'exercise'])
  }

  function resolveInsert(clientY: number): number {
    const root = listRef.current
    if (!root) return section.blocks.length
    const rows = root.querySelectorAll('[data-tt-section-block]')
    return insertIndexFromClientY(clientY, rows, section.blocks.length)
  }

  function highlightSection(insertAt: number) {
    dnd.setHighlight({
      kind: 'section',
      sectionRootIndex,
      insertAt,
    })
  }

  function showInsert(insertAt: number) {
    return (
      dnd.highlight?.kind === 'section' &&
      dnd.highlight.sectionRootIndex === sectionRootIndex &&
      dnd.highlight.insertAt === insertAt
    )
  }

  const itemCount = section.blocks.length
  const firstExerciseIndex = section.blocks.findIndex((b) => b.type === 'EXERCISE')
  const title =
    section.name?.trim() || SECTION_TYPE_LABELS[section.type] || 'Section'

  return (
    <section
      className={cn(
        'rounded-[10px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white',
        dragging && 'opacity-50',
        className,
      )}
    >
      <header className="flex items-center gap-1.5 border-b border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light,#F5F6F7)]/50 px-2 py-1.5">
        <button
          type="button"
          draggable
          onDragStart={onDragHandleStart}
          onDragEnd={onDragHandleEnd}
          className="inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-[var(--tt-ink-faint,#9ca3af)] hover:bg-black/[0.04] hover:text-[var(--tt-ink-soft,#6b7280)] active:cursor-grabbing"
          aria-label={`Drag to reorder ${title}`}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>

        <input
          value={section.name ?? ''}
          onChange={(e) =>
            onChange({ ...section, name: e.target.value || undefined })
          }
          placeholder={SECTION_TYPE_LABELS[section.type]}
          aria-label="Section name"
          className="h-7 min-w-0 flex-1 rounded-[5px] border border-transparent bg-transparent px-1.5 text-[13px] font-semibold text-[var(--tt-ink,#111315)] outline-none placeholder:font-medium placeholder:text-[var(--tt-ink-faint,#9ca3af)] hover:bg-white/70 focus:border-[var(--tt-v2-light-panel-line,#E3E6E9)] focus:bg-white"
        />

        <span className="hidden shrink-0 text-[10px] tabular-nums text-[var(--tt-ink-faint,#9ca3af)] sm:inline">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </header>

      <div
        ref={listRef}
        className="space-y-1.5 p-2"
        onDragOver={(e) => {
          if (!acceptsSectionDrop(e)) return
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          highlightSection(resolveInsert(e.clientY))
        }}
        onDrop={(e) => {
          if (!acceptsSectionDrop(e)) return
          dnd.dropOn(
            {
              kind: 'section',
              sectionRootIndex,
              insertAt: resolveInsert(e.clientY),
            },
            e,
          )
        }}
      >
        {section.blocks.length === 0 ? (
          <p className="px-1 py-2 text-[12px] text-[var(--tt-ink-faint,#9ca3af)]">
            Empty section — drop exercises/blocks here, or add below.
          </p>
        ) : null}

        {section.blocks.map((block, index) => {
          const remove = () =>
            onChange({
              ...section,
              blocks: section.blocks.filter((_, i) => i !== index),
            })

          const source = {
            kind: 'sectionBlock' as const,
            sectionRootIndex,
            blockIndex: index,
          }
          const blockDragging = sourcesEqual(dnd.active, source)

          return (
            <div
              key={block.id || `${index}`}
              data-tt-section-block=""
              className="relative"
              onDragOver={(e) => {
                if (!acceptsSectionDrop(e)) return
                e.preventDefault()
                e.stopPropagation()
                e.dataTransfer.dropEffect = 'move'
                highlightSection(insertIndexFromDragEvent(e, index))
              }}
              onDrop={(e) => {
                if (!acceptsSectionDrop(e)) return
                dnd.dropOn(
                  {
                    kind: 'section',
                    sectionRootIndex,
                    insertAt: insertIndexFromDragEvent(e, index),
                  },
                  e,
                )
              }}
            >
              <DragInsertIndicator show={showInsert(index)} />

              {block.type === 'EXERCISE' ? (
                <SectionExerciseItem
                  block={block}
                  library={library}
                  searchContext={searchContext}
                  showHeaders={index === firstExerciseIndex}
                  dragging={blockDragging}
                  onDragHandleStart={(e) => dnd.beginDrag(source, e)}
                  onDragHandleEnd={dnd.endDrag}
                  onChange={(next) => updateBlock(index, next)}
                  onRemove={remove}
                />
              ) : (
                <WorkoutBlockCard
                  block={block}
                  blockContainer={{
                    kind: 'section',
                    sectionRootIndex,
                    blockIndex: index,
                  }}
                  library={library}
                  searchContext={searchContext}
                  dragging={blockDragging}
                  onDragHandleStart={(e) => dnd.beginDrag(source, e)}
                  onDragHandleEnd={dnd.endDrag}
                  onChange={(next) => updateBlock(index, next)}
                  onRemove={remove}
                />
              )}
            </div>
          )
        })}

        {section.blocks.length > 0 ? (
          <div className="relative h-3">
            <DragInsertIndicator show={showInsert(section.blocks.length)} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-transparent px-2 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:border-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink,#111315)]"
            onClick={addExercise}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Add exercise
          </button>
          <AddBlockMenu onAdd={addBlock} />
        </div>
      </div>
    </section>
  )
}

export function createEmptySection(
  type: WorkoutSectionType = 'STRENGTH',
): WorkoutSectionV2 {
  return {
    id: newStructureId(),
    type,
    name: SECTION_TYPE_LABELS[type],
    blocks: [],
  }
}
