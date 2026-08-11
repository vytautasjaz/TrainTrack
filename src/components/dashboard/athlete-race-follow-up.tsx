'use client'

import { useState, useTransition } from 'react'
import { RaceOutcome, RaceType } from '@prisma/client'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { logRaceOutcome } from '@/app/actions/workouts'
import { RaceLegsResultFields } from '@/components/races/race-legs-fields'
import { RaceStravaLinkPicker } from '@/components/races/race-strava-link-picker'
import { PersonalBestUpdateModal } from '@/components/races/personal-best-update-modal'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { raceUsesLegs, type RaceLegView } from '@/lib/race-legs'
import type { PersonalBestSuggestion } from '@/lib/personal-bests'
import { cn } from '@/lib/utils'

export type PendingRaceFollowUp = {
  id: string
  name: string
  date: Date | string
  location: string | null
  type: keyof typeof RACE_TYPE_LABELS
  goal: string | null
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
  legs?: RaceLegView[]
}

type AthleteRaceFollowUpProps = {
  races: PendingRaceFollowUp[]
  className?: string
}

type OutcomeChoice = 'FINISHED' | 'DID_NOT_START' | 'DNF'

export function AthleteRaceFollowUp({ races, className }: AthleteRaceFollowUpProps) {
  const [pbSuggestion, setPbSuggestion] = useState<PersonalBestSuggestion | null>(null)
  const [pbOpen, setPbOpen] = useState(false)

  if (races.length === 0) return null

  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-lg font-semibold leading-tight tracking-tight">How did it go?</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Log a result, link Strava, and for triathlon add splits — or dismiss to skip
        </p>
      </div>
      <div className="space-y-3">
        {races.map((race) => (
          <RaceFollowUpCard
            key={race.id}
            race={race}
            onPbSuggestion={(suggestion) => {
              setPbSuggestion(suggestion)
              setPbOpen(true)
            }}
          />
        ))}
      </div>
      <PersonalBestUpdateModal
        suggestion={pbSuggestion}
        open={pbOpen}
        onOpenChange={setPbOpen}
      />
    </section>
  )
}

function RaceFollowUpCard({
  race,
  onPbSuggestion,
}: {
  race: PendingRaceFollowUp
  onPbSuggestion: (suggestion: PersonalBestSuggestion) => void
}) {
  const [choice, setChoice] = useState<OutcomeChoice>('FINISHED')
  const [pending, startTransition] = useTransition()
  const isTri = raceUsesLegs(race.type as RaceType)
  const legs = race.legs ?? []

  const dateLabel = new Date(race.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await logRaceOutcome(formData)
      if (result?.pbSuggestion) {
        onPbSuggestion(result.pbSuggestion)
      }
    })
  }

  return (
    <div className="rounded-[6px] border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
          <Flag className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{race.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dateLabel}
            {' · '}
            {RACE_TYPE_LABELS[race.type]}
            {race.location ? ` · ${race.location}` : ''}
          </p>
          {race.goal && (
            <p className="mt-1 text-xs text-muted-foreground">Goal: {race.goal}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            ['FINISHED', 'Finished'],
            ['DID_NOT_START', 'Did not start'],
            ['DNF', 'DNF'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            className={cn(
              'rounded-[6px] border px-2.5 py-1 text-xs font-medium transition',
              choice === value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={submit} className="mt-4 space-y-3">
        <input type="hidden" name="raceId" value={race.id} />
        <input type="hidden" name="outcome" value={choice} />

        {choice === 'FINISHED' && (
          <FormField label="Overall result" hint="e.g. 3:27:16">
            <Input name="resultTime" placeholder="3:27:16" autoComplete="off" />
          </FormField>
        )}

        {choice !== 'DID_NOT_START' && !isTri ? (
          <div className="rounded-[6px] border border-border/60 bg-muted/15 px-3 py-2.5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Strava activity</p>
            <RaceStravaLinkPicker
              raceId={race.id}
              linkedUrl={race.stravaActivityUrl}
              linkedName={race.stravaActivityName}
            />
          </div>
        ) : null}

        {choice !== 'DID_NOT_START' && isTri && legs.length > 0 ? (
          <RaceLegsResultFields raceId={race.id} legs={legs} />
        ) : null}

        {choice !== 'DID_NOT_START' && (
          <FormField
            label="Notes"
            hint={choice === 'FINISHED' ? 'Optional short reflection' : 'Optional'}
          >
            <Textarea
              name="resultNotes"
              rows={2}
              placeholder={
                choice === 'FINISHED'
                  ? 'How did it feel? What went well?'
                  : 'What happened?'
              }
            />
          </FormField>
        )}

        {choice === 'DID_NOT_START' && (
          <FormField label="Notes" hint="Optional">
            <Textarea name="resultNotes" rows={2} placeholder="Why didn’t you start?" />
          </FormField>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            type="submit"
            formAction={(formData) => {
              formData.set('outcome', RaceOutcome.DISMISSED)
              submit(formData)
            }}
            variant="ghost"
            size="sm"
            disabled={pending}
          >
            Dismiss
          </Button>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
