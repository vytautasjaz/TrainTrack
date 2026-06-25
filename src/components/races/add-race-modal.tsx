'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { RaceType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRace } from '@/app/actions/workouts'
import { RACE_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { RACE_SPORT_OPTIONS, defaultSportForRaceType } from '@/lib/races'

const RACE_TYPES = Object.keys(RACE_TYPE_LABELS) as RaceType[]

type AddRaceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId?: string
}

export function AddRaceModal({ open, onOpenChange, athleteId }: AddRaceModalProps) {
  const [raceType, setRaceType] = useState<RaceType>(RaceType.MARATHON)
  const defaultSport = defaultSportForRaceType(raceType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add race</DialogTitle>
          <DialogDescription>Schedule a target event on your calendar.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createRace(formData)
            onOpenChange(false)
          }}
          className="space-y-3"
        >
          {athleteId && <input type="hidden" name="athleteId" value={athleteId} />}
          <label className="block text-sm">
            <span className="text-muted-foreground">Race name</span>
            <input
              name="name"
              placeholder="e.g. Berlin Marathon"
              required
              autoFocus
              className="input-field mt-1"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Date</span>
              <input name="date" type="date" required className="input-field mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Type</span>
              <select
                name="type"
                required
                value={raceType}
                onChange={(e) => setRaceType(e.target.value as RaceType)}
                className="input-field mt-1"
              >
                {RACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RACE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted-foreground">Sport on calendar</span>
            <select name="sport" required defaultValue={defaultSport} key={defaultSport} className="input-field mt-1">
              {RACE_SPORT_OPTIONS.map((sport) => (
                <option key={sport} value={sport}>
                  {WORKOUT_TYPE_LABELS[sport]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Which plan row this race appears in.
            </span>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Location</span>
            <input name="location" placeholder="Optional" className="input-field mt-1" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Goal</span>
            <input name="goal" placeholder="e.g. Sub 3:30" className="input-field mt-1" />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm">
              Save race
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type AddRaceButtonProps = {
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'default'
  className?: string
  athleteId?: string
}

export function AddRaceButton({
  variant = 'ghost',
  size = 'sm',
  className,
  athleteId,
}: AddRaceButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add race
      </Button>
      <AddRaceModal open={open} onOpenChange={setOpen} athleteId={athleteId} />
    </>
  )
}
