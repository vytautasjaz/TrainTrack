'use client'

import type { AthleteStatus } from '@prisma/client'
import { switchAthlete } from '@/app/actions/session'
import { Select } from '@/components/ui/select'
import { Caption } from '@/components/ui/typography'
import { athleteStatusLabel } from '@/lib/athlete-status'

type CoachAthleteSelectProps = {
  athletes: { id: string; name: string; status: AthleteStatus }[]
  selectedAthleteId: string
  redirectTo: string
}

export function CoachAthleteSelect({
  athletes,
  selectedAthleteId,
  redirectTo,
}: CoachAthleteSelectProps) {
  if (athletes.length === 0) return null

  return (
    <form action={switchAthlete} className="flex items-center gap-2">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="flex items-center gap-2 text-caption">
        <span className="hidden sm:inline">Athlete</span>
        <Select
          name="athleteId"
          defaultValue={selectedAthleteId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="max-w-[11rem] py-1.5 text-caption sm:max-w-[14rem]"
          aria-label="Select athlete"
        >
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
              {athlete.status !== 'ACTIVE' ? ` (${athleteStatusLabel(athlete.status)})` : ''}
            </option>
          ))}
        </Select>
      </label>
    </form>
  )
}
