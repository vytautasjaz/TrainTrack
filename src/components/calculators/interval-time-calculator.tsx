'use client'

import { useState } from 'react'
import { CircleDot, Flag, Timer, Zap } from 'lucide-react'
import { formatPaceMinPerKmPrecise, parsePaceMinPerKm } from '@/lib/athlete-preferences'
import {
  CalculatorHeroCard,
  CalculatorHeroColumns,
  CalculatorHeroField,
} from '@/components/calculators/calculator-hero-card'
import {
  CalculatorPredictionGrid,
  type PredictionCardItem,
} from '@/components/calculators/calculator-prediction-grid'
import { CalculatorValueSlider } from '@/components/calculators/calculator-value-slider'
import {
  DistancePresetSelect,
  INTERVAL_DISTANCE_PRESET_OPTIONS,
} from '@/components/calculators/distance-preset-select'
import { FieldHint } from '@/components/calculators/calculator-help'
import { TimeParseError } from '@/components/calculators/time-input-hint'
import { Input } from '@/components/ui/input'
import { FORMAT } from '@/lib/calculators/calculator-copy'
import { INTERVAL_PRESETS, type IntervalPresetId } from '@/lib/calculators/interval-distances'
import {
  formatRaceTime,
  intervalPaceFromTime,
  intervalTimeMinutes,
  parsePositiveFloat,
  parseRaceTimeToMinutes,
} from '@/lib/calculators/race-time'
import { formatSpeedKmh, paceToSpeedKmh } from '@/lib/calculators/pace-zones'
import { intervalFinishTimePlaceholder } from '@/lib/calculators/time-placeholders'
import type { IntervalCalculatorState } from '@/lib/calculators/storage'

type IntervalTimeCalculatorProps = {
  state: IntervalCalculatorState
  onChange: (state: IntervalCalculatorState) => void
}

/** Primary cards shown in the prediction grid. */
const GRID_PRESETS = INTERVAL_PRESETS.filter((p) =>
  ['200', '400', '800', '1000'].includes(p.id),
)

const GRID_ICONS = {
  '200': CircleDot,
  '400': Zap,
  '800': Timer,
  '1000': Flag,
} as const

const GRID_ICON_COLORS = {
  '200': 'bg-emerald-500/15 text-emerald-600',
  '400': 'bg-sky-500/15 text-sky-600',
  '800': 'bg-amber-500/15 text-amber-600',
  '1000': 'bg-brand/10 text-brand',
} as const

const HERO_INPUT_CLASS =
  'w-full min-w-0 text-center text-3xl font-bold tabular-nums tracking-tight sm:text-4xl'

/** Pace slider: 3:00–8:00 /km in 1-second steps. */
const PACE_SLIDER_MIN_SEC = 2 * 60 + 30
const PACE_SLIDER_MAX_SEC = 8 * 60
const PACE_SLIDER_STEP_SEC = 1

/** Distance slider: 100–5000 m. */
const DISTANCE_SLIDER_MIN = 100
const DISTANCE_SLIDER_MAX = 5000
const DISTANCE_SLIDER_STEP = 50

function finishDisplayFromPace(distanceM: number, paceMinPerKm: number | null): string {
  if (paceMinPerKm == null) return ''
  return formatRaceTime(intervalTimeMinutes(distanceM, paceMinPerKm))
}

function formatDistanceM(m: number): string {
  return Number.isInteger(m) ? String(m) : parseFloat(m.toFixed(1)).toString()
}

