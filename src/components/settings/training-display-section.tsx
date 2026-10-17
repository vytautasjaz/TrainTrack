'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import {
  updateSwimDistanceUnit,
  updateUnitSystem,
} from '@/app/actions/preferences'
import {
  SettingsPanel,
  SettingsPrefRow,
} from '@/components/settings/settings-section-chrome'
import { FormError } from '@/components/ui/form-error'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { toUserMessage } from '@/lib/action-error'
import {
  PLAN_COLOR_MODE_OPTIONS,
  defaultPlanColorMode,
  defaultPlanCompletionLayer,
  readStoredPlanColorMode,
  readStoredPlanCompletionLayer,
  writeStoredPlanColorMode,
  writeStoredPlanCompletionLayer,
  type PlanColorMode,
} from '@/lib/plan-sport-filter'
import {
  TRAINING_DEFAULT_VIEW_OPTIONS,
  readStoredTrainingDefaultView,
  resolveTrainingDefaultView,
  writeStoredTrainingDefaultView,
  type TrainingDefaultView,
  type TrainingDefaultViewRole,
} from '@/lib/training-default-view'
import type { SwimDistanceUnit, UnitSystem } from '@/lib/units'
import {
  WEEK_CARD_SIZE_STORAGE_KEY,
  WEEK_CARD_SIZES,
  defaultWeekCardSize,
  readStoredWeekCardSize,
  writeStoredWeekCardSize,
  type WeekCardSize,
} from '@/lib/week-card-size'
import { cn } from '@/lib/utils'

const DESKTOP_MQ = '(min-width: 1024px)'

const UNIT_OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'METRIC', label: 'Metric' },
  { id: 'IMPERIAL', label: 'Imperial' },
]

const SWIM_OPTIONS: { id: SwimDistanceUnit; label: string }[] = [
  { id: 'METERS', label: 'Meters' },
  { id: 'YARDS', label: 'Yards' },
]

type TrainingDisplaySectionProps = {
  role: TrainingDefaultViewRole
  initialUnitSystem: UnitSystem
  initialSwimUnit?: SwimDistanceUnit
  /** Coach planning: units + view prefs + optional lead-days slot. */
  leadDaysSlot?: ReactNode
}

export function TrainingDisplaySection({
  role,
  initialUnitSystem,
  initialSwimUnit = 'METERS',
  leadDaysSlot,
}: TrainingDisplaySectionProps) {
  const [system, setSystem] = useState<UnitSystem>(initialUnitSystem)
  const [swimUnit, setSwimUnit] = useState<SwimDistanceUnit>(initialSwimUnit)
  const [view, setView] = useState<TrainingDefaultView>('week')
  const [cardSize, setCardSize] = useState<WeekCardSize>(defaultWeekCardSize)
  const [colorMode, setColorMode] = useState<PlanColorMode>(defaultPlanColorMode)
  const [completionLayer, setCompletionLayer] = useState(defaultPlanCompletionLayer)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const desktop =
      typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
    setView(
      resolveTrainingDefaultView(readStoredTrainingDefaultView(role), desktop),
    )
    setCardSize(readStoredWeekCardSize(WEEK_CARD_SIZE_STORAGE_KEY))
    setColorMode(readStoredPlanColorMode())
    setCompletionLayer(readStoredPlanCompletionLayer())
  }, [role])

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
        setError(toUserMessage(err, 'Could not save units'))
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

  return (
    <SettingsPanel
      id={role === 'coach' ? 'planning' : 'plan'}
      title={role === 'coach' ? 'Planning' : 'Training display'}
    >
      <div className="tt-settings-pref-rows">
        <SettingsPrefRow label="Units">
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
        </SettingsPrefRow>

        <SettingsPrefRow label="Swim">
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
        </SettingsPrefRow>

        <SettingsPrefRow label="Default view">
          <SegmentedControl aria-label="Default Training view" className="w-full">
            {TRAINING_DEFAULT_VIEW_OPTIONS.map((opt) => (
              <SegmentedControlItem
                key={opt.id}
                type="button"
                active={view === opt.id}
                onClick={() => {
                  setView(opt.id)
                  writeStoredTrainingDefaultView(role, opt.id)
                }}
                className={cn('flex-1')}
              >
                {opt.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </SettingsPrefRow>

        <SettingsPrefRow label="Week cards">
          <SegmentedControl aria-label="Week card size" className="w-full">
            {WEEK_CARD_SIZES.map((id) => (
              <SegmentedControlItem
                key={id}
                type="button"
                active={cardSize === id}
                onClick={() => {
                  setCardSize(id)
                  writeStoredWeekCardSize(id, WEEK_CARD_SIZE_STORAGE_KEY)
                }}
                className={cn('flex-1')}
              >
                {id.toUpperCase()}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </SettingsPrefRow>

        {role === 'athlete' ? (
          <>
            <SettingsPrefRow label="Card color">
              <SegmentedControl aria-label="Card color" className="w-full">
                {PLAN_COLOR_MODE_OPTIONS.map((opt) => (
                  <SegmentedControlItem
                    key={opt.id}
                    type="button"
                    active={colorMode === opt.id}
                    onClick={() => {
                      setColorMode(opt.id)
                      writeStoredPlanColorMode(opt.id)
                    }}
                    className={cn('flex-1')}
                  >
                    {opt.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </SettingsPrefRow>

            <SettingsPrefRow label="Completion">
              <label className="tt-integration-check">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--tt-ink,#111)]"
                  checked={completionLayer}
                  onChange={(e) => {
                    setCompletionLayer(e.target.checked)
                    writeStoredPlanCompletionLayer(e.target.checked)
                  }}
                />
                <span>Show done / skipped</span>
              </label>
            </SettingsPrefRow>
          </>
        ) : null}

        {leadDaysSlot ? (
          <SettingsPrefRow label="Plan lead">{leadDaysSlot}</SettingsPrefRow>
        ) : null}
      </div>
      <FormError message={error} className="mt-2" />
    </SettingsPanel>
  )
}
