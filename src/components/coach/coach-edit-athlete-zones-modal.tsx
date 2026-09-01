'use client'

import { useState, useTransition } from 'react'
import { updateAthleteZonesByCoach } from '@/app/actions/athletes'
import { Button } from '@/components/ui/button'
import { FormField, FormMessage, FormSection } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BIKE_SPEED_ZONE_FIELDS,
  formatPaceMinPerKm,
  formatSwimCssSecPer100m,
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { cn } from '@/lib/utils'

type ZoneTab = 'run' | 'bike' | 'swim' | 'hr'

const ZONE_TABS: Array<{ id: ZoneTab; label: string }> = [
  { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' },
  { id: 'swim', label: 'Swim' },
  { id: 'hr', label: 'HR' },
]

function formatBikeSpeed(value: number | null | undefined) {
  if (value == null || value <= 0) return ''
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function formatFtp(value: number | null | undefined) {
  if (value == null || value <= 0) return ''
  return String(Math.round(value))
}

type CoachEditAthleteZonesModalProps = {
  athlete: {
    id: string
    name: string
    preferences: AthletePreferences
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function CoachEditAthleteZonesModal({
  athlete,
  open,
  onOpenChange,
  onSaved,
}: CoachEditAthleteZonesModalProps) {
  const [tab, setTab] = useState<ZoneTab>('run')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateAthleteZonesByCoach(formData)
        onOpenChange(false)
        onSaved?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save zones.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit zones</DialogTitle>
          <DialogDescription>
            Updates {athlete.name}&apos;s training zones. They&apos;ll get an inbox message when you save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="athleteId" value={athlete.id} />

          <div
            className="grid grid-cols-4 border-b border-[var(--tt-line)]"
            role="tablist"
            aria-label="Zone type"
          >
            {ZONE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                data-active={tab === item.id ? 'true' : 'false'}
                className="tt-coach-roster-expand-tab px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition"
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={cn(tab !== 'run' && 'hidden')}>
            <FormSection title="Run paces" description="Min/km (e.g. 5:30)">
              <div className="grid gap-3 sm:grid-cols-2">
                {PACE_ZONE_FIELDS.map(({ key, name, label }) => (
                  <FormField key={key} label={label}>
                    <Input
                      name={name}
                      type="text"
                      inputMode="decimal"
                      placeholder="5:30"
                      defaultValue={formatPaceMinPerKm(athlete.preferences[key])}
                    />
                  </FormField>
                ))}
              </div>
            </FormSection>
          </div>

          <div className={cn(tab !== 'bike' && 'hidden')}>
            <FormSection title="Bike speed & FTP" description="km/h for each zone · FTP in watts">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="FTP" className="sm:col-span-2">
                  <Input
                    name="bikeFtpWatts"
                    type="number"
                    min={50}
                    max={600}
                    placeholder="250"
                    defaultValue={formatFtp(athlete.preferences.bikeFtpWatts)}
                  />
                </FormField>
                {BIKE_SPEED_ZONE_FIELDS.map(({ key, name, label }) => (
                  <FormField key={key} label={label}>
                    <Input
                      name={name}
                      type="text"
                      inputMode="decimal"
                      placeholder="28.5"
                      defaultValue={formatBikeSpeed(athlete.preferences[key])}
                    />
                  </FormField>
                ))}
              </div>
            </FormSection>
          </div>

          <div className={cn(tab !== 'swim' && 'hidden')}>
            <FormSection title="Swim CSS" description="Critical swim speed per 100 m (e.g. 1:35)">
              <FormField label="CSS">
                <Input
                  name="swimCss"
                  type="text"
                  placeholder="1:35"
                  defaultValue={formatSwimCssSecPer100m(athlete.preferences.swimCssSecPer100m)}
                />
              </FormField>
            </FormSection>
          </div>

          <div className={cn(tab !== 'hr' && 'hidden')}>
            <FormSection title="Heart rate zones" description="Bpm limits for each zone">
              <div className="grid gap-3 sm:grid-cols-2">
                {HR_ZONE_FIELDS.map(({ key, name, label, placeholder }) => (
                  <FormField key={key} label={label}>
                    <Input
                      name={name}
                      type="number"
                      min={1}
                      max={250}
                      placeholder={placeholder}
                      defaultValue={athlete.preferences[key] ?? ''}
                    />
                  </FormField>
                ))}
              </div>
            </FormSection>
          </div>

          {error ? <FormMessage variant="error">{error}</FormMessage> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save zones'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
