'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  PreferenceZoneList,
  PreferenceZoneRow,
  PREFERENCE_VALUE_INPUT_CLASS,
} from '@/components/settings/preference-zone-row'
import {
  BIKE_ZONE_ROWS,
  wattsFromFtpPercent,
  type AthletePreferences,
  type BikePowerZoneKey,
} from '@/lib/athlete-preferences'
import { updateBikeSpeedZones } from '@/app/actions/preferences'
import {
  usePreferenceForm,
  type PreferenceFormSaveApi,
} from '@/hooks/use-preference-form'
import { cn } from '@/lib/utils'

type BikeSpeedZonesFormProps = {
  preferences: AthletePreferences
  onDirtyChange?: (dirty: boolean) => void
  registerSave?: (api: PreferenceFormSaveApi | null) => void
}

function formatBikeSpeed(value: number | null | undefined): string {
  if (value == null || value <= 0) return ''
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function formatWatts(value: number | null | undefined): string {
  if (value == null || value <= 0) return ''
  return String(Math.round(value))
}

function parseWattsInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function initialPowerDraft(
  preferences: AthletePreferences,
): Record<BikePowerZoneKey, string> {
  const draft = {} as Record<BikePowerZoneKey, string>
  for (const { power } of BIKE_ZONE_ROWS) {
    draft[power.key] = formatWatts(preferences[power.key])
  }
  return draft
}

export function BikeSpeedZonesForm({
  preferences,
  onDirtyChange,
  registerSave,
}: BikeSpeedZonesFormProps) {
  const [ftpDraft, setFtpDraft] = useState(() => formatWatts(preferences.bikeFtpWatts))
  const [powerDraft, setPowerDraft] = useState(() => initialPowerDraft(preferences))
  const { formRef, error, saved, isPending, markDirty, handleSubmit } = usePreferenceForm(
    updateBikeSpeedZones,
    { errorFallback: 'Could not save bike settings.', onDirtyChange, registerSave },
  )

  const ftp = parseWattsInput(ftpDraft)

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={markDirty}
      className="space-y-4"
    >
      <PreferenceZoneList>
        <PreferenceZoneRow label="FTP" hint="Functional Threshold Power" unit="W">
          <Input
            name="bikeFtpWatts"
            type="number"
            min={50}
            max={600}
            inputMode="numeric"
            placeholder="250"
            value={ftpDraft}
            onChange={(e) => {
              setFtpDraft(e.target.value)
              markDirty()
            }}
            variant="ghost"
            align="right"
            aria-label="FTP watts"
            className={PREFERENCE_VALUE_INPUT_CLASS}
          />
        </PreferenceZoneRow>
      </PreferenceZoneList>

      <PreferenceZoneList>
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-4 sm:px-4">
          <span className="min-w-0 flex-1">Intensity</span>
          <span className="w-[5.75rem] text-right sm:w-[6.5rem]">km/h</span>
          <span className="w-[5.75rem] text-right sm:w-[6.5rem]">W</span>
        </div>
        {BIKE_ZONE_ROWS.map(({ label, speed, power }) => {
          const speedValue = preferences[speed.key]
          const entered = powerDraft[power.key]
          const isEntered = entered.trim().length > 0
          const suggested =
            ftp != null && ftp > 0
              ? wattsFromFtpPercent(ftp, power.ftpPercentHint)
              : null
          const displayValue = isEntered ? entered : ''
          const placeholder =
            !isEntered && suggested != null && suggested > 0
              ? String(suggested)
              : '—'

          return (
            <PreferenceZoneRow key={speed.key} label={label}>
              <div className="flex items-baseline gap-3 sm:gap-4">
                <Input
                  name={speed.name}
                  type="text"
                  inputMode="decimal"
                  placeholder="28.0"
                  defaultValue={formatBikeSpeed(speedValue)}
                  variant="ghost"
                  align="right"
                  aria-label={`${label} speed`}
                  className={PREFERENCE_VALUE_INPUT_CLASS}
                />
                <Input
                  name={power.name}
                  type="number"
                  min={30}
                  max={800}
                  inputMode="numeric"
                  placeholder={placeholder}
                  value={displayValue}
                  onChange={(e) => {
                    setPowerDraft((prev) => ({ ...prev, [power.key]: e.target.value }))
                    markDirty()
                  }}
                  variant="ghost"
                  align="right"
                  aria-label={`${label} watts`}
                  title={
                    !isEntered && suggested != null
                      ? `Estimated ${power.ftpPercentHint}% of FTP — enter to override`
                      : undefined
                  }
                  className={cn(
                    PREFERENCE_VALUE_INPUT_CLASS,
                    'placeholder:text-muted-foreground/45',
                  )}
                />
              </div>
            </PreferenceZoneRow>
          )
        })}
      </PreferenceZoneList>

      <div className="space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Speed (km/h)</span> — used to
          auto-estimate distance and duration when planning bike workouts.
        </p>
        <p>
          <span className="font-semibold text-foreground">Watts (W)</span> — used when sessions
          are planned by power and intensity. Empty zones show a gray estimate from %FTP —
          enter a value to override.
        </p>
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">Bike settings saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save bike settings'}
      </Button>
    </form>
  )
}
