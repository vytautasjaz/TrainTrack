'use client'

/**
 * @deprecated Coach create/edit flows use SharedWorkoutEditor / WorkoutEditorPage.
 * Kept for any remaining direct imports; prefer the shared card editor.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { WorkoutType, SessionType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { WorkoutBlockListV2 } from '@/components/workout-builder/workout-block-list-v2'
import { WorkoutQuickStart } from '@/components/workout-builder/workout-quick-start'
import { AthleteWorkoutPlannedView } from '@/components/workout-builder/athlete-workout-planned-view'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageTitle } from '@/components/ui/typography'
import {
  saveTemplateBuilder,
  saveTemplateBuilderAndRedirect,
  saveWorkoutBuilder,
  saveWorkoutBuilderAndRedirect,
} from '@/app/actions/workout-builder'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { buildPreset } from '@/lib/workout-builder/presets'
import { buildQuickStartPreset, sportSupportsQuickStart } from '@/lib/workout-builder/quick-start'
import { getSessionTypeLabel, sessionTypesForSport } from '@/lib/workout-builder/session-modes'
import {
  deriveSmartWorkoutTitle,
  shouldSyncSmartTitle,
} from '@/lib/workout-builder/smart-title'
import type { BuilderMode, BuilderWorkout } from '@/lib/workout-builder/types'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import {
  computeWorkoutSummaryMetrics,
} from '@/lib/workout-builder/workout-summary'

const WORKOUT_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type WorkoutBuilderProps = {
  mode: BuilderMode
  initial: BuilderWorkout
  entityId?: string
  fallbackHref?: string
  athletePreferences?: AthletePreferences | null
}

export function WorkoutBuilder({
  mode,
  initial,
  entityId,
  fallbackHref = '/training',
  athletePreferences,
}: WorkoutBuilderProps) {
  const [workout, setWorkout] = useState<BuilderWorkout>(initial)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showQuickStart, setShowQuickStart] = useState(
    !entityId && !hasStructureContent(initial.structure) && sportSupportsQuickStart(initial.sportType),
  )
  const titleCustomizedRef = useRef(Boolean(initial.title.trim()))
  const entityIdRef = useRef(entityId)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const summaryMetrics = useMemo(
    () => computeWorkoutSummaryMetrics(workout.structure, athletePreferences, workout.sportType),
    [workout.structure, athletePreferences],
  )

  const canAutosave =
    workout.title.trim().length > 0 &&
    (mode === 'template' || Boolean(workout.scheduledDate))

  const persist = useCallback(
    async (redirectAfter = false) => {
      setSaveError(null)
      const payload = {
        ...workout,
        sessionType: workout.sessionType,
        estimatedDuration: summaryMetrics.durationMin,
        tags: workout.tags.filter(Boolean),
      }

      try {
        if (mode === 'workout') {
          if (redirectAfter) {
            await saveWorkoutBuilderAndRedirect(payload, entityIdRef.current)
            return
          }
          const result = await saveWorkoutBuilder(payload, entityIdRef.current)
          entityIdRef.current = result.id
          setSavedAt(new Date(result.savedAt))
        } else {
          if (redirectAfter) {
            await saveTemplateBuilderAndRedirect(payload, entityIdRef.current)
            return
          }
          const result = await saveTemplateBuilder(payload, entityIdRef.current)
          entityIdRef.current = result.id
          setSavedAt(new Date(result.savedAt))
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
      }
    },
    [workout, summaryMetrics.durationMin, mode],
  )

  useEffect(() => {
    if (!canAutosave) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      startTransition(() => {
        void persist(false)
      })
    }, 3000)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [workout, canAutosave, persist])

  function applyQuickStart(result: ReturnType<typeof buildQuickStartPreset>) {
    titleCustomizedRef.current = false
    setShowQuickStart(false)
    setWorkout((prev) => ({
      ...prev,
      title: result.title,
      sessionType: result.sessionType,
      sportType: result.sportType,
      structure: result.structure,
    }))
  }

  function applySessionType(sessionType: SessionType) {
    applyQuickStart(buildQuickStartPreset(sessionType, workout.sportType))
  }

  function updateStructure(structure: BuilderWorkout['structure']) {
    setWorkout((prev) => {
      const next = {
        ...prev,
        structure,
      }
      if (
        hasStructureContent(structure) &&
        shouldSyncSmartTitle(prev.title, structure, athletePreferences, titleCustomizedRef.current)
      ) {
        const nextTitle = deriveSmartWorkoutTitle(
          structure,
          athletePreferences,
          prev.sportType,
        )
        if (nextTitle) next.title = nextTitle
      }
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 pb-24 pt-2 sm:px-4 sm:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton variant="link" fallbackHref={fallbackHref} className="px-0" />
          <PageTitle className="mt-1 text-xl">
            {mode === 'workout' ? 'Workout builder' : 'Template builder'}
          </PageTitle>
        </div>
        <div className="text-right text-caption">
          {isPending && 'Saving…'}
          {!isPending && savedAt && `Saved ${formatDistanceToNow(savedAt, { addSuffix: true })}`}
          {!isPending && !savedAt && canAutosave && 'Unsaved changes'}
          {saveError && <p className="text-red-500">{saveError}</p>}
        </div>
      </div>

      {showQuickStart && sportSupportsQuickStart(workout.sportType) ? (
        <WorkoutQuickStart
          sportType={workout.sportType}
          selectedSessionType={workout.sessionType}
          onSelect={applyQuickStart}
        />
      ) : (
        <>
          <section className="space-y-3 border-b border-border/50 pb-4">
            <FormField label="Workout name">
              <Textarea
                value={workout.title}
                onChange={(e) => {
                  titleCustomizedRef.current = true
                  setWorkout((p) => ({ ...p, title: e.target.value }))
                }}
                placeholder="Auto-generated from blocks"
                rows={Math.max(1, workout.title.split('\n').length)}
                className="min-h-[2.5rem] resize-y text-base font-semibold"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Sport">
                <Select
                  value={workout.sportType}
                  onChange={(e) => {
                    const nextSport = e.target.value as WorkoutType
                    const options = sessionTypesForSport(nextSport)
                    setWorkout((p) => {
                      const nextSession = options.includes(p.sessionType)
                        ? p.sessionType
                        : options[0]
                      const preset = buildPreset(nextSession)
                      return {
                        ...p,
                        sportType: nextSport,
                        sessionType: nextSession,
                        title: titleCustomizedRef.current ? p.title : preset.title,
                        structure: hasStructureContent(p.structure)
                          ? p.structure
                          : preset.structure,
                      }
                    })
                  }}
                >
                  {WORKOUT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {WORKOUT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Workout type">
                <Select
                  value={workout.sessionType}
                  onChange={(e) => applySessionType(e.target.value as SessionType)}
                >
                  {sessionTypesForSport(workout.sportType).map((t) => (
                    <option key={t} value={t}>
                      {getSessionTypeLabel(t, workout.sportType)}
                    </option>
                  ))}
                </Select>
              </FormField>

              {mode === 'workout' && (
                <FormField label="Scheduled date" className="sm:col-span-2">
                  <Input
                    type="date"
                    value={workout.scheduledDate ?? ''}
                    onChange={(e) =>
                      setWorkout((p) => ({ ...p, scheduledDate: e.target.value }))
                    }
                    className="w-full sm:max-w-xs"
                  />
                </FormField>
              )}

              <FormField label="Tags (comma separated)" className="sm:col-span-2">
                <Input
                  value={workout.tags.join(', ')}
                  onChange={(e) =>
                    setWorkout((p) => ({
                      ...p,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="e.g. marathon prep, track"
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {summaryMetrics.distanceLabel}
              </Badge>
              <Badge variant="outline">
                ~{summaryMetrics.durationLabel}
              </Badge>
              {workout.tags.map((tag) => (
                <Badge key={tag} className="bg-brand-soft text-brand">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0 space-y-3">
              {sportSupportsQuickStart(workout.sportType) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowQuickStart(true)}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    Change workout type
                  </button>
                </div>
              )}
              <WorkoutBlockListV2
                structure={workout.structure}
                onChange={updateStructure}
                sportType={workout.sportType}
                athletePreferences={athletePreferences}
              />
            </section>

            {hasStructureContent(workout.structure) && (
              <AthleteWorkoutPlannedView
                plannedDistance={summaryMetrics.distanceKm}
                plannedDuration={summaryMetrics.durationMin}
                structure={workout.structure}
                coachNotes={workout.structure.coachNotes ?? ''}
                onCoachNotesChange={(value) =>
                  setWorkout((p) => ({
                    ...p,
                    structure: { ...p.structure, coachNotes: value },
                  }))
                }
                className="lg:sticky lg:top-4 lg:self-start"
              />
            )}
          </div>
        </>
      )}

      {!showQuickStart && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!canAutosave || isPending}
              onClick={() => startTransition(() => void persist(true))}
            >
              Save {mode === 'workout' ? 'workout' : 'template'}
            </Button>
            <BackButton fallbackHref={fallbackHref} />
          </div>
        </div>
      )}
    </div>
  )
}
