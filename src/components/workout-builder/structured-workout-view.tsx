import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { formatBlockSummary } from '@/lib/workout-builder/utils'

type StructuredWorkoutViewProps = {
  structure: WorkoutStructure | null | undefined
}

function BlockList({
  title,
  blocks,
}: {
  title: string
  blocks: WorkoutStructure['warmup']
}) {
  if (!blocks.length) return null

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-2">
        {blocks.map((block) => (
          <li
            key={block.id}
            className="rounded-xl bg-muted/40 px-3 py-2 text-sm"
          >
            {block.type === 'FREE_TEXT' ? block.text : formatBlockSummary(block)}
            {block.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{block.notes}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StructuredWorkoutView({ structure }: StructuredWorkoutViewProps) {
  if (!structure) return null

  const hasContent =
    structure.warmup.length > 0 ||
    structure.mainSet.length > 0 ||
    structure.cooldown.length > 0 ||
    structure.coachNotes

  if (!hasContent) return null

  return (
    <div className="space-y-4">
      <BlockList title="Warm-up" blocks={structure.warmup} />
      <BlockList title="Main set" blocks={structure.mainSet} />
      <BlockList title="Cool-down" blocks={structure.cooldown} />
      {structure.coachNotes && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coach notes
          </h4>
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
            {structure.coachNotes}
          </p>
        </div>
      )}
    </div>
  )
}
