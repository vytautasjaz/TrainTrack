'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { SessionType, WorkoutType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { WorkoutSectionPanel } from '@/components/workout-builder/block-editor'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Badge } from '@/components/ui/badge'
import {
  saveTemplateBuilder,
  saveTemplateBuilderAndRedirect,
  saveWorkoutBuilder,
  saveWorkoutBuilderAndRedirect,
} from '@/app/actions/workout-builder'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { buildPreset } from '@/lib/workout-builder/presets'
import { getSessionTypeLabel, sessionTypesForSport } from '@/lib/workout-builder/session-modes'
import type { BuilderMode, BuilderWorkout } from '@/lib/workout-builder/types'
import {
  estimateDurationMinutes,
} from '@/lib/workout-builder/utils'

const WORKOUT_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]
type WorkoutBuilderProps = {
  mode: BuilderMode
  initial: BuilderWorkout
  entityId?: string
  fallbackHref?: string
}

export function WorkoutBuilder({ mode, initial, entityId, fallbackHref = '/training' }: WorkoutBuilderProps) {
  const [workout, setWorkout] = useState<BuilderWorkout>(initial)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const entityIdRef = useRef(entityId)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const estimatedDuration = useMemo(
    () => estimateDurationMinutes(workout.structure),
    [workout.structure],
  )

  const canAutosave =
    workout.title.trim().length > 0 &&
    (mode === 'template' || Boolean(workout.scheduledDate))

  const persist = useCallback(
    async (redirectAfter = false) => {
      setSaveError(null)
      const payload = {
        ...workout,
        estimatedDuration,
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
    [workout, estimatedDuration, mode],
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

  function applySessionType(sessionType: SessionType) {
    const preset = buildPreset(sessionType)
    setWorkout((prev) => ({
      ...prev,
      sessionType,
      title: prev.title.trim() ? prev.title : preset.title,
      sportType: preset.sportType,
      structure: preset.structure,
    }))
  }

  function updateStructure(section: 'warmup' | 'mainSet' | 'cooldown', blocks: BuilderWorkout['structure']['warmup']) {
    setWorkout((prev) => ({
      ...prev,
      structure: { ...prev.structure, [section]: blocks },
    }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 pb-24 pt-2 sm:px-4 sm:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton variant="link" fallbackHref={fallbackHref} className="px-0" />
          <h1 className="mt-1 text-xl font-bold">
            {mode === 'workout' ? 'Workout builder' : 'Template builder'}
          </h1>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {isPending && 'Saving…'}
          {!isPending && savedAt && `Saved ${formatDistanceToNow(savedAt, { addSuffix: true })}`}
          {!isPending && !savedAt && canAutosave && 'Unsaved changes'}
          {saveError && <p className="text-red-500">{saveError}</p>}
        </div>
      </div>

      <section className="card-elevated space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">Workout name</span>
          <input
            value={workout.title}
            onChange={(e) => setWorkout((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Tuesday intervals"
            className="input-field mt-1"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Sport</span>
            <select
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
                    title: p.title.trim() ? p.title : preset.title,
                    structure: options.includes(p.sessionType) ? p.structure : preset.structure,
                  }
                })
              }}
              className="input-field mt-1"
            >
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORKOUT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Workout type</span>
            <select
              value={workout.sessionType}
              onChange={(e) => applySessionType(e.target.value as SessionType)}
              className="input-field mt-1"
            >
              {sessionTypesForSport(workout.sportType).map((t) => (
                <option key={t} value={t}>
                  {getSessionTypeLabel(t, workout.sportType)}
                </option>
              ))}
            </select>
          </label>

          {mode === 'workout' && (
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted-foreground">Scheduled date</span>
              <input
                type="date"
                value={workout.scheduledDate ?? ''}
                onChange={(e) =>
                  setWorkout((p) => ({ ...p, scheduledDate: e.target.value }))
                }
                className="input-field mt-1 w-full sm:max-w-xs"
              />
            </label>
          )}

          <label className="block text-sm sm:col-span-2">
            <span className="text-muted-foreground">Tags (comma separated)</span>
            <input
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
              className="input-field mt-1"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-muted/40">
            ~{estimatedDuration} min
          </Badge>
          {workout.tags.map((tag) => (
            <Badge key={tag} className="bg-brand-soft text-brand">
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <WorkoutSectionPanel
        title="Warm-up"
        section="warmup"
        blocks={workout.structure.warmup}
        onChange={(blocks) => updateStructure('warmup', blocks)}
        allowedTypes={['CONTINUOUS', 'REPETITION', 'FREE_TEXT']}
      />

      <WorkoutSectionPanel
        title="Main set"
        section="mainSet"
        blocks={workout.structure.mainSet}
        onChange={(blocks) => updateStructure('mainSet', blocks)}
        allowedTypes={['CONTINUOUS', 'INTERVAL', 'REPETITION', 'FREE_TEXT', 'RECOVERY']}
      />

      <WorkoutSectionPanel
        title="Cool-down"
        section="cooldown"
        blocks={workout.structure.cooldown}
        onChange={(blocks) => updateStructure('cooldown', blocks)}
        allowedTypes={['CONTINUOUS', 'FREE_TEXT', 'RECOVERY']}
        defaultCollapsed
      />

      <section className="card-elevated p-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">Coach notes</span>
          <textarea
            value={workout.structure.coachNotes ?? ''}
            onChange={(e) =>
              setWorkout((p) => ({
                ...p,
                structure: { ...p.structure, coachNotes: e.target.value },
              }))
            }
            rows={3}
            className="input-field mt-1"
            placeholder="Notes visible to the athlete"
          />
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
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
    </div>
  )
}
