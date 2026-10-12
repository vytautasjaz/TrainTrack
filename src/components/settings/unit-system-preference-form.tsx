'use client'

import { useState, useTransition } from 'react'
import {
  updateSwimDistanceUnit,
  updateUnitSystem,
} from '@/app/actions/preferences'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { FormError } from '@/components/ui/form-error'
import { Caption, SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { toUserMessage } from '@/lib/action-error'
import type { SwimDistanceUnit, UnitSystem } from '@/lib/units'
import { cn } from '@/lib/utils'

const UNIT_OPTIONS: {
  id: UnitSystem
  label: string
  hint: string
}[] = [
  {
    id: 'METRIC',
    label: 'Metric',
    hint: 'km, min/km, km/h, meters · new auto-splits every 1 km',
  },
  {
    id: 'IMPERIAL',
    label: 'Imperial',
    hint: 'miles, min/mi, mph, feet · new auto-splits every 1 mi',
  },
]

const SWIM_OPTIONS: {
  id: SwimDistanceUnit
  label: string
  hint: string
}[] = [
  {
    id: 'METERS',
    label: 'Meters',
    hint: 'Swim distances in m · new auto-splits every 100 m',
  },
  {
    id: 'YARDS',
    label: 'Yards',
    hint: 'Swim distances in yd · new auto-splits every 100 yd',
  },
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
        const saved = await updateUnitSystem(next)
        setSystem(saved)
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
        const saved = await updateSwimDistanceUnit(next)
        setSwimUnit(saved)
      } catch (err) {
        setSwimUnit(prev)
        setError(toUserMessage(err, 'Could not save swim units'))
      }
    })
  }

  const body = (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[var(--tt-ink,#111)]">
          Distance & speed
        </p>
        {embedded ? (
          <div className="space-y-2">
            {UNIT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isPending}
                onClick={() => selectSystem(opt.id)}
                className={cn(
                  'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
                  system === opt.id
                    ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
                    : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
                )}
              >
                <span className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
                  {opt.label}
                </span>
                <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <SegmentedControl aria-label="Units" className="w-full sm:w-auto">
              {UNIT_OPTIONS.map((opt) => (
                <SegmentedControlItem
                  key={opt.id}
                  type="button"
                  active={system === opt.id}
                  disabled={isPending}
                  onClick={() => selectSystem(opt.id)}
                  className={cn('flex-1 px-3 sm:flex-none')}
                >
                  {opt.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
            <Caption>
              {UNIT_OPTIONS.find((opt) => opt.id === system)?.hint}
            </Caption>
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[var(--tt-ink,#111)]">
          Swim
        </p>
        {embedded ? (
          <div className="space-y-2">
            {SWIM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isPending}
                onClick={() => selectSwim(opt.id)}
                className={cn(
                  'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
                  swimUnit === opt.id
                    ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
                    : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
                )}
              >
                <span className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
                  {opt.label}
                </span>
                <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <SegmentedControl aria-label="Swim units" className="w-full sm:w-auto">
              {SWIM_OPTIONS.map((opt) => (
                <SegmentedControlItem
                  key={opt.id}
                  type="button"
                  active={swimUnit === opt.id}
                  disabled={isPending}
                  onClick={() => selectSwim(opt.id)}
                  className={cn('flex-1 px-3 sm:flex-none')}
                >
                  {opt.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
            <Caption>
              {SWIM_OPTIONS.find((opt) => opt.id === swimUnit)?.hint}
            </Caption>
          </>
        )}
      </div>

      <Caption>
        Changing units does not rewrite workouts already imported from Strava.
        New syncs use your current preferences for automatic splits.
      </Caption>
      <FormError message={error} />
    </div>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="units"
        title="Units"
        description="Distance, pace, speed, and swim labels across the app."
      >
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="space-y-3">
      <SectionTitle>Units</SectionTitle>
      {body}
    </section>
  )
}
