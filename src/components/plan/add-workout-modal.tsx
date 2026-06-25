'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { SessionType, WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WorkoutBlockBuilder } from '@/components/plan/workout-block-builder'
import {
  createWorkoutFromModal,
  getCoachTemplatesForPicker,
  type WorkoutTemplatePickerItem,
} from '@/app/actions/workout-builder'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  createDefaultStructuredWorkout,
  defaultWorkoutTitle,
  isDefaultWorkoutTitle,
} from '@/lib/workout-builder/default-structure'
import {
  getSessionTypeLabel,
  isSimpleSessionType,
  sessionTypesForSport,
} from '@/lib/workout-builder/session-modes'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { emptyStructure, parseStructure } from '@/lib/workout-builder/utils'

const WORKOUT_TYPES = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]

type AddWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  sport?: WorkoutType
}

export function AddWorkoutModal({ open, onOpenChange, date, sport }: AddWorkoutModalProps) {
  const sportLabel = sport ? WORKOUT_TYPE_LABELS[sport] : null
  const [sportType, setSportType] = useState<WorkoutType>(sport ?? WorkoutType.RUN)
  const [title, setTitle] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.EASY_RUN)
  const [plannedDistance, setPlannedDistance] = useState<string>('')
  const [plannedDuration, setPlannedDuration] = useState<string>('')
  const [coachNotes, setCoachNotes] = useState('')
  const [structure, setStructure] = useState<WorkoutStructure>(emptyStructure())
  const [templates, setTemplates] = useState<WorkoutTemplatePickerItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isPending, startTransition] = useTransition()
  const titleCustomizedRef = useRef(false)

  const isSimple = isSimpleSessionType(sessionType)
  const sessionOptions = sessionTypesForSport(sportType)
  const defaultTitle = defaultWorkoutTitle(sessionType, sportType)
  const visibleTemplates = sport
    ? templates.filter((t) => t.type === sport)
    : templates

  useEffect(() => {
    if (!open) return
    const initialSport = sport ?? WorkoutType.RUN
    const initialSession = SessionType.EASY_RUN
    setSportType(initialSport)
    setSessionType(initialSession)
    setTitle(defaultWorkoutTitle(initialSession, initialSport))
    titleCustomizedRef.current = false
    setPlannedDistance('')
    setPlannedDuration('')
    setCoachNotes('')
    setStructure(emptyStructure())
    setSelectedTemplateId('')
    getCoachTemplatesForPicker().then(setTemplates).catch(() => setTemplates([]))
  }, [open, sport])

  function syncTitleIfDefault(nextSession: SessionType, nextSport: WorkoutType) {
    if (!titleCustomizedRef.current) {
      setTitle(defaultWorkoutTitle(nextSession, nextSport))
    }
  }

  function applyTemplate(template: WorkoutTemplatePickerItem) {
    setSportType(template.type)
    setSessionType(template.sessionType)
    setTitle(template.title)
    titleCustomizedRef.current = true
    setPlannedDistance(template.distanceKm != null ? String(template.distanceKm) : '')
    setPlannedDuration(template.durationMin != null ? String(template.durationMin) : '')
    setCoachNotes(template.notes ?? '')
    if (template.structure) {
      setStructure(parseStructure(template.structure))
    } else if (!isSimpleSessionType(template.sessionType)) {
      setStructure(createDefaultStructuredWorkout(template.sessionType))
    } else {
      setStructure(emptyStructure())
    }
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const template = templates.find((t) => t.id === templateId)
    if (template) applyTemplate(template)
  }

  function handleSportChange(next: WorkoutType) {
    const options = sessionTypesForSport(next)
    let nextSession = sessionType
    if (!options.includes(sessionType)) {
      nextSession = options[0]
      setSessionType(nextSession)
      if (!isSimpleSessionType(nextSession)) {
        setStructure(createDefaultStructuredWorkout(nextSession))
      }
    }
    setSportType(next)
    setSelectedTemplateId('')
    syncTitleIfDefault(nextSession, next)
  }

  function handleSessionTypeChange(next: SessionType) {
    const prevDefault = defaultWorkoutTitle(sessionType, sportType)
    if (title.trim() === prevDefault || !titleCustomizedRef.current) {
      titleCustomizedRef.current = false
      setTitle(defaultWorkoutTitle(next, sportType))
    }
    setSessionType(next)
    if (!isSimpleSessionType(next)) {
      setStructure(createDefaultStructuredWorkout(next))
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    titleCustomizedRef.current = !isDefaultWorkoutTitle(value, sessionType, sportType)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalTitle = title.trim() || defaultWorkoutTitle(sessionType, sportType)
    startTransition(async () => {
      await createWorkoutFromModal({
        title: finalTitle,
        sportType,
        sessionType,
        scheduledDate: date,
        plannedDistance: plannedDistance ? parseFloat(plannedDistance) : undefined,
        plannedDuration: plannedDuration ? parseInt(plannedDuration, 10) : undefined,
        coachNotes: coachNotes.trim() || undefined,
        structure: isSimple ? undefined : { ...structure, coachNotes: coachNotes.trim() || structure.coachNotes },
        templateId: selectedTemplateId || undefined,
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sportLabel ? `Add ${sportLabel} workout` : 'Add workout'}
          </DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-3">
          {visibleTemplates.length > 0 && (
            <label className="block text-sm">
              <span className="text-muted-foreground">Start from template</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input-field mt-1"
              >
                <option value="">None — build from scratch</option>
                {visibleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!sport ? (
            <label className="block text-sm">
              <span className="text-muted-foreground">Sport</span>
              <select
                value={sportType}
                onChange={(e) => handleSportChange(e.target.value as WorkoutType)}
                className="input-field mt-1"
              >
                {WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORKOUT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-muted-foreground">Workout type</span>
            <select
              value={sessionType}
              onChange={(e) => handleSessionTypeChange(e.target.value as SessionType)}
              className="input-field mt-1"
            >
              {sessionOptions.map((t) => (
                <option key={t} value={t}>
                  {getSessionTypeLabel(t, sportType)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Workout name</span>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={defaultTitle}
              required
              autoFocus={visibleTemplates.length === 0}
              className="input-field mt-1"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Defaults to workout type ({defaultTitle}). Edit to use a custom name.
            </span>
          </label>

          {isSimple ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Distance (km)</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    placeholder="Optional"
                    className="input-field mt-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Duration (min)</span>
                  <input
                    type="number"
                    min={0}
                    value={plannedDuration}
                    onChange={(e) => setPlannedDuration(e.target.value)}
                    placeholder="Optional"
                    className="input-field mt-1"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-muted-foreground">Coach comment</span>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes for the athlete"
                  className="input-field mt-1"
                />
              </label>
            </>
          ) : (
            <>
              <WorkoutBlockBuilder structure={structure} onChange={setStructure} />
              <label className="block text-sm">
                <span className="text-muted-foreground">Coach comment</span>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes for the athlete"
                  className="input-field mt-1"
                />
              </label>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Add to plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
