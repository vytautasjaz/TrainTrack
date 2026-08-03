'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RaceHeroSummary } from '@/components/races/race-hero-summary'
import { RaceEditModal } from '@/components/races/race-edit-modal'
import { RaceLegsSummary } from '@/components/races/race-legs-fields'
import { deleteRace } from '@/app/actions/workouts'
import { raceUsesLegs } from '@/lib/race-legs'
import { raceOutcomeSummary, type SeasonRace } from '@/lib/season-races'
import {
  resolvePreparationWeeks,
  weeksUntilRace,
} from '@/lib/season-planner'

type RaceDetailSheetProps = {
  race: SeasonRace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after delete or successful edit so callers can refresh. */
  onChanged?: () => void
  returnTo?: string
}

export function RaceDetailSheet({
  race,
  open,
  onOpenChange,
  onChanged,
  returnTo = '/races',
}: RaceDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  if (!race) return null

  const prep = resolvePreparationWeeks(race.preparationWeeks)
  const weeks = weeksUntilRace(race.date)

  return (
    <>
      <Dialog
        open={open && !editOpen}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false)
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">{race.name}</DialogTitle>
          <DialogDescription className="sr-only">Race details</DialogDescription>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <RaceHeroSummary race={race} flush />

            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Goal
                  </p>
                  <p className="mt-1 text-sm">{race.goal?.trim() || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Preparation
                  </p>
                  <p className="mt-1 text-sm">
                    {prep == null ? '—' : `${prep} weeks`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Countdown
                  </p>
                  <p className="mt-1 text-sm">
                    {weeks < 0 ? 'Past' : weeks === 0 ? 'This week' : `${weeks} weeks`}
                  </p>
                </div>
              </div>

              {race.url ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Link
                  </p>
                  <a
                    href={race.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-sm text-brand hover:underline"
                  >
                    {race.url}
                  </a>
                </div>
              ) : null}

              {race.outcome && race.outcome !== 'DISMISSED' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Result
                    </p>
                    <p className="mt-1 text-sm">{raceOutcomeSummary(race)}</p>
                  </div>
                  {race.resultNotes?.trim() ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Report
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {race.resultNotes.trim()}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {race.stravaActivityUrl ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Strava
                  </p>
                  <a
                    href={race.stravaActivityUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-[#FC4C02] hover:underline"
                  >
                    {race.stravaActivityName || 'Open activity'}
                  </a>
                </div>
              ) : null}

              {raceUsesLegs(race.type) && race.legs && race.legs.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Splits
                  </p>
                  <RaceLegsSummary legs={race.legs} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="brand"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RaceEditModal
        race={race}
        open={editOpen}
        onOpenChange={setEditOpen}
        returnTo={returnTo}
        onSaved={() => {
          setEditOpen(false)
          onChanged?.()
          onOpenChange(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this race?"
        description={`${race.name} will be removed from your season plan.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const fd = new FormData()
            fd.set('raceId', race.id)
            await deleteRace(fd)
            setDeleteOpen(false)
            onChanged?.()
            onOpenChange(false)
          })
        }}
      />
    </>
  )
}
