'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  RacePriority,
  RaceType,
  WorkoutType,
} from '@prisma/client'
import { Flag, Trash2 } from 'lucide-react'
import {
  createTrainingPlanRacePlaceholder,
  deleteTrainingPlanRacePlaceholder,
  updateTrainingPlanRacePlaceholder,
} from '@/app/actions/training-plans'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { formatPlanSlotLabel } from '@/lib/training-plan'
import type { TrainingPlanRacePlaceholderDetail } from '@/lib/training-plan'
import { cn } from '@/lib/utils'

const RACE_TYPES = Object.keys(RACE_TYPE_LABELS) as RaceType[]
const RACE_PRIORITIES = Object.keys(RACE_PRIORITY_LABELS) as RacePriority[]
const RACE_SPORTS: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.TRIATHLON,
  WorkoutType.HYROX,
]

function defaultSportForType(type: RaceType): WorkoutType {
  switch (type) {
    case RaceType.CYCLING:
      return WorkoutType.BIKE
    case RaceType.TRIATHLON:
      return WorkoutType.TRIATHLON
    case RaceType.HYROX:
      return WorkoutType.HYROX
    default:
      return WorkoutType.RUN
  }
}

type PlanRacePlaceholderModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  weekIndex: number
  dayOfWeek: number
  race?: TrainingPlanRacePlaceholderDetail | null
}

export function PlanRacePlaceholderModal({
  open,
  onOpenChange,
  planId,
  weekIndex,
  dayOfWeek,
  race = null,
}: PlanRacePlaceholderModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(race?.name ?? '')
  const [type, setType] = useState<RaceType>(race?.type ?? RaceType.HALF_MARATHON)
  const [sport, setSport] = useState<WorkoutType>(
    race?.sport ?? defaultSportForType(race?.type ?? RaceType.HALF_MARATHON),
  )
  const [priority, setPriority] = useState<RacePriority>(
    race?.priority ?? RacePriority.A,
  )
  const [location, setLocation] = useState(race?.location ?? '')
  const [goal, setGoal] = useState(race?.goal ?? '')

  function resetFromRace(next: TrainingPlanRacePlaceholderDetail | null) {
    setName(next?.name ?? '')
    setType(next?.type ?? RaceType.HALF_MARATHON)
    setSport(
      next?.sport ??
        defaultSportForType(next?.type ?? RaceType.HALF_MARATHON),
    )
    setPriority(next?.priority ?? RacePriority.A)
    setLocation(next?.location ?? '')
    setGoal(next?.goal ?? '')
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (next) resetFromRace(race)
    onOpenChange(next)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        if (race) {
          await updateTrainingPlanRacePlaceholder({
            raceId: race.id,
            name,
            type,
            sport,
            priority,
            location: location || null,
            goal: goal || null,
          })
        } else {
          await createTrainingPlanRacePlaceholder({
            planId,
            weekIndex,
            dayOfWeek,
            name,
            type,
            sport,
            priority,
            location: location || null,
            goal: goal || null,
          })
        }
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save race')
      }
    })
  }

  function remove() {
    if (!race) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteTrainingPlanRacePlaceholder(race.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete race')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            {race ? 'Edit race placeholder' : 'Add race placeholder'}
          </DialogTitle>
          <DialogDescription>
            {formatPlanSlotLabel(weekIndex, dayOfWeek)} · placed when the plan
            is applied to an athlete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goal half marathon"
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select
                value={type}
                onChange={(e) => {
                  const next = e.target.value as RaceType
                  setType(next)
                  setSport(defaultSportForType(next))
                }}
              >
                {RACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RACE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Sport">
              <Select
                value={sport}
                onChange={(e) => setSport(e.target.value as WorkoutType)}
              >
                {RACE_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {WORKOUT_TYPE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Priority">
            <div className="flex gap-1.5">
              {RACE_PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 rounded-[6px] border px-2 py-1.5 text-xs font-semibold transition-colors',
                    priority === p
                      ? p === 'A'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : p === 'B'
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {p} · {RACE_PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Location (optional)">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City / venue"
            />
          </FormField>
          <FormField label="Goal (optional)">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Sub 1:30"
            />
          </FormField>
          <FormError message={error} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          {race ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={remove}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !name.trim()}
              onClick={save}
            >
              {pending ? 'Saving…' : race ? 'Save' : 'Add race'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
