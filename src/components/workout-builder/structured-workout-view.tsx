import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { flattenStructure } from '@/lib/workout-builder/structure-list'
import { getBlockDisplayName } from '@/lib/workout-builder/smart-blocks'
import { formatBlockSummary } from '@/lib/workout-builder/utils'

type StructuredWorkoutViewProps = {
  structure: WorkoutStructure | null | undefined
}

export function StructuredWorkoutView({ structure }: StructuredWorkoutViewProps) {
  if (!structure) return null

  const blocks = flattenStructure(structure).map((item) => item.block)
  const hasContent = blocks.length > 0 || Boolean(structure.coachNotes)

  if (!hasContent) return null

  return (
    <div className="space-y-4">
      {blocks.length > 0 ? (
        <ul className="space-y-2">
          {blocks.map((block) => {
            const title = getBlockDisplayName(block)
            const summary =
              block.type === 'FREE_TEXT' ? block.text : formatBlockSummary(block)
            return (
              <li key={block.id} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{title}</p>
                {summary && summary !== title ? (
                  <p className="text-muted-foreground">{summary}</p>
                ) : null}
                {block.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{block.notes}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {structure.coachNotes ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coach notes
          </h4>
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
            {structure.coachNotes}
          </p>
        </div>
      ) : null}
    </div>
  )
}
