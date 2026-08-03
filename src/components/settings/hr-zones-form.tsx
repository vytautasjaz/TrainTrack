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
import { HR_ZONE_FIELDS, type AthletePreferences } from '@/lib/athlete-preferences'
import { updateHrZones } from '@/app/actions/preferences'
import {
  usePreferenceForm,
  type PreferenceFormSaveApi,
} from '@/hooks/use-preference-form'

type HrZonesFormProps = {
  preferences: AthletePreferences
  onDirtyChange?: (dirty: boolean) => void
  registerSave?: (api: PreferenceFormSaveApi | null) => void
}

export function HrZonesForm({
  preferences,
  onDirtyChange,
  registerSave,
}: HrZonesFormProps) {
  const { formRef, error, saved, isPending, markDirty, handleSubmit } = usePreferenceForm(
    updateHrZones,
    { errorFallback: 'Could not save HR zones.', onDirtyChange, registerSave },
  )

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={markDirty}
      className="space-y-4"
    >
      <PreferenceZoneList>
        {HR_ZONE_FIELDS.map(({ key, name, label, placeholder }) => (
          <PreferenceZoneRow key={key} label={label} unit="bpm">
            <Input
              name={name}
              type="number"
              min={1}
              max={250}
              placeholder={placeholder}
              defaultValue={preferences[key] ?? ''}
              variant="ghost"
              align="right"
              aria-label={label}
              className={PREFERENCE_VALUE_INPUT_CLASS}
            />
          </PreferenceZoneRow>
        ))}
      </PreferenceZoneList>
      <Caption>
        Resting and max HR, then the upper limit (bpm) for each zone. Zone 5 is everything above Z4
        up to max HR.
      </Caption>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">HR zones saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save HR zones'}
      </Button>
    </form>
  )
}
