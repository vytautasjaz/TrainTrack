'use client'

import { useEffect, useState, useTransition } from 'react'
import { BookmarkPlus, ChevronDown, History, Plus, Save } from 'lucide-react'
import { RaceIntent } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRace } from '@/app/actions/workouts'
import {
  listCoachRecentRaces,
  type CoachRecentRace,
} from '@/app/actions/races'
import {
  RaceDetailsFields,
  type RaceFormInitialValues,
} from '@/components/races/race-details-fields'
import { RACE_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { toDateKeyOrEmpty } from '@/lib/dates'
import { cn } from '@/lib/utils'

function coachRecentRaceToFormInitial(row: CoachRecentRace): RaceFormInitialValues {
  return {
    name: row.name,
    date: toDateKeyOrEmpty(row.date),
    location: row.location,
    goal: row.goal,
    url: row.url,
    preparationWeeks: row.preparationWeeks,
    priority: row.priority,
    sport: row.sport,
    type: row.type,
    courseType: row.courseType,
    triathlonDistance: row.triathlonDistance,
    customDistanceKm: row.customDistanceKm,
    legs: row.legs.map((leg) => ({
      ...leg,
      resultTime: null,
      stravaActivityId: null,
      stravaActivityUrl: null,
      stravaActivityName: null,
      actualDistanceKm: null,
      actualDurationMin: null,
    })),
  }
}

function formatRaceDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type AddRaceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId?: string
  defaultIntent?: RaceIntent
  /** Prefill date as YYYY-MM-DD (e.g. from training day). */
  defaultDate?: string
}

export function AddRaceModal({
  open,
  onOpenChange,
  athleteId,
  defaultIntent = RaceIntent.PLANNED,
  defaultDate,
}: AddRaceModalProps) {
  const isWatching = defaultIntent === RaceIntent.WATCHING
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [recentRaces, setRecentRaces] = useState<CoachRecentRace[]>([])
  const [recentLoaded, setRecentLoaded] = useState(false)
  const [reuseOpen, setReuseOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<RaceFormInitialValues | undefined>(
    () => (defaultDate ? { date: defaultDate } : undefined),
  )
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (!open) return
    setError(null)
    setReuseOpen(false)
    setRecentLoaded(false)
    setRecentRaces([])
    setFormInitial(defaultDate ? { date: defaultDate } : undefined)
    setFormKey((k) => k + 1)
    let cancelled = false
    void listCoachRecentRaces()
      .then((rows) => {
        if (!cancelled) {
          setRecentRaces(rows)
          setRecentLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentRaces([])
          setRecentLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, defaultDate, defaultIntent])

  function applyReuse(row: CoachRecentRace) {
    setFormInitial(coachRecentRaceToFormInitial(row))
    setFormKey((k) => k + 1)
    setReuseOpen(false)
    setError(null)
  }

  const canReuse = recentLoaded && recentRaces.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {isWatching ? 'Add to watchlist' : 'Add race'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isWatching
            ? "Track a race you might join last-minute — it won't appear on your training plan."
            : 'Pick a sport, distance, and date for your target event.'}
        </DialogDescription>

        <form
          action={(formData) => {
            setError(null)
            const date = String(formData.get('date') ?? '').trim()
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              setError('Pick a race date.')
              return
            }
            const name = String(formData.get('name') ?? '').trim()
            if (!name) {
              setError('Race name is required.')
              return
            }
            startTransition(async () => {
              try {
                await createRace(formData)
                onOpenChange(false)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not add race')
              }
            })
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FormError message={error} className="mx-5 mt-3 sm:mx-6" />
          {athleteId ? <input type="hidden" name="athleteId" value={athleteId} /> : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {open ? (
              <RaceDetailsFields
                key={`${defaultIntent}-${formKey}`}
                initial={formInitial}
                lockedIntent={defaultIntent}
                showIntent={false}
                showSummary
                heroFlush
              />
            ) : null}

            {canReuse ? (
              <div className="space-y-2 border-t border-border/60 px-5 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground"
                  onClick={() => setReuseOpen((v) => !v)}
                  aria-expanded={reuseOpen}
                >
                  <History className="h-3.5 w-3.5" />
                  Reuse from…
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      reuseOpen && 'rotate-180',
                    )}
                  />
                </Button>

                {reuseOpen ? (
                  <div className="space-y-1.5">
                    <div className="max-h-[11.5rem] overflow-y-auto overscroll-contain rounded-[8px] border border-border">
                      <ul className="divide-y divide-border">
                        {recentRaces.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => applyReuse(row)}
                              className={cn(
                                'flex w-full flex-col gap-0.5 px-3 py-2 text-left transition',
                                'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                              )}
                            >
                              <span className="truncate text-sm font-medium text-foreground">
                                {row.name}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {formatRaceDate(row.date)}
                                {' · '}
                                {RACE_TYPE_LABELS[row.type] ??
                                  WORKOUT_TYPE_LABELS[row.sport]}
                                {' · '}
                                {row.athleteName}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Prefills this form — review date and details, then save for the
                      current athlete.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" size="sm" disabled={isPending}>
              <Save className="h-3.5 w-3.5" />
              {isPending ? 'Saving…' : isWatching ? 'Save to watchlist' : 'Save race'}
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
