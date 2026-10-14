'use client'

import { useEffect, useState, type DragEvent } from 'react'
import type { WorkoutType } from '@prisma/client'
import {
  getExerciseLibraryForEditor,
  type ExerciseLibraryDto,
} from '@/app/actions/exercises'
import { searchContextForSection } from '@/lib/exercises/context'
import {
  blockRootItem,
  createEmptyBlockV2,
  defaultStructureV2ForSport,
  sectionRootItem,
  type WorkoutBlockTypeV2,
  type WorkoutBlockV2,
  type WorkoutRootItemV2,
  type WorkoutSectionType,
  type WorkoutSectionV2,
  type WorkoutStructureV2,
} from '@/lib/workout-builder/structure-v2'
import { sourcesEqual } from '@/lib/workout-builder/structure-move-eq'
import { AddBlockMenu } from '@/components/workout-builder/sections/add-block-menu'
import { AddSectionMenu } from '@/components/workout-builder/sections/add-section-menu'
import {
  WorkoutSectionCard,
  createEmptySection,
} from '@/components/workout-builder/sections/workout-section-card'
import { SectionExerciseItem } from '@/components/workout-builder/sections/section-exercise-item'
import { WorkoutBlockCard } from '@/components/workout-builder/sections/workout-block-card'
import {
  StructureDndProvider,
  useStructureDnd,
} from '@/components/workout-builder/sections/structure-dnd-context'
import { Button } from '@/components/ui/button'
import { DragInsertIndicator } from '@/components/ui/drag-insert-indicator'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

type WorkoutSectionsBuilderProps = {
  structure: WorkoutStructureV2
  onChange: (structure: WorkoutStructureV2) => void
  sportType: WorkoutType
  className?: string
}

function sectionFromItem(
  item: Extract<WorkoutRootItemV2, { kind: 'section' }>,
): WorkoutSectionV2 {
  const { kind: _kind, ...section } = item
  return section
}

function isExerciseBlock(
  block: WorkoutBlockV2,
): block is Extract<WorkoutBlockV2, { type: 'EXERCISE' }> {
  return block.type === 'EXERCISE'
}

function firstRootExerciseIndex(items: WorkoutRootItemV2[]): number {
  return items.findIndex(
    (item) => item.kind === 'block' && isExerciseBlock(item.block),
  )
}

