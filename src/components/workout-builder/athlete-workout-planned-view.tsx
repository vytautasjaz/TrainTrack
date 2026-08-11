'use client'

import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { getStructureDescriptionLines } from '@/lib/plan-workout'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { AthleteWorkoutStructureView } from '@/components/workout-builder/athlete-workout-structure-view'
import { Textarea } from '@/components/ui/textarea'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { SessionType, WorkoutType } from '@prisma/client'

type AthleteWorkoutPlannedViewProps = {
  plannedDistance?: number | null
  plannedDuration?: number | null
  structure?: WorkoutStructure | null
  coachNotes?: string
  onCoachNotesChange?: (value: string) => void
  description?: string | null
  sportType?: WorkoutType
  sessionType?: SessionType
  className?: string
  /** Coach builder preview vs athlete read-only modal */
  variant?: 'editor' | 'athlete'
  showSummaryMetrics?: boolean
}

export function AthleteWorkoutPlannedView({
  plannedDistance,
  plannedDuration,
  structure,
  coachNotes,
  onCoachNotesChange,
  description,
  sportType = 'RUN',
  sessionType,
  className,
  variant = 'editor',
  showSummaryMetrics = true,
}: AthleteWorkoutPlannedViewProps) {
  const structureLines =
    structure && hasStructureContent(structure)
      ? getStructureDescriptionLines(structure)
      : []

  const targetParts: string[] = []
  const distanceLabel = formatDistance(plannedDistance ?? null)
  const durationLabel = formatDuration(plannedDuration ?? null)
  if (distanceLabel !== '—') targetParts.push(distanceLabel)
  if (durationLabel !== '—') targetParts.push(durationLabel)
  const targetLine = targetParts.length > 0 ? targetParts.join(' · ') : null

  const showCoachEditor = Boolean(onCoachNotesChange)
  const showCoachReadOnly = !showCoachEditor && Boolean(coachNotes?.trim())
  const isAthlete = variant === 'athlete'
  const showStructuredAthleteView =
    isAthlete && structure && hasStructureContent(structure) && sportType

  if (
    !description?.trim() &&
    !targetLine &&
    structureLines.length === 0 &&
    !showCoachEditor &&
    !showCoachReadOnly &&
    !showStructuredAthleteView
  ) {
    return null
  }

  return (
    <section
      className={cn(
        'space-y-3 text-sm',
        !isAthlete && 'rounded-xl border border-border/60 p-3',
        className,
      )}
    >
      {!isAthlete ? <p className="font-semibold">Planned</p> : null}

      {description?.trim() ? (
        <p className="whitespace-pre-wrap leading-relaxed">{description.trim()}</p>
      ) : null}

      {showStructuredAthleteView ? (
        <AthleteWorkoutStructureView
          structure={structure}
          sportType={sportType}
          sessionType={sessionType}
          plannedDistance={plannedDistance}
          plannedDuration={plannedDuration}
          variant="full"
          showSummaryMetrics={showSummaryMetrics}
        />
      ) : (
        <>
          {targetLine ? (
            <p className={cn(isAthlete && 'font-medium')}>
              {isAthlete ? targetLine : `Target: ${targetLine}`}
            </p>
          ) : null}

          {structureLines.length > 0 && (
            <div className="space-y-1">
              {structureLines.map((line, index) => (
                <p
                  key={index}
                  className={cn(
                    'leading-snug',
                    isAthlete ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {showCoachEditor ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Coach comment</p>
          <Textarea
            value={coachNotes ?? ''}
            onChange={(e) => onCoachNotesChange?.(e.target.value)}
            rows={3}
            placeholder="Notes for the athlete (optional)"
            variant="soft"
          />
        </div>
      ) : showCoachReadOnly ? (
        isAthlete ? (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-medium text-muted-foreground">Coach comment</p>
            <p className="whitespace-pre-wrap leading-relaxed">{coachNotes}</p>
          </div>
        ) : (
          <p className="rounded-2xl bg-muted/60 p-3 whitespace-pre-wrap">
            Coach: {coachNotes}
          </p>
        )
      ) : null}
    </section>
  )
}
