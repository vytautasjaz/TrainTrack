'use client'

import { Flag, Medal, PersonStanding, Trophy } from 'lucide-react'
import {
  CalculatorHeroCard,
  CalculatorHeroColumns,
  CalculatorHeroField,
} from '@/components/calculators/calculator-hero-card'
import {
  CalculatorPredictionGrid,
  PredictionQualityBadge,
  type PredictionCardItem,
} from '@/components/calculators/calculator-prediction-grid'
import { CalculatorHowTo, FieldHint } from '@/components/calculators/calculator-help'
import {
  DistancePresetSelect,
  RUNNING_DISTANCE_PRESET_OPTIONS,
} from '@/components/calculators/distance-preset-select'
import { TimeInputHint, TimeParseError } from '@/components/calculators/time-input-hint'
import { Input } from '@/components/ui/input'
import { RUNNING_PRESETS } from '@/lib/calculators/race-distances'
import {
  predictionQuality,
  riegelPredictMinutes,
} from '@/lib/calculators/race-predictor'
import {
  formatRaceTime,
  parsePositiveFloat,
  parseRaceTimeToMinutes,
} from '@/lib/calculators/race-time'
import type { RacePredictorCalculatorState } from '@/lib/calculators/storage'
import { cn } from '@/lib/utils'

type RacePredictorCalculatorProps = {
  state: RacePredictorCalculatorState
  onChange: (state: RacePredictorCalculatorState) => void
}

const PRESET_ICONS = {
  '5k': PersonStanding,
  '10k': Flag,
  half: Medal,
  marathon: Trophy,
} as const

const PRESET_ICON_COLORS = {
  '5k': 'bg-emerald-500/15 text-emerald-600',
  '10k': 'bg-sky-500/15 text-sky-600',
  half: 'bg-amber-500/15 text-amber-600',
  marathon: 'bg-brand/10 text-brand',
} as const

const HERO_INPUT_CLASS =
  'w-full min-w-0 text-center text-3xl font-bold tabular-nums tracking-tight sm:text-4xl'

function formatDistanceKm(km: number): string {
  if (Number.isInteger(km)) return String(km)
  return parseFloat(km.toFixed(4)).toString()
}

function knownDistanceLabel(km: number): string | null {
  const preset = RUNNING_PRESETS.find((p) => Math.abs(p.distanceKm - km) < 0.001)
  return preset?.label ?? null
}

