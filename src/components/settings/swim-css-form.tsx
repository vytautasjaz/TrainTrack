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
  formatSwimCssSecPer100m,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { updateSwimCss } from '@/app/actions/preferences'
import {
  usePreferenceForm,
  type PreferenceFormSaveApi,
} from '@/hooks/use-preference-form'

type SwimCssFormProps = {
  preferences: AthletePreferences
  onDirtyChange?: (dirty: boolean) => void
  registerSave?: (api: PreferenceFormSaveApi | null) => void
}

export function SwimCssForm({
  preferences,
  onDirtyChange,
  registerSave,
}: SwimCssFormProps) {
  const { formRef, error, saved, isPending, markDirty, handleSubmit } = usePreferenceForm(
    updateSwimCss,
    { errorFallback: 'Could not save CSS.', onDirtyChange, registerSave },
  )

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={markDirty}
      className="space-y-4"
    >
      <PreferenceZoneList>
        <PreferenceZoneRow label="CSS" hint="Format m:ss — same idea as run pace" unit="/100m">
          <Input
            name="swimCss"
            type="text"
            inputMode="text"
            placeholder="1:35"
            defaultValue={formatSwimCssSecPer100m(preferences.swimCssSecPer100m)}
            variant="ghost"
            align="right"
            aria-label="Critical swim speed per 100 metres"
            className={PREFERENCE_VALUE_INPUT_CLASS}
          />
        </PreferenceZoneRow>
      </PreferenceZoneList>
      <Caption>
        Critical Swim Speed as time per 100 m (e.g. 1:35). Used to estimate swim duration from
        distance.
      </Caption>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">CSS saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save CSS'}
      </Button>
    </form>
  )
}
