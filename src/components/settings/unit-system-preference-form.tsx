'use client'

import { useState, useTransition } from 'react'
import {
  updateSwimDistanceUnit,
  updateUnitSystem,
} from '@/app/actions/preferences'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { FormError } from '@/components/ui/form-error'
import { SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { toUserMessage } from '@/lib/action-error'
import type { SwimDistanceUnit, UnitSystem } from '@/lib/units'
import { cn } from '@/lib/utils'

const UNIT_OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'METRIC', label: 'Metric' },
  { id: 'IMPERIAL', label: 'Imperial' },
]

const SWIM_OPTIONS: { id: SwimDistanceUnit; label: string }[] = [
  { id: 'METERS', label: 'Meters' },
  { id: 'YARDS', label: 'Yards' },
]

type UnitSystemPreferenceFormProps = {
  initial: UnitSystem
  initialSwim?: SwimDistanceUnit
  embedded?: boolean
}

export function UnitSystemPreferenceForm({
  initial,
  initialSwim = 'METERS',
  embedded = false,
}: UnitSystemPreferenceFormProps) {
  const [system, setSystem] = useState<UnitSystem>(initial)
  const [swimUnit, setSwimUnit] = useState<SwimDistanceUnit>(initialSwim)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function selectSystem(next: UnitSystem) {
    if (next === system) return
    const prev = system
    setSystem(next)
    setError(null)
    startTransition(async () => {
      try {
        setSystem(await updateUnitSystem(next))
      } catch (err) {
        setSystem(prev)
        setError(toUserMessage(err, 'Could not save units preference'))
      }
    })
  }

  function selectSwim(next: SwimDistanceUnit) {
    if (next === swimUnit) return
    const prev = swimUnit
    setSwimUnit(next)
    setError(null)
    startTransition(async () => {
      try {
        setSwimUnit(await updateSwimDistanceUnit(next))
      } catch (err) {
        setSwimUnit(prev)
        setError(toUserMessage(err, 'Could not save swim units'))
      }
    })
  }

  const unitsControl = (
    <SegmentedControl aria-label="Units" className="w-full">
      {UNIT_OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.id}
          type="button"
          active={system === opt.id}
          disabled={isPending}
          onClick={() => selectSystem(opt.id)}
          className={cn('flex-1')}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  const swimControl = (
    <SegmentedControl aria-label="Swim units" className="w-full">
      {SWIM_OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.id}
          type="button"
          active={swimUnit === opt.id}
          disabled={isPending}
          onClick={() => selectSwim(opt.id)}
          className={cn('flex-1')}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  if (embedded) {
    return (
      <>
        <SettingsPanel id="units" title="Units">
          {unitsControl}
          <FormError message={error} className="mt-2" />
        </SettingsPanel>
        <SettingsPanel id="swim-units" title="Swim">
          {swimControl}
        </SettingsPanel>
      </>
    )
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <SectionTitle>Units</SectionTitle>
        {unitsControl}
      </div>
      <div className="space-y-2">
        <SectionTitle>Swim</SectionTitle>
        {swimControl}
      </div>
      <FormError message={error} />
    </section>
  )
}
