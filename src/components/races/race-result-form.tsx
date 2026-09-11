'use client'

import { useState, useTransition } from 'react'
import { RaceOutcome, type RaceType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { logRaceOutcome } from '@/app/actions/workouts'
import { RaceLegsResultFields } from '@/components/races/race-legs-fields'
import { PersonalBestUpdateModal } from '@/components/races/personal-best-update-modal'
import { raceUsesLegs, type RaceLegView } from '@/lib/race-legs'
import type { PersonalBestSuggestion } from '@/lib/personal-bests'

type RaceResultFormProps = {
  raceId: string
  raceType: RaceType
  outcome: RaceOutcome | null
  resultTime: string | null
  resultPlace: string | null
  resultPlaceGender: string | null
  resultPlaceAg: string | null
  resultNotes: string | null
  legs: RaceLegView[]
  allowStravaLink: boolean
}

export function RaceResultForm({
  raceId,
  raceType,
  outcome,
  resultTime,
  resultPlace,
  resultPlaceGender,
  resultPlaceAg,
  resultNotes,
  legs,
  allowStravaLink,
}: RaceResultFormProps) {
  const [pending, startTransition] = useTransition()
  const [pbSuggestion, setPbSuggestion] = useState<PersonalBestSuggestion | null>(null)
  const [pbOpen, setPbOpen] = useState(false)

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await logRaceOutcome(formData)
      if (result?.pbSuggestion) {
        setPbSuggestion(result.pbSuggestion)
        setPbOpen(true)
      }
    })
  }

  return (
    <>
      <form action={submit} className="space-y-3">
        <input type="hidden" name="raceId" value={raceId} />
        <FormField label="Outcome">
          <Select
            name="outcome"
            defaultValue={
              outcome && outcome !== RaceOutcome.DISMISSED ? outcome : RaceOutcome.FINISHED
            }
            required
          >
            <option value={RaceOutcome.FINISHED}>Finished</option>
            <option value={RaceOutcome.DID_NOT_START}>Did not start</option>
            <option value={RaceOutcome.DNF}>DNF</option>
          </Select>
        </FormField>
        <FormField label="Finish time" hint="e.g. 3:27:16">
          <Input
            name="resultTime"
            defaultValue={resultTime ?? ''}
            placeholder="3:27:16"
            autoComplete="off"
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Place overall" hint="Optional">
            <Input
              name="resultPlace"
              defaultValue={resultPlace ?? ''}
              placeholder="12th"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Place by gender" hint="Optional">
            <Input
              name="resultPlaceGender"
              defaultValue={resultPlaceGender ?? ''}
              placeholder="4th"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Place AG" hint="Optional">
            <Input
              name="resultPlaceAg"
              defaultValue={resultPlaceAg ?? ''}
              placeholder="2nd"
              autoComplete="off"
            />
          </FormField>
        </div>
        {raceUsesLegs(raceType) && legs.length > 0 ? (
          <RaceLegsResultFields
            raceId={raceId}
            legs={legs}
            allowStravaLink={allowStravaLink}
          />
        ) : null}
        <FormField label="Feedback" hint="Optional">
          <Input
            name="resultNotes"
            defaultValue={resultNotes ?? ''}
            placeholder="How did the race go?"
          />
        </FormField>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save result'}
        </Button>
      </form>

      <PersonalBestUpdateModal
        suggestion={pbSuggestion}
        open={pbOpen}
        onOpenChange={setPbOpen}
      />
    </>
  )
}
