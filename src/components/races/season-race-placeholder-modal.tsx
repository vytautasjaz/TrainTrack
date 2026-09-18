'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  RacePriority,
  RaceType,
  WorkoutType,
} from '@prisma/client'
import { Flag } from 'lucide-react'
import { createSeasonRacePlaceholder } from '@/app/actions/races'
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
import { DateField } from '@/components/ui/date-field'
import {
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { todayDateKey } from '@/lib/dates'
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

type SeasonRacePlaceholderModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId?: string
  defaultDate?: string
}

export function SeasonRacePlaceholderModal({
  open,
  onOpenChange,
  athleteId,
  defaultDate,
}: SeasonRacePlaceholderModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState(defaultDate ?? todayDateKey())
  const [type, setType] = useState<RaceType>(RaceType.HALF_MARATHON)
  const [sport, setSport] = useState<WorkoutType>(WorkoutType.RUN)
  const [priority, setPriority] = useState<RacePriority>(RacePriority.A)
  const [location, setLocation] = useState('')
  const [goal, setGoal] = useState('')
  const [intent, setIntent] = useState<'WATCHING' | 'PLANNED'>('WATCHING')

  useEffect(() => {
    if (!open) return
    setName('')
    setDate(defaultDate ?? todayDateKey())
    setType(RaceType.HALF_MARATHON)
    setSport(WorkoutType.RUN)
    setPriority(RacePriority.A)
    setLocation('')
    setGoal('')
    setIntent('WATCHING')
    setError(null)
  }, [open, defaultDate])

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await createSeasonRacePlaceholder({
          athleteId,
          name,
          date,
          type,
          sport,
          priority,
          location: location || null,
          goal: goal || null,
          intent,
        })
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save race')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            Add race placeholder
          </DialogTitle>
          <DialogDescription>
            Quick marker on the season board. Expand details later, or promote
            to a planned race when you commit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring half"
              autoFocus
            />
          </FormField>
          <FormField label="Date">
            <DateField value={date} onChange={setDate} />
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
          <FormField label="Status">
            <div className="flex gap-1.5">
              {(
                [
                  { id: 'WATCHING' as const, label: 'Placeholder' },
                  { id: 'PLANNED' as const, label: 'Planned' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIntent(opt.id)}
                  className={cn(
                    'flex-1 rounded-[6px] border px-2 py-1.5 text-xs font-semibold transition-colors',
                    intent === opt.id
                      ? opt.id === 'WATCHING'
                        ? 'border-zinc-400 bg-zinc-100 text-zinc-800'
                        : 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
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

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
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
            disabled={pending || !name.trim() || !date}
            onClick={save}
          >
            {pending ? 'Saving…' : 'Add placeholder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
