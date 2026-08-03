'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Bike, Flag, Footprints, Medal, Trophy, Waves } from 'lucide-react'
import { formatPaceMinPerKm, formatPaceMinPerKmPrecise, parsePaceMinPerKm } from '@/lib/athlete-preferences'
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
import { LabelPresetSelect } from '@/components/calculators/distance-preset-select'
import { TimeParseError } from '@/components/calculators/time-input-hint'
import { Input } from '@/components/ui/input'
import { TRIATHLON_PRESETS, type TriathlonPresetId } from '@/lib/calculators/race-distances'
import {
  bikeSpeedFromLegTime,
  formatRaceTime,
  formatSwimPaceMinPer100m,
  parseDurationToMinutes,
  parsePositiveFloat,
  parseRaceTimeToMinutes,
  parseSwimPaceMinPer100m,
  runPaceFromLegTime,
  swimPaceFromLegTime,
  triathlonFinishMinutes,
} from '@/lib/calculators/race-time'
import type { TriathlonCalculatorState } from '@/lib/calculators/storage'
import { cn } from '@/lib/utils'

type TriathlonTimeCalculatorProps = {
  state: TriathlonCalculatorState
  onChange: (state: TriathlonCalculatorState) => void
}

type SplitId = 'swim' | 't1' | 'bike' | 't2' | 'run'

const TRI_ICONS = {
  sprint: Flag,
  olympic: Medal,
  half: Trophy,
  ironman: Trophy,
} as const

const TRI_ICON_COLORS = {
  sprint: 'bg-emerald-500/15 text-emerald-600',
  olympic: 'bg-sky-500/15 text-sky-600',
  half: 'bg-amber-500/15 text-amber-600',
  ironman: 'bg-brand/10 text-brand',
} as const

const HERO_INPUT_CLASS =
  'w-full min-w-0 text-center text-3xl font-bold tabular-nums tracking-tight sm:text-4xl'

const SPLIT_INPUT_CLASS =
  'w-full text-center text-base font-semibold tabular-nums tracking-tight sm:text-lg'

/** Swim pace slider: 1:20–3:00 /100m in seconds. */
const SWIM_SLIDER_MIN_SEC = 80
const SWIM_SLIDER_MAX_SEC = 180
const SWIM_SLIDER_STEP_SEC = 1

/** Bike speed slider: 20–45 km/h. */
const BIKE_SLIDER_MIN = 20
const BIKE_SLIDER_MAX = 45
const BIKE_SLIDER_STEP = 0.1

/** Run pace slider: 3:00–8:00 /km in seconds. */
const RUN_SLIDER_MIN_SEC = 3 * 60
const RUN_SLIDER_MAX_SEC = 8 * 60
const RUN_SLIDER_STEP_SEC = 1

/** Transition time slider: 0–5 min in seconds. */
const TRANSITION_SLIDER_MIN_SEC = 0
const TRANSITION_SLIDER_MAX_SEC = 5 * 60
const TRANSITION_SLIDER_STEP_SEC = 5

const RACE_PRESET_OPTIONS = TRIATHLON_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.label,
}))

function formatDistanceKm(km: number): string {
  if (Number.isInteger(km)) return String(km)
  return parseFloat(km.toFixed(4)).toString()
}

function formatBikeSpeed(kmh: number): string {
  return Number.isInteger(kmh) ? String(kmh) : kmh.toFixed(1)
}

/** Enough precision so ±1s split nudges change stored bike speed on long legs. */
function formatBikeSpeedPrecise(kmh: number): string {
  return String(Math.round(kmh * 1000) / 1000)
}

function formatRaceDistances(preset: (typeof TRIATHLON_PRESETS)[number]): string {
  const swim = formatDistanceKm(preset.swimKm)
  const bike = formatDistanceKm(preset.bikeKm)
  const run = formatDistanceKm(preset.runKm)
  return `${swim} / ${bike} / ${run} km`
}

function resolveActivePreset(reversePreset: TriathlonCalculatorState['reversePreset']) {
  if (reversePreset === 'custom') {
    return TRIATHLON_PRESETS.find((p) => p.id === 'olympic') ?? TRIATHLON_PRESETS[0]
  }
  return TRIATHLON_PRESETS.find((p) => p.id === reversePreset) ?? TRIATHLON_PRESETS[0]
}

