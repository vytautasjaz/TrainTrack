'use client'

import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  PreferenceZoneList,
  PreferenceZoneRow,
  PREFERENCE_VALUE_INPUT_CLASS,
} from '@/components/settings/preference-zone-row'
import {
  formatPaceMinPerKm,
  PACE_ZONE_FIELDS,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { updatePaceZones } from '@/app/actions/preferences'
import {
  usePreferenceForm,
  type PreferenceFormSaveApi,
} from '@/hooks/use-preference-form'

type PaceZonesFormProps = {
  preferences: AthletePreferences
  onDirtyChange?: (dirty: boolean) => void
  registerSave?: (api: PreferenceFormSaveApi | null) => void
}

export function PaceZonesForm({
  preferences,
  onDirtyChange,
  registerSave,
}: PaceZonesFormProps) {
  const { formRef, error, saved, isPending, markDirty, handleSubmit } = usePreferenceForm(
    updatePaceZones,
    { errorFallback: 'Could not save paces.', onDirtyChange, registerSave },
  )

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={markDirty}
      className="space-y-4"
    >
      <PreferenceZoneList>
        {PACE_ZONE_FIELDS.map(({ key, name, label }) => (
          <PreferenceZoneRow key={key} label={label} unit="/km">
            <Input
              name={name}
              type="text"
              inputMode="decimal"
              placeholder="5:30"
              defaultValue={formatPaceMinPerKm(preferences[key])}
              variant="ghost"
              align="right"
              aria-label={`${label} pace`}
              className={PREFERENCE_VALUE_INPUT_CLASS}
            />
          </PreferenceZoneRow>
        ))}
      </PreferenceZoneList>
      <Caption>
        Target paces as min/km (e.g. 5:30). Used to estimate workout duration from distance.
      </Caption>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">Paces saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save paces'}
      </Button>
    </form>
  )
}