export function RacePredictorCalculator({ state, onChange }: RacePredictorCalculatorProps) {
  const knownKm = parsePositiveFloat(state.knownDistanceKm)
  const knownMinutes = parseRaceTimeToMinutes(state.knownTime)
  const knownTimeInvalid =
    state.knownTime.trim() !== '' && knownMinutes == null
  const knownLabel = knownKm != null ? knownDistanceLabel(knownKm) : null

  const customTargetKm = parsePositiveFloat(state.customTargetKm)
  const customPredicted =
    knownMinutes != null && knownKm != null && customTargetKm != null
      ? riegelPredictMinutes(knownMinutes, knownKm, customTargetKm)
      : null
  const customQuality =
    knownKm != null && customTargetKm != null
      ? predictionQuality(knownKm, customTargetKm, customPredicted, knownLabel)
      : null

  const predictionItems: PredictionCardItem[] = RUNNING_PRESETS.map((preset) => {
    const predicted =
      knownMinutes != null && knownKm != null
        ? riegelPredictMinutes(knownMinutes, knownKm, preset.distanceKm)
        : null
    const quality =
      knownKm != null && knownMinutes != null
        ? predictionQuality(knownKm, preset.distanceKm, predicted, knownLabel)
        : null

    return {
      id: preset.id,
      label: preset.label,
      value: predicted != null ? formatRaceTime(predicted) : '—',
      icon: PRESET_ICONS[preset.id],
      iconClassName: PRESET_ICON_COLORS[preset.id],
      editable: false,
      quality: quality
        ? {
            band: quality.band,
            label: quality.label,
            detail: quality.detail,
          }
        : undefined,
    }
  })

  function handleDistanceChange(value: string) {
    onChange({ ...state, knownDistanceKm: value })
  }

  function handleDistancePreset(km: number) {
    onChange({ ...state, knownDistanceKm: formatDistanceKm(km) })
  }

  function handleTimeChange(value: string) {
    onChange({ ...state, knownTime: value })
  }

  return (
    <div
      className={cn(
        'space-y-4 text-[#111315]',
        /* Soft greys wash out on the home gradient — force readable ink. */
        '[&_.text-muted-foreground]:text-[#111315]/75',
        '[&_.text-caption]:text-[#111315]',
        '[&_.text-hint]:text-[#111315]/80',
      )}
    >
      <CalculatorHowTo className="border-black/10 bg-white text-[#111315]">
        Equivalent times use Riegel’s formula{' '}
        <span className="font-medium tabular-nums text-[#111315]">
          T₂ = T₁ × (D₂ ÷ D₁)¹·⁰⁶
        </span>
        . The closer your known race is to the distance you care about, the more reliable the
        prediction.
      </CalculatorHowTo>

      <CalculatorHeroCard title="Known race">
        <CalculatorHeroColumns
          columns={[
            {
              content: (
                <CalculatorHeroField
                  label="Distance"
                  unit="km"
                  align="center"
                  labelClassName="text-[#111315]"
                  labelAddon={
                    <DistancePresetSelect
                      options={RUNNING_DISTANCE_PRESET_OPTIONS}
                      value={knownKm}
                      onSelect={handleDistancePreset}
                      aria-label="Choose known race distance"
                    />
                  }
                >
                  <Input
                    value={state.knownDistanceKm}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    placeholder="5"
                    inputMode="decimal"
                    variant="ghost"
                    className={cn(HERO_INPUT_CLASS, 'text-[#111315]')}
                    aria-label="Known race distance in kilometres"
                  />
                </CalculatorHeroField>
              ),
            },
            {
              content: (
                <CalculatorHeroField
                  label="Finish time"
                  align="center"
                  labelClassName="text-[#111315]"
                  hint={
                    knownTimeInvalid ? (
                      <TimeParseError show />
                    ) : (
                      <TimeInputHint className="text-[#111315]/80" />
                    )
                  }
                >
                  <Input
                    value={state.knownTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    placeholder="24:30"
                    inputMode="decimal"
                    variant="ghost"
                    className={cn(HERO_INPUT_CLASS, 'text-[#111315]')}
                    aria-label="Known race finish time"
                    aria-invalid={knownTimeInvalid || undefined}
                  />
                </CalculatorHeroField>
              ),
            },
          ]}
        />
      </CalculatorHeroCard>

      <CalculatorPredictionGrid
        title="Equivalent race times"
        items={predictionItems}
        ink="strong"
      />

      <CalculatorHeroCard title="Custom target">
        <div className="grid gap-4 sm:grid-cols-2">
          <CalculatorHeroField
            label="Target distance"
            unit="km"
            align="center"
            labelClassName="text-[#111315]"
          >
            <Input
              value={state.customTargetKm}
              onChange={(e) => onChange({ ...state, customTargetKm: e.target.value })}
              placeholder="15"
              inputMode="decimal"
              variant="ghost"
              className={cn(HERO_INPUT_CLASS, 'text-[#111315]')}
              aria-label="Custom target distance in kilometres"
            />
          </CalculatorHeroField>
          <CalculatorHeroField
            label="Predicted time"
            align="center"
            labelClassName="text-[#111315]"
            hint={
              customQuality ? (
                <div className="flex flex-col items-center gap-1.5">
                  <PredictionQualityBadge quality={customQuality} />
                  {customQuality.detail ? (
                    <FieldHint className="text-[#111315]/80">{customQuality.detail}</FieldHint>
                  ) : null}
                </div>
              ) : (
                <FieldHint className="text-[#111315]/80">
                  Enter a known race and target distance
                </FieldHint>
              )
            }
          >
            <p className={cn(HERO_INPUT_CLASS, 'text-[#111315]')} aria-live="polite">
              {customPredicted != null ? formatRaceTime(customPredicted) : '—'}
            </p>
          </CalculatorHeroField>
        </div>
      </CalculatorHeroCard>

      <FieldHint className="text-[#111315]/85">
        Prefer a recent longer race for marathon goals. Workout time trials and track/short-course
        results usually flatter you compared with road races.
      </FieldHint>
    </div>
  )
}