export function IntervalTimeCalculator({ state, onChange }: IntervalTimeCalculatorProps) {
  const [editingFinishId, setEditingFinishId] = useState<string | null>(null)
  const [finishDraft, setFinishDraft] = useState('')

  const paceMinPerKm = parsePaceMinPerKm(state.pace)
  const paceInvalid = state.pace.trim() !== '' && paceMinPerKm == null
  const speedKmh = paceMinPerKm != null ? paceToSpeedKmh(paceMinPerKm) : null

  const distanceM = parsePositiveFloat(state.atPaceCustomDistanceM)
  const heroTimeMinutes =
    paceMinPerKm != null && distanceM != null
      ? intervalTimeMinutes(distanceM, paceMinPerKm)
      : null
  const heroTimeDerived = heroTimeMinutes != null ? formatRaceTime(heroTimeMinutes) : ''

  const heroTimeDisplay = editingFinishId === 'hero' ? finishDraft : heroTimeDerived
  const heroTimeInvalid =
    editingFinishId === 'hero' &&
    finishDraft.trim() !== '' &&
    parseRaceTimeToMinutes(finishDraft) == null

  const paceSliderSec = paceMinPerKm != null ? Math.round(paceMinPerKm * 60) : null
  const timeSliderMinSec =
    distanceM != null
      ? Math.round(intervalTimeMinutes(distanceM, PACE_SLIDER_MIN_SEC / 60) * 60)
      : 0
  const timeSliderMaxSec =
    distanceM != null
      ? Math.round(intervalTimeMinutes(distanceM, PACE_SLIDER_MAX_SEC / 60) * 60)
      : 1
  const timeSliderSec =
    heroTimeMinutes != null ? Math.round(heroTimeMinutes * 60) : null

  function applyPace(paceMinPerKmValue: number) {
    onChange({
      ...state,
      pace: formatPaceMinPerKmPrecise(paceMinPerKmValue),
      direction: 'pace-to-time',
    })
  }

  function handlePaceChange(value: string) {
    setEditingFinishId(null)
    setFinishDraft('')
    onChange({ ...state, pace: value, direction: 'pace-to-time' })
  }

  function handlePaceSlider(sec: number) {
    setEditingFinishId(null)
    setFinishDraft('')
    applyPace(sec / 60)
  }

  function handleDistanceChange(value: string) {
    setEditingFinishId(null)
    setFinishDraft('')
    onChange({ ...state, atPaceCustomDistanceM: value })
  }

  function handleDistanceSlider(m: number) {
    setEditingFinishId(null)
    setFinishDraft('')
    onChange({ ...state, atPaceCustomDistanceM: formatDistanceM(m) })
  }

  function handleHeroTimeFocus() {
    setEditingFinishId('hero')
    setFinishDraft(heroTimeDerived)
  }

  function handleHeroTimeChange(value: string) {
    setEditingFinishId('hero')
    setFinishDraft(value)

    const minutes = parseRaceTimeToMinutes(value)
    if (minutes == null || distanceM == null) return
    const nextPace = intervalPaceFromTime(distanceM, minutes)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleHeroTimeBlur() {
    if (editingFinishId !== 'hero') return
    const minutes = parseRaceTimeToMinutes(finishDraft)
    if (minutes != null && distanceM != null) {
      const nextPace = intervalPaceFromTime(distanceM, minutes)
      if (nextPace != null) applyPace(nextPace)
    }
    setEditingFinishId(null)
    setFinishDraft('')
  }

  function handleTimeSlider(totalSeconds: number) {
    if (distanceM == null) return
    setEditingFinishId(null)
    setFinishDraft('')
    const nextPace = intervalPaceFromTime(distanceM, totalSeconds / 60)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleFinishFocus(id: string) {
    const preset = GRID_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setEditingFinishId(id)
    setFinishDraft(finishDisplayFromPace(preset.distanceM, paceMinPerKm))
  }

  function handleFinishChange(id: string, value: string) {
    setEditingFinishId(id)
    setFinishDraft(value)

    const minutes = parseRaceTimeToMinutes(value)
    if (minutes == null) return

    const preset = GRID_PRESETS.find((p) => p.id === id)
    if (!preset) return
    const nextPace = intervalPaceFromTime(preset.distanceM, minutes)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleFinishBlur(id: string) {
    if (editingFinishId !== id) return
    const minutes = parseRaceTimeToMinutes(finishDraft)
    if (minutes != null) {
      const preset = GRID_PRESETS.find((p) => p.id === id)
      if (preset) {
        const nextPace = intervalPaceFromTime(preset.distanceM, minutes)
        if (nextPace != null) applyPace(nextPace)
      }
    }
    setEditingFinishId(null)
    setFinishDraft('')
  }

  const predictionItems: PredictionCardItem[] = GRID_PRESETS.map((preset) => {
    const derived = finishDisplayFromPace(preset.distanceM, paceMinPerKm)
    const isEditing = editingFinishId === preset.id
    const display = isEditing ? finishDraft : derived
    const invalid =
      isEditing && finishDraft.trim() !== '' && parseRaceTimeToMinutes(finishDraft) == null

    return {
      id: preset.id,
      label: preset.label,
      value: display || '—',
      icon: GRID_ICONS[preset.id as keyof typeof GRID_ICONS],
      iconClassName: GRID_ICON_COLORS[preset.id as keyof typeof GRID_ICON_COLORS],
      placeholder: intervalFinishTimePlaceholder(preset.id as IntervalPresetId),
      editable: true,
      invalid,
    }
  })

  return (
    <div className="space-y-4">
      <CalculatorHeroCard title="Interval calculator">
        <CalculatorHeroColumns
          columns={[
            {
              content: (
                <CalculatorHeroField
                  label="Pace"
                  unit="/km"
                  align="center"
                  secondary={
                    speedKmh != null ? (
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatSpeedKmh(speedKmh)}
                      </p>
                    ) : null
                  }
                  hint={
                    paceInvalid ? (
                      <p className="text-xs text-destructive">Use format like 5:30 or 5.5</p>
                    ) : null
                  }
                >
                  <Input
                    value={state.pace}
                    onChange={(e) => handlePaceChange(e.target.value)}
                    onFocus={() => {
                      setEditingFinishId(null)
                      setFinishDraft('')
                    }}
                    placeholder="5:30"
                    variant="ghost"
                    className={HERO_INPUT_CLASS}
                    aria-label="Pace in minutes per kilometre"
                  />
                </CalculatorHeroField>
              ),
              control: (
                <CalculatorValueSlider
                  value={paceSliderSec}
                  min={PACE_SLIDER_MIN_SEC}
                  max={PACE_SLIDER_MAX_SEC}
                  step={PACE_SLIDER_STEP_SEC}
                  onChange={handlePaceSlider}
                  aria-label="Adjust pace"
                />
              ),
            },
            {
              content: (
                <CalculatorHeroField
                  label="Distance"
                  unit="m"
                  align="center"
                  labelAddon={
                    <DistancePresetSelect
                      options={INTERVAL_DISTANCE_PRESET_OPTIONS}
                      value={distanceM}
                      onSelect={handleDistanceSlider}
                      aria-label="Choose interval distance"
                    />
                  }
                >
                  <Input
                    value={state.atPaceCustomDistanceM}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    onFocus={() => {
                      setEditingFinishId(null)
                      setFinishDraft('')
                    }}
                    placeholder="400"
                    inputMode="decimal"
                    variant="ghost"
                    className={HERO_INPUT_CLASS}
                    aria-label="Distance in metres"
                  />
                </CalculatorHeroField>
              ),
              control: (
                <CalculatorValueSlider
                  value={distanceM}
                  min={DISTANCE_SLIDER_MIN}
                  max={DISTANCE_SLIDER_MAX}
                  step={DISTANCE_SLIDER_STEP}
                  onChange={handleDistanceSlider}
                  aria-label="Adjust distance"
                />
              ),
            },
            {
              content: (
                <CalculatorHeroField
                  label="Time"
                  align="center"
                  hint={<TimeParseError show={heroTimeInvalid} />}
                >
                  <Input
                    value={heroTimeDisplay}
                    onChange={(e) => handleHeroTimeChange(e.target.value)}
                    onFocus={handleHeroTimeFocus}
                    onBlur={handleHeroTimeBlur}
                    placeholder={intervalFinishTimePlaceholder('custom')}
                    inputMode="numeric"
                    variant="ghost"
                    className={HERO_INPUT_CLASS}
                    aria-label="Interval time"
                    disabled={distanceM == null && editingFinishId !== 'hero'}
                  />
                </CalculatorHeroField>
              ),
              control: (
                <CalculatorValueSlider
                  value={timeSliderSec}
                  min={timeSliderMinSec}
                  max={timeSliderMaxSec}
                  step={1}
                  onChange={handleTimeSlider}
                  disabled={distanceM == null}
                  aria-label="Adjust interval time"
                />
              ),
            },
          ]}
        />

        <FieldHint>
          {FORMAT.paceMinPerKm} Edit pace, distance, or time — they stay in sync. Interval cards
          below use the same pace.
        </FieldHint>
      </CalculatorHeroCard>

      <CalculatorPredictionGrid
        title="Interval times"
        items={predictionItems}
        onValueChange={handleFinishChange}
        onValueFocus={handleFinishFocus}
        onValueBlur={handleFinishBlur}
      />
    </div>
  )
}
