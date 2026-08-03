'use client'

import { useState } from 'react'
import { BookmarkPlus, Plus, Save } from 'lucide-react'
import { RaceIntent } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRace } from '@/app/actions/workouts'
import { RaceDetailsFields } from '@/components/races/race-details-fields'

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
  const isWatching = defaultIntent === RaceIntent.WATCHING

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {isWatching ? 'Add to watchlist' : 'Add race'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isWatching
            ? 'Track a race you might join last-minute — it won’t appear on your training plan.'
            : 'Pick a sport, distance, and date for your target event.'}
        </DialogDescription>

        <form
          action={async (formData) => {
            await createRace(formData)
            onOpenChange(false)
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {athleteId ? <input type="hidden" name="athleteId" value={athleteId} /> : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {open ? (
              <RaceDetailsFields
                key={`${defaultIntent}-${open}`}
                lockedIntent={defaultIntent}
                showIntent={false}
                showSummary
                heroFlush
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" size="sm">
              <Save className="h-3.5 w-3.5" />
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
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
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
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
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
