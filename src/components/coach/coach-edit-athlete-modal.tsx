'use client'

import { useState, useTransition } from 'react'
import type { AthleteStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateAthleteProfileByCoach } from '@/app/actions/athletes'
import { ATHLETE_STATUS_OPTIONS } from '@/lib/athlete-status'
import {
  formatPaceMinPerKm,
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { CONFIGURABLE_PLAN_SPORTS, normalizePlanSportRows } from '@/lib/plan-sports'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { WorkoutType } from '@prisma/client'
import { cn } from '@/lib/utils'

type CoachEditAthleteModalProps = {
  athlete: {
    id: string
    name: string
    status: AthleteStatus
    preferences: AthletePreferences
    planSportRows: WorkoutType[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CoachEditAthleteModal({
  athlete,
  open,
  onOpenChange,
}: CoachEditAthleteModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateAthleteProfileByCoach(formData)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save athlete.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit athlete</DialogTitle>
          <DialogDescription>
            Status, default sport rows, training paces, and heart rate zones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="athleteId" value={athlete.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <input
                name="name"
                type="text"
                required
                maxLength={120}
                defaultValue={athlete.name}
                className="input-field"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <select name="status" defaultValue={athlete.status} className="input-field">
                {ATHLETE_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Default sport rows</p>
            <p className="text-xs text-muted-foreground">
              Sports shown in the training planner. Others can be added per week from the planner.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONFIGURABLE_PLAN_SPORTS.map((sport) => (
                <label
                  key={sport}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="planSportRows"
                    value={sport}
                    defaultChecked={normalizePlanSportRows(athlete.planSportRows).includes(sport)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', WORKOUT_TYPE_COLORS[sport])}>
                    {WORKOUT_TYPE_LABELS[sport]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Training paces</p>
            <p className="text-xs text-muted-foreground">Min/km (e.g. 5:30)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PACE_ZONE_FIELDS.map(({ key, name, label }) => (
                <label key={key} className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <input
                    name={name}
                    type="text"
                    inputMode="decimal"
                    placeholder="5:30"
                    defaultValue={formatPaceMinPerKm(athlete.preferences[key])}
                    className="input-field"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Heart rate zones</p>
            <p className="text-xs text-muted-foreground">Bpm limits for each zone</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {HR_ZONE_FIELDS.map(({ key, name, label, placeholder }) => (
                <label key={key} className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <input
                    name={name}
                    type="number"
                    min={1}
                    max={250}
                    placeholder={placeholder}
                    defaultValue={athlete.preferences[key] ?? ''}
                    className="input-field"
                  />
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
