'use client'

import { useState } from 'react'
import { BookmarkPlus, Plus } from 'lucide-react'
import { RaceIntent, RacePriority, RaceType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRace } from '@/app/actions/workouts'
import {
  RACE_INTENT_LABELS,
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { RACE_SPORT_OPTIONS, defaultSportForRaceType } from '@/lib/races'

const RACE_TYPES = Object.keys(RACE_TYPE_LABELS) as RaceType[]
const RACE_PRIORITIES = Object.keys(RACE_PRIORITY_LABELS) as RacePriority[]

type AddRaceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId?: string
  defaultIntent?: RaceIntent
}

export function AddRaceModal({
  open,
  onOpenChange,
  athleteId,
  defaultIntent = RaceIntent.PLANNED,
}: AddRaceModalProps) {
  const [raceType, setRaceType] = useState<RaceType>(RaceType.MARATHON)
  const [intent, setIntent] = useState<RaceIntent>(defaultIntent)
  const defaultSport = defaultSportForRaceType(raceType)
  const isWatching = intent === RaceIntent.WATCHING

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (next) setIntent(defaultIntent)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isWatching ? 'Add to watchlist' : 'Add race'}</DialogTitle>
          <DialogDescription>
            {isWatching
              ? 'Track a race you might join last-minute — it won’t appear on your training plan.'
              : 'Schedule a target event on your calendar.'}
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createRace(formData)
            onOpenChange(false)
          }}
          className="space-y-3"
        >
          {athleteId && <input type="hidden" name="athleteId" value={athleteId} />}
          <FormField label="Race name">
            <Input name="name" placeholder="e.g. Berlin Marathon" required autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <Input name="date" type="date" required />
            </FormField>
            <FormField label="Type">
              <Select
                name="type"
                required
                value={raceType}
                onChange={(e) => setRaceType(e.target.value as RaceType)}
              >
                {RACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RACE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Intent">
            <Select
              name="intent"
              required
              value={intent}
              onChange={(e) => setIntent(e.target.value as RaceIntent)}
            >
              <option value={RaceIntent.PLANNED}>{RACE_INTENT_LABELS.PLANNED}</option>
              <option value={RaceIntent.WATCHING}>{RACE_INTENT_LABELS.WATCHING}</option>
            </Select>
          </FormField>
          {!isWatching && (
            <FormField
              label="Sport on calendar"
              hint="Which plan row this race appears in."
            >
              <Select name="sport" required defaultValue={defaultSport} key={defaultSport}>
                {RACE_SPORT_OPTIONS.map((sport) => (
                  <option key={sport} value={sport}>
                    {WORKOUT_TYPE_LABELS[sport]}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {isWatching && (
            <input type="hidden" name="sport" value={defaultSport} />
          )}
          <div className="grid grid-cols-2 gap-3">
            {!isWatching ? (
              <FormField label="Priority">
                <Select name="priority" defaultValue={RacePriority.C} required>
                  {RACE_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority} — {RACE_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <input type="hidden" name="priority" value={RacePriority.C} />
            )}
            <FormField label="Location" className={isWatching ? 'col-span-2' : undefined}>
              <Input name="location" placeholder="Optional" />
            </FormField>
          </div>
          {!isWatching && (
            <FormField label="Goal">
              <Input name="goal" placeholder="e.g. Sub 3:30" />
            </FormField>
          )}
          <FormField
            label="Link"
            hint={isWatching ? 'Registration or race info URL' : 'Optional'}
          >
            <Input name="url" type="url" placeholder="https://" />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm">
              {isWatching ? 'Save to watchlist' : 'Save race'}
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
      <AddRaceModal
        open={open}
        onOpenChange={setOpen}
        athleteId={athleteId}
        defaultIntent={RaceIntent.PLANNED}
      />
    </>
  )
}

type WatchRaceButtonProps = {
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'default'
  className?: string
  athleteId?: string
}

export function WatchRaceButton({
  variant = 'ghost',
  size = 'sm',
  className,
  athleteId,
}: WatchRaceButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <BookmarkPlus className="h-3.5 w-3.5" />
        Watch race
      </Button>
      <AddRaceModal
        open={open}
        onOpenChange={setOpen}
        athleteId={athleteId}
        defaultIntent={RaceIntent.WATCHING}
      />
    </>
  )
}
