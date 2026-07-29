'use client'

import { useState } from 'react'
import { Flag, Medal, PersonStanding, Trophy } from 'lucide-react'
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
  RUNNING_DISTANCE_PRESET_OPTIONS,
} from '@/components/calculators/distance-preset-select'
import { FieldHint } from '@/components/calculators/calculator-help'
import { TimeParseError } from '@/components/calculators/time-input-hint'
import { Input } from '@/components/ui/input'
import { FORMAT } from '@/lib/calculators/calculator-copy'
import { RUNNING_PRESETS, type RunningPresetId } from '@/lib/calculators/race-distances'
import {
  formatRaceTime,
  parsePositiveFloat,
  parseRaceTimeToMinutes,
  runningFinishMinutes,
  runningPaceFromFinish,
} from '@/lib/calculators/race-time'
import { formatSpeedKmh, paceToSpeedKmh } from '@/lib/calculators/pace-zones'
import { runningFinishTimePlaceholder } from '@/lib/calculators/time-placeholders'
import type { RunningCalculatorState } from '@/lib/calculators/storage'

type RunningTimeCalculatorProps = {
  state: RunningCalculatorState
  onChange: (state: RunningCalculatorState) => void
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

/** Pace slider: 3:00–10:00 /km in 5-second steps. */
const PACE_SLIDER_MIN_SEC = 3 * 60
const PACE_SLIDER_MAX_SEC = 10 * 60
const PACE_SLIDER_STEP_SEC = 1

/** Distance slider: 1–50 km. */
const DISTANCE_SLIDER_MIN = 1
const DISTANCE_SLIDER_MAX = 50
const DISTANCE_SLIDER_STEP = 0.1

function finishDisplayFromPace(distanceKm: number, paceMinPerKm: number | null): string {
  if (paceMinPerKm == null) return ''
  return formatRaceTime(runningFinishMinutes(distanceKm, paceMinPerKm))
}

function formatDistanceKm(km: number): string {
  if (Number.isInteger(km)) return String(km)
  return parseFloat(km.toFixed(4)).toString()
}

export function RunningTimeCalculator({ state, onChange }: RunningTimeCalculatorProps) {
  /** Which time field the user is actively editing (draft may be incomplete). */
  const [editingFinishId, setEditingFinishId] = useState<string | null>(null)
  const [finishDraft, setFinishDraft] = useState('')

  const paceMinPerKm = parsePaceMinPerKm(state.pace)
  const paceInvalid = state.pace.trim() !== '' && paceMinPerKm == null
  const speedKmh = paceMinPerKm != null ? paceToSpeedKmh(paceMinPerKm) : null

  const distanceKm = parsePositiveFloat(state.atPaceCustomDistanceKm)
  const heroTimeMinutes =
    paceMinPerKm != null && distanceKm != null
      ? runningFinishMinutes(distanceKm, paceMinPerKm)
      : null
  const heroTimeDerived = heroTimeMinutes != null ? formatRaceTime(heroTimeMinutes) : ''

  const heroTimeDisplay = editingFinishId === 'hero' ? finishDraft : heroTimeDerived
  const heroTimeInvalid =
    editingFinishId === 'hero' &&
    finishDraft.trim() !== '' &&
    parseRaceTimeToMinutes(finishDraft) == null

  const paceSliderSec = paceMinPerKm != null ? Math.round(paceMinPerKm * 60) : null
  const timeSliderMinSec =
    distanceKm != null
      ? Math.round(runningFinishMinutes(distanceKm, PACE_SLIDER_MIN_SEC / 60) * 60)
      : 0
  const timeSliderMaxSec =
    distanceKm != null
      ? Math.round(runningFinishMinutes(distanceKm, PACE_SLIDER_MAX_SEC / 60) * 60)
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
    // Whole-second pace steps from the pace slider
    applyPace(sec / 60)
  }

  function handleDistanceChange(value: string) {
    setEditingFinishId(null)
    setFinishDraft('')
    onChange({ ...state, atPaceCustomDistanceKm: value })
  }

  function handleDistanceSlider(km: number) {
    setEditingFinishId(null)
    setFinishDraft('')
    onChange({ ...state, atPaceCustomDistanceKm: formatDistanceKm(km) })
  }

  function handleHeroTimeFocus() {
    setEditingFinishId('hero')
    setFinishDraft(heroTimeDerived)
  }

  function handleHeroTimeChange(value: string) {
    setEditingFinishId('hero')
    setFinishDraft(value)

    const minutes = parseRaceTimeToMinutes(value)
    if (minutes == null || distanceKm == null) return
    const nextPace = runningPaceFromFinish(distanceKm, minutes)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleHeroTimeBlur() {
    if (editingFinishId !== 'hero') return
    const minutes = parseRaceTimeToMinutes(finishDraft)
    if (minutes != null && distanceKm != null) {
      const nextPace = runningPaceFromFinish(distanceKm, minutes)
      if (nextPace != null) applyPace(nextPace)
    }
    setEditingFinishId(null)
    setFinishDraft('')
  }

  function handleTimeSlider(totalSeconds: number) {
    if (distanceKm == null) return
    setEditingFinishId(null)
    setFinishDraft('')
    const snappedSec = Math.round(totalSeconds / 5) * 5
    const nextPace = runningPaceFromFinish(distanceKm, snappedSec / 60)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleFinishFocus(id: string) {
    const preset = RUNNING_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setEditingFinishId(id)
    setFinishDraft(finishDisplayFromPace(preset.distanceKm, paceMinPerKm))
  }

  function handleFinishChange(id: string, value: string) {
    setEditingFinishId(id)
    setFinishDraft(value)

    const minutes = parseRaceTimeToMinutes(value)
    if (minutes == null) return

    const preset = RUNNING_PRESETS.find((p) => p.id === id)
    if (!preset) return
    const nextPace = runningPaceFromFinish(preset.distanceKm, minutes)
    if (nextPace != null) applyPace(nextPace)
  }

  function handleFinishBlur(id: string) {
    if (editingFinishId !== id) return
    const minutes = parseRaceTimeToMinutes(finishDraft)
    if (minutes != null) {
      const preset = RUNNING_PRESETS.find((p) => p.id === id)
      if (preset) {
        const nextPace = runningPaceFromFinish(preset.distanceKm, minutes)
        if (nextPace != null) applyPace(nextPace)
      }
    }
    setEditingFinishId(null)
    setFinishDraft('')
  }

  const predictionItems: PredictionCardItem[] = RUNNING_PRESETS.map((preset) => {
    const derived = finishDisplayFromPace(preset.distanceKm, paceMinPerKm)
    const isEditing = editingFinishId === preset.id
    const display = isEditing ? finishDraft : derived
    const invalid =
      isEditing && finishDraft.trim() !== '' && parseRaceTimeToMinutes(finishDraft) == null

    return {
      id: preset.id,
      label: preset.label,
      value: display || '—',
      icon: PRESET_ICONS[preset.id],
      iconClassName: PRESET_ICON_COLORS[preset.id],
      placeholder: runningFinishTimePlaceholder(preset.id as RunningPresetId),
      editable: true,
      invalid,
    }
  })

  return (
    <div className="space-y-4">
      <CalculatorHeroCard title="Running calculator">
        <CalculatorHeroColumns
          columns={[
            {
              content: (
                <CalculatorHeroField
                  label="Distance"
                  unit="km"
                  align="center"
                  labelAddon={
                    <DistancePresetSelect
                      options={RUNNING_DISTANCE_PRESET_OPTIONS}
                      value={distanceKm}
                      onSelect={handleDistanceSlider}
                      aria-label="Choose race distance"
                    />
                  }
                >
                  <Input
                    value={state.atPaceCustomDistanceKm}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    onFocus={() => {
                      setEditingFinishId(null)
                      setFinishDraft('')
                    }}
                    placeholder="10"
                    inputMode="decimal"
                    variant="ghost"
                    className={HERO_INPUT_CLASS}
                    aria-label="Distance in kilometres"
                  />
                </CalculatorHeroField>
              ),
              control: (
                <CalculatorValueSlider
                  value={distanceKm}
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
                  label="Time"
                  align="center"
                  hint={<TimeParseError show={heroTimeInvalid} />}
                >
                  <Input
                    value={heroTimeDisplay}
                    onChange={(e) => handleHeroTimeChange(e.target.value)}
                    onFocus={handleHeroTimeFocus}
                    onBlur={handleHeroTimeBlur}
                    placeholder={runningFinishTimePlaceholder('custom')}
                    inputMode="numeric"
                    variant="ghost"
                    className={HERO_INPUT_CLASS}
                    aria-label="Finish time"
                    disabled={distanceKm == null && editingFinishId !== 'hero'}
                  />
                </CalculatorHeroField>
              ),
              control: (
                <CalculatorValueSlider
                  value={timeSliderSec}
                  min={timeSliderMinSec}
                  max={timeSliderMaxSec}
                  step={5}
                  onChange={handleTimeSlider}
                  disabled={distanceKm == null}
                  aria-label="Adjust finish time"
                />
              ),
            },
          ]}
        />

        <FieldHint>
          {FORMAT.paceMinPerKm} Edit pace, distance, or time — they stay in sync. Race cards below
          use the same pace.
        </FieldHint>
      </CalculatorHeroCard>

      <CalculatorPredictionGrid
        title="Finish times"
        items={predictionItems}
        onValueChange={handleFinishChange}
        onValueFocus={handleFinishFocus}
        onValueBlur={handleFinishBlur}
      />
    </div>
  )
}