function minutesToSliderSec(minutes: number | null | undefined): number | null {
  if (minutes == null || !Number.isFinite(minutes)) return null
  return Math.round(minutes * 60)
}

export function TriathlonTimeCalculator({ state, onChange }: TriathlonTimeCalculatorProps) {
  const [editingSplit, setEditingSplit] = useState<SplitId | null>(null)
  const [splitDraft, setSplitDraft] = useState('')

  const swimPace = parseSwimPaceMinPer100m(state.swimPacePer100m)
  const t1Min = parseDurationToMinutes(state.t1) ?? 0
  const bikeSpeed = parsePositiveFloat(state.bikeSpeedKmh)
  const t2Min = parseDurationToMinutes(state.t2) ?? 0
  const runPace = parsePaceMinPerKm(state.runPace)

  const activePreset = resolveActivePreset(state.reversePreset)
  const activeRaceId = activePreset.id

  const inputsValid =
    swimPace != null && bikeSpeed != null && runPace != null && t1Min >= 0 && t2Min >= 0

  const calcSplit = useMemo(() => {
    if (!inputsValid || swimPace == null || bikeSpeed == null || runPace == null) {
      return null
    }
    return (swimKm: number, bikeKm: number, runKm: number) =>
      triathlonFinishMinutes({
        swimKm,
        bikeKm,
        runKm,
        swimPaceMinPer100m: swimPace,
        t1Min,
        bikeSpeedKmh: bikeSpeed,
        t2Min,
        runPaceMinPerKm: runPace,
      })
  }, [inputsValid, swimPace, bikeSpeed, runPace, t1Min, t2Min])

  const selectedSplit = useMemo(() => {
    if (!calcSplit) return null
    return calcSplit(activePreset.swimKm, activePreset.bikeKm, activePreset.runKm)
  }, [calcSplit, activePreset])

  const derivedSplits: Record<SplitId, string> = {
    swim: selectedSplit != null ? formatRaceTime(selectedSplit.swimMin) : '',
    t1: state.t1,
    bike: selectedSplit != null ? formatRaceTime(selectedSplit.bikeMin) : '',
    t2: state.t2,
    run: selectedSplit != null ? formatRaceTime(selectedSplit.runMin) : '',
  }

  const predictionItems = useMemo((): PredictionCardItem[] => {
    return TRIATHLON_PRESETS.map((preset) => {
      const split = calcSplit ? calcSplit(preset.swimKm, preset.bikeKm, preset.runKm) : null
      return {
        id: preset.id,
        label: preset.label,
        value: split != null ? formatRaceTime(split.totalMin) : '—',
        icon: TRI_ICONS[preset.id],
        iconClassName: TRI_ICON_COLORS[preset.id],
        caption: formatRaceDistances(preset),
        splits:
          split != null
            ? [
                { label: 'Swim', value: formatRaceTime(split.swimMin) },
                { label: 'Bike', value: formatRaceTime(split.bikeMin) },
                { label: 'Run', value: formatRaceTime(split.runMin) },
              ]
            : [
                { label: 'Swim', value: '—' },
                { label: 'Bike', value: '—' },
                { label: 'Run', value: '—' },
              ],
      }
    })
  }, [calcSplit])

  const share = (minutes: number) => {
    if (!selectedSplit || selectedSplit.totalMin <= 0) return 0
    if (minutes <= 0) return 0
    return Math.max(1, Math.round((minutes / selectedSplit.totalMin) * 100))
  }

  const swimSliderSec = swimPace != null ? Math.round(swimPace * 60) : null
  const runSliderSec = runPace != null ? Math.round(runPace * 60) : null

  const swimSplitSec =
    selectedSplit != null
      ? minutesToSliderSec(selectedSplit.swimMin)
      : swimPace != null
        ? minutesToSliderSec(activePreset.swimKm * 10 * swimPace)
        : null
  const bikeSplitSec =
    selectedSplit != null
      ? minutesToSliderSec(selectedSplit.bikeMin)
      : bikeSpeed != null
        ? minutesToSliderSec((activePreset.bikeKm / bikeSpeed) * 60)
        : null
  const runSplitSec =
    selectedSplit != null
      ? minutesToSliderSec(selectedSplit.runMin)
      : runPace != null
        ? minutesToSliderSec(activePreset.runKm * runPace)
        : null
  const t1SplitSec = minutesToSliderSec(t1Min)
  const t2SplitSec = minutesToSliderSec(t2Min)

  /** Split time slider bounds from race distance × pace/speed range. */
  const swimSplitMinSec = Math.round(activePreset.swimKm * 10 * SWIM_SLIDER_MIN_SEC)
  const swimSplitMaxSec = Math.round(activePreset.swimKm * 10 * SWIM_SLIDER_MAX_SEC)
  const bikeSplitMinSec = Math.round((activePreset.bikeKm / BIKE_SLIDER_MAX) * 3600)
  const bikeSplitMaxSec = Math.round((activePreset.bikeKm / BIKE_SLIDER_MIN) * 3600)
  const runSplitMinSec = Math.round(activePreset.runKm * RUN_SLIDER_MIN_SEC)
  const runSplitMaxSec = Math.round(activePreset.runKm * RUN_SLIDER_MAX_SEC)

  function patch(partial: Partial<TriathlonCalculatorState>) {
    onChange({ ...state, ...partial, direction: 'pace-to-time' })
  }

  function handleSwimSlider(sec: number) {
    setEditingSplit(null)
    setSplitDraft('')
    patch({ swimPacePer100m: formatSwimPaceMinPer100m(sec / 60) })
  }

  function handleBikeSlider(kmh: number) {
    setEditingSplit(null)
    setSplitDraft('')
    patch({ bikeSpeedKmh: formatBikeSpeed(kmh) })
  }

  function handleRunSlider(sec: number) {
    setEditingSplit(null)
    setSplitDraft('')
    patch({ runPace: formatPaceMinPerKm(sec / 60) })
  }

  function handleRacePreset(id: string) {
    const preset = TRIATHLON_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setEditingSplit(null)
    setSplitDraft('')
    patch({
      reversePreset: preset.id as TriathlonPresetId,
      customSwimKm: formatDistanceKm(preset.swimKm),
      customBikeKm: formatDistanceKm(preset.bikeKm),
      customRunKm: formatDistanceKm(preset.runKm),
    })
  }

  function applySplitTime(id: SplitId, raw: string) {
    if (id === 't1') {
      patch({ t1: raw })
      return
    }
    if (id === 't2') {
      patch({ t2: raw })
      return
    }

    const minutes = parseRaceTimeToMinutes(raw)
    if (minutes == null) return

    if (id === 'swim') {
      const next = swimPaceFromLegTime(activePreset.swimKm, minutes)
      // Precise pace so 1s split steps survive round-trip (whole-second pace is too coarse).
      if (next != null) patch({ swimPacePer100m: formatPaceMinPerKmPrecise(next) })
      return
    }
    if (id === 'bike') {
      const next = bikeSpeedFromLegTime(activePreset.bikeKm, minutes)
      if (next != null) patch({ bikeSpeedKmh: formatBikeSpeedPrecise(next) })
      return
    }
    if (id === 'run') {
      const next = runPaceFromLegTime(activePreset.runKm, minutes)
      if (next != null) patch({ runPace: formatPaceMinPerKmPrecise(next) })
    }
  }

  function handleSplitFocus(id: SplitId) {
    setEditingSplit(id)
    setSplitDraft(derivedSplits[id])
  }

  function handleSplitChange(id: SplitId, value: string) {
    setEditingSplit(id)
    setSplitDraft(value)
    applySplitTime(id, value)
  }

  function handleSplitBlur(id: SplitId) {
    if (editingSplit !== id) return
    applySplitTime(id, splitDraft)
    setEditingSplit(null)
    setSplitDraft('')
  }

  function handleSplitSlider(id: SplitId, totalSeconds: number) {
    setEditingSplit(null)
    setSplitDraft('')
    applySplitTime(id, formatRaceTime(totalSeconds / 60))
  }

  const splitInvalid =
    editingSplit != null &&
    splitDraft.trim() !== '' &&
    editingSplit !== 't1' &&
    editingSplit !== 't2' &&
    parseRaceTimeToMinutes(splitDraft) == null

  const splitFields: Array<{
    id: SplitId
    label: string
    icon: ReactNode
    placeholder: string
    sliderValue: number | null
    sliderMin: number
    sliderMax: number
    sliderStep: number
  }> = [
    {
      id: 'swim',
      label: 'Swim',
      icon: <Waves className="h-3.5 w-3.5 text-cyan-500" aria-hidden />,
      placeholder: '25:00',
      sliderValue: swimSplitSec,
      sliderMin: swimSplitMinSec,
      sliderMax: swimSplitMaxSec,
      sliderStep: 1,
    },
    {
      id: 't1',
      label: 'T1',
      icon: null,
      placeholder: '3:00',
      sliderValue: t1SplitSec,
      sliderMin: TRANSITION_SLIDER_MIN_SEC,
      sliderMax: TRANSITION_SLIDER_MAX_SEC,
      sliderStep: TRANSITION_SLIDER_STEP_SEC,
    },
    {
      id: 'bike',
      label: 'Bike',
      icon: <Bike className="h-3.5 w-3.5 text-sky-500" aria-hidden />,
      placeholder: '1:10:00',
      sliderValue: bikeSplitSec,
      sliderMin: bikeSplitMinSec,
      sliderMax: bikeSplitMaxSec,
      sliderStep: 5,
    },
    {
      id: 't2',
      label: 'T2',
      icon: null,
      placeholder: '2:00',
      sliderValue: t2SplitSec,
      sliderMin: TRANSITION_SLIDER_MIN_SEC,
      sliderMax: TRANSITION_SLIDER_MAX_SEC,
      sliderStep: TRANSITION_SLIDER_STEP_SEC,
    },
    {
      id: 'run',
      label: 'Run',
      icon: <Footprints className="h-3.5 w-3.5 text-orange-500" aria-hidden />,
      placeholder: '42:00',
      sliderValue: runSplitSec,
      sliderMin: runSplitMinSec,
      sliderMax: runSplitMaxSec,
      sliderStep: 1,
    },
  ]

  return (
    <div className="space-y-4">
      <CalculatorHeroCard>
        <div className="-mx-5 -mt-5 space-y-4">
          <div className="border-b border-border/40 px-5 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1px_1fr] sm:gap-0">
              <CalculatorHeroField
                label="Distance"
                align="center"
                labelAddon={
                  <LabelPresetSelect
                    options={RACE_PRESET_OPTIONS}
                    activeId={activeRaceId}
                    onSelect={handleRacePreset}
                    aria-label="Choose race distance"
                  />
                }
                secondary={
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatRaceDistances(activePreset)}
                  </p>
                }
              >
                <p className={HERO_INPUT_CLASS}>{activePreset.label}</p>
              </CalculatorHeroField>

              <div className="hidden bg-border sm:block sm:w-px" aria-hidden />

              <CalculatorHeroField label="Finish time" align="center">
                <p className={HERO_INPUT_CLASS}>
                  {selectedSplit != null ? formatRaceTime(selectedSplit.totalMin) : '—'}
                </p>
              </CalculatorHeroField>
            </div>
          </div>

          <div className="space-y-3 px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pace
            </p>
            <CalculatorHeroColumns
              columns={[
                {
                  content: (
                    <CalculatorHeroField label="Swim" unit="/100m" align="center">
                      <Input
                        value={state.swimPacePer100m}
                        onChange={(e) => {
                          setEditingSplit(null)
                          setSplitDraft('')
                          patch({ swimPacePer100m: e.target.value })
                        }}
                        placeholder="2:00"
                        variant="ghost"
                        className={HERO_INPUT_CLASS}
                        aria-label="Swim pace in minutes per 100 metres"
                      />
                    </CalculatorHeroField>
                  ),
                  control: (
                    <CalculatorValueSlider
                      value={swimSliderSec}
                      min={SWIM_SLIDER_MIN_SEC}
                      max={SWIM_SLIDER_MAX_SEC}
                      step={SWIM_SLIDER_STEP_SEC}
                      onChange={handleSwimSlider}
                      aria-label="Adjust swim pace"
                    />
                  ),
                },
                {
                  content: (
                    <CalculatorHeroField label="Bike" unit="km/h" align="center">
                      <Input
                        value={state.bikeSpeedKmh}
                        onChange={(e) => {
                          setEditingSplit(null)
                          setSplitDraft('')
                          patch({ bikeSpeedKmh: e.target.value })
                        }}
                        placeholder="32"
                        inputMode="decimal"
                        variant="ghost"
                        className={HERO_INPUT_CLASS}
                        aria-label="Bike speed in kilometres per hour"
                      />
                    </CalculatorHeroField>
                  ),
                  control: (
                    <CalculatorValueSlider
                      value={bikeSpeed}
                      min={BIKE_SLIDER_MIN}
                      max={BIKE_SLIDER_MAX}
                      step={BIKE_SLIDER_STEP}
                      onChange={handleBikeSlider}
                      aria-label="Adjust bike speed"
                    />
                  ),
                },
                {
                  content: (
                    <CalculatorHeroField label="Run" unit="/km" align="center">
                      <Input
                        value={state.runPace}
                        onChange={(e) => {
                          setEditingSplit(null)
                          setSplitDraft('')
                          patch({ runPace: e.target.value })
                        }}
                        placeholder="5:30"
                        variant="ghost"
                        className={HERO_INPUT_CLASS}
                        aria-label="Run pace in minutes per kilometre"
                      />
                    </CalculatorHeroField>
                  ),
                  control: (
                    <CalculatorValueSlider
                      value={runSliderSec}
                      min={RUN_SLIDER_MIN_SEC}
                      max={RUN_SLIDER_MAX_SEC}
                      step={RUN_SLIDER_STEP_SEC}
                      onChange={handleRunSlider}
                      aria-label="Adjust run pace"
                    />
                  ),
                },
              ]}
            />
          </div>

          <div className="space-y-3 border-t border-border/40 px-5 pb-1 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Split times
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-0 sm:divide-x sm:divide-border">
              {splitFields.map(
                (
                  { id, label, icon, placeholder, sliderValue, sliderMin, sliderMax, sliderStep },
                  index,
                ) => {
                  const display = editingSplit === id ? splitDraft : derivedSplits[id]
                  return (
                    <div
                      key={id}
                      className={cn(
                        'min-w-0 space-y-1 text-center',
                        index === 0 && 'sm:pr-3',
                        index > 0 && index < splitFields.length - 1 && 'sm:px-3',
                        index === splitFields.length - 1 && 'sm:pl-3',
                      )}
                    >
                      <p className="inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {icon}
                        {label}
                      </p>
                      <Input
                        value={display}
                        onChange={(e) => handleSplitChange(id, e.target.value)}
                        onFocus={() => handleSplitFocus(id)}
                        onBlur={() => handleSplitBlur(id)}
                        placeholder={placeholder}
                        inputMode="numeric"
                        variant="ghost"
                        className={SPLIT_INPUT_CLASS}
                        aria-label={`${label} split time`}
                      />
                      <CalculatorValueSlider
                        value={sliderValue}
                        min={sliderMin}
                        max={sliderMax}
                        step={sliderStep}
                        onChange={(sec) => handleSplitSlider(id, sec)}
                        aria-label={`Adjust ${label} split time`}
                        className="mt-2"
                      />
                    </div>
                  )
                },
              )}
            </div>
            <TimeParseError show={splitInvalid} />
          </div>

          {selectedSplit != null ? (
            <section className="space-y-3 border-t border-border/40 px-5 pb-1 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Time share
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  style={{ backgroundColor: '#18B7C9', width: `${share(selectedSplit.swimMin)}%` }}
                  className="h-full"
                  title="Swim"
                />
                <div
                  style={{ backgroundColor: '#6B7280', width: `${share(selectedSplit.t1Min)}%` }}
                  className="h-full"
                  title="T1"
                />
                <div
                  style={{ backgroundColor: '#F5A623', width: `${share(selectedSplit.bikeMin)}%` }}
                  className="h-full"
                  title="Bike"
                />
                <div
                  style={{ backgroundColor: '#6B7280', width: `${share(selectedSplit.t2Min)}%` }}
                  className="h-full"
                  title="T2"
                />
                <div
                  style={{ backgroundColor: '#E84855', width: `${share(selectedSplit.runMin)}%` }}
                  className="h-full"
                  title="Run"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                {[
                  { label: 'Swim', value: selectedSplit.swimMin, color: '#18B7C9' },
                  { label: 'T1', value: selectedSplit.t1Min, color: '#6B7280' },
                  { label: 'Bike', value: selectedSplit.bikeMin, color: '#F5A623' },
                  { label: 'T2', value: selectedSplit.t2Min, color: '#6B7280' },
                  { label: 'Run', value: selectedSplit.runMin, color: '#E84855' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[6px] border border-border/50 px-2.5 py-2"
                  >
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                      {formatRaceTime(item.value)}
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({share(item.value)}%)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </CalculatorHeroCard>

      <CalculatorPredictionGrid title="Race finish times" items={predictionItems} />
    </div>
  )
}