function RootList({
  structure,
  onChange,
  sportType,
  library,
}: {
  structure: WorkoutStructureV2
  onChange: (structure: WorkoutStructureV2) => void
  sportType: WorkoutType
  library: ExerciseLibraryDto[]
}) {
  const dnd = useStructureDnd()
  const items = structure.items
  const firstExerciseAt = firstRootExerciseIndex(items)
  const rootContext = searchContextForSection(undefined, sportType)

  function setItems(next: WorkoutRootItemV2[]) {
    onChange({ ...structure, items: next })
  }

  function addSection(type: WorkoutSectionType) {
    setItems([...items, sectionRootItem(createEmptySection(type))])
  }

  function addBlock(type: WorkoutBlockTypeV2) {
    setItems([...items, blockRootItem(createEmptyBlockV2(type))])
  }

  function addExercise() {
    setItems([...items, blockRootItem(createEmptyBlockV2('EXERCISE'))])
  }

  function applyDefaultTemplate() {
    onChange(
      defaultStructureV2ForSport(
        sportType === 'HYROX' ? 'HYROX' : 'STRENGTH',
      ),
    )
  }

  function acceptsRootDrop(e: DragEvent) {
    return dnd.isDraggingType(e, ['rootItem', 'sectionBlock', 'exercise'])
  }

  function showRootInsert(insertAt: number) {
    return (
      dnd.highlight?.kind === 'root' && dnd.highlight.insertAt === insertAt
    )
  }

  const addActions = (
    <div className="flex flex-wrap items-center gap-2">
      <AddSectionMenu onAdd={addSection} label="Add section" />
      <AddBlockMenu onAdd={addBlock} />
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-transparent px-2 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:border-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink,#111315)]"
        onClick={addExercise}
      >
        <Plus className="h-3 w-3" aria-hidden />
        Add exercise
      </button>
    </div>
  )

  if (items.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] px-3 py-4 text-center">
        <p className="text-[13px] font-medium text-[var(--tt-ink,#111315)]">
          Empty workout
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b7280)]">
          Add sections, blocks, or exercises — they are peers. Or start from a
          template. Drag items between sections and out to the root list.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <AddSectionMenu
            onAdd={addSection}
            align="center"
            label="Add section"
          />
          <AddBlockMenu onAdd={addBlock} />
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-transparent px-2 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:border-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink,#111315)]"
            onClick={addExercise}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Add exercise
          </button>
        </div>
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="h-7 rounded-[5px]"
            onClick={applyDefaultTemplate}
          >
            Default template
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {items.map((item, index) => {
        const source = { kind: 'rootItem' as const, rootIndex: index }
        const dragging = sourcesEqual(dnd.active, source)

        return (
          <div
            key={item.kind === 'section' ? item.id : item.block.id}
            className="relative"
            onDragOver={(e) => {
              if (!acceptsRootDrop(e)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              dnd.setHighlight({ kind: 'root', insertAt: index })
            }}
            onDrop={(e) => dnd.dropOn({ kind: 'root', insertAt: index }, e)}
          >
            <DragInsertIndicator show={showRootInsert(index)} />

            {item.kind === 'section' ? (
              <WorkoutSectionCard
                section={sectionFromItem(item)}
                sectionRootIndex={index}
                library={library}
                searchContext={searchContextForSection(item.type, sportType)}
                dragging={dragging}
                onDragHandleStart={(e) => dnd.beginDrag(source, e)}
                onDragHandleEnd={dnd.endDrag}
                onChange={(next) =>
                  setItems(
                    items.map((it, i) =>
                      i === index ? sectionRootItem(next) : it,
                    ),
                  )
                }
                onRemove={() => setItems(items.filter((_, i) => i !== index))}
              />
            ) : isExerciseBlock(item.block) ? (
              <div className="rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white px-2 py-1.5">
                <SectionExerciseItem
                  block={item.block}
                  library={library}
                  searchContext={rootContext}
                  showHeaders={index === firstExerciseAt}
                  dragging={dragging}
                  onDragHandleStart={(e) => dnd.beginDrag(source, e)}
                  onDragHandleEnd={dnd.endDrag}
                  onChange={(next) =>
                    setItems(
                      items.map((it, i) =>
                        i === index ? blockRootItem(next) : it,
                      ),
                    )
                  }
                  onRemove={() =>
                    setItems(items.filter((_, i) => i !== index))
                  }
                />
              </div>
            ) : (
              <WorkoutBlockCard
                block={item.block}
                blockContainer={{ kind: 'root', rootIndex: index }}
                library={library}
                searchContext={rootContext}
                dragging={dragging}
                onDragHandleStart={(e) => dnd.beginDrag(source, e)}
                onDragHandleEnd={dnd.endDrag}
                onChange={(next) =>
                  setItems(
                    items.map((it, i) =>
                      i === index ? blockRootItem(next) : it,
                    ),
                  )
                }
                onRemove={() => setItems(items.filter((_, i) => i !== index))}
              />
            )}
          </div>
        )
      })}

      <div
        className="relative h-3"
        onDragOver={(e) => {
          if (!acceptsRootDrop(e)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          dnd.setHighlight({ kind: 'root', insertAt: items.length })
        }}
        onDrop={(e) =>
          dnd.dropOn({ kind: 'root', insertAt: items.length }, e)
        }
        onDragLeave={() => {
          if (dnd.highlight?.kind === 'root') dnd.setHighlight(null)
        }}
      >
        <DragInsertIndicator show={showRootInsert(items.length)} />
      </div>

      {addActions}
    </>
  )
}

export function WorkoutSectionsBuilder({
  structure,
  onChange,
  sportType,
  className,
}: WorkoutSectionsBuilderProps) {
  const [library, setLibrary] = useState<ExerciseLibraryDto[]>([])

  useEffect(() => {
    let cancelled = false
    void getExerciseLibraryForEditor()
      .then((rows) => {
        if (!cancelled) setLibrary(rows)
      })
      .catch(() => {
        if (!cancelled) setLibrary([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <StructureDndProvider structure={structure} onChange={onChange}>
      <div className={cn('space-y-2', className)}>
        <RootList
          structure={structure}
          onChange={onChange}
          sportType={sportType}
          library={library}
        />
      </div>
    </StructureDndProvider>
  )
}
